import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../utils/i18n';

interface ModelPreviewProps {
  modelPath?: string;
  fallback?: string;
  alt: string;
  scale?: number;
  className?: string;
  enabled?: boolean;
  artSet?: 'sd' | 'hd' | 'de';
  teamColor?: number;
  transparent?: boolean;
  viewDistance?: number;
  paused?: boolean;
}
function decode(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
function previewError(error: unknown, t: (key: string, fallback?: string) => string) {
  const detail = error instanceof Error ? error.message : String(error);
  if (/no handler registered|readModelResource is not a function/i.test(detail))
    return t('skin.panel.model.notReady', '模型预览服务未就绪，请完全退出并重新启动客户端');
  if (/chunkloaderror|loading chunk/i.test(detail))
    return t('skin.panel.model.chunk', '模型渲染模块未加载，请重新启动客户端');
  return t('skin.panel.model.loadFailed', '模型加载失败：{{detail}}').replace(/\{\{detail\}\}/g, detail);
}

export const ModelPreview: React.FC<ModelPreviewProps> = ({ modelPath, fallback, alt, scale = 1, className, enabled = true, artSet = 'hd', teamColor = 8, transparent = false, viewDistance = 1, paused = false }) => {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const suspended = useRef(paused);
  const [state, setState] = useState('');
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const showState = (text: string) => { setState(text); setIsLoadingModel(false); };
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [placeholder, setPlaceholder] = useState<'model' | 'logo' | 'none'>('model');
  const mode = artSet;
  useEffect(() => { suspended.current = paused; }, [paused]);
  useEffect(() => {
    const abort = new AbortController();
    let frame = 0, preview: Awaited<ReturnType<typeof import('../../model-preview/create-preview').createPreview>>;
    const canvas = document.createElement('canvas');
    const bounds = host.current?.getBoundingClientRect();
    // A large high-DPI WebGL canvas is expensive to redraw continuously.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(480, Math.round((bounds?.width || 480) * pixelRatio));
    canvas.height = Math.max(320, Math.round((bounds?.height || 320) * pixelRatio));
    canvas.setAttribute('aria-label', alt);
    Object.assign(canvas.style, { width: '100%', height: '100%', position: 'absolute', inset: '0', opacity: '0', cursor: 'grab' });
    host.current?.appendChild(canvas);
    setReady(false); setState(''); setIsLoadingModel(true);
    const read = async (path: string, basePath?: string) => {
      const resource = await window.electronAPI.readModelResource(path, basePath, mode);
      return { bytes: decode(resource.data), resolvedPath: resource.resolvedPath };
    };
    let visible = true;
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    observer.observe(canvas);
    let lastX: number | undefined, dragged = false;
    canvas.onpointerdown = event => { lastX = event.clientX; dragged = false; canvas.setPointerCapture(event.pointerId); };
    canvas.onclick = event => { if (dragged) event.stopPropagation(); };
    canvas.onpointermove = event => { if (lastX !== undefined) { if (Math.abs(event.clientX - lastX) > 2) dragged = true; preview?.orbit((event.clientX - lastX) * 0.01); lastX = event.clientX; } };
    canvas.onpointerup = () => { lastX = undefined; };
    canvas.onpointercancel = () => { lastX = undefined; };
    (async () => {
      if (!enabled) { showState(t('skin.panel.model.unavailableSkin', '当前皮肤的模型预览暂不可用')); return; }
      if (!modelPath) { showState(t('skin.panel.model.noPath', '未找到这个单位的模型路径')); return; }
      try {
        if (typeof window.electronAPI?.readModelResource !== 'function')
          throw new Error('readModelResource is not a function');
        // Cycling through skins quickly should not start a CASC read for every
        // intermediate selection. The cleanup aborts these short pending loads.
        await new Promise(resolve => window.setTimeout(resolve, 90));
        if (abort.signal.aborted) return;
        const { createPreview } = await import('../../model-preview/create-preview');
        const source = await read(modelPath);
        if (abort.signal.aborted) return;
        preview = await createPreview(canvas, source, read, { scale, signal: abort.signal, teamColor, transparent, viewDistance });
        if (abort.signal.aborted) { preview.dispose(); return; }
        canvas.style.opacity = '1'; setReady(true);
        showState(preview.missing.length ? t('skin.panel.model.missing', '缺少 {{count}} 项资源').replace(/\{\{count\}\}/g, String(preview.missing.length)) : Object.values(preview.omitted).some(Boolean) ? t('skin.panel.model.liveSimplified', '实时模型 · 简化特效/面部') : t('skin.panel.model.live', '实时模型'));
        let previous = performance.now();
        const step = (now: number) => {
          if (abort.signal.aborted) return;
          try {
            if (!visible || document.hidden || suspended.current) previous = now;
            else if (now - previous >= 1000 / 30) {
              preview.draw(Math.min(50, now - previous));
              previous = now;
            }
          }
          catch (error) { console.warn('[ModelPreview]', error); setReady(false); showState(t('skin.panel.model.renderFailed', '模型渲染失败：{{detail}}').replace(/\{\{detail\}\}/g, error instanceof Error ? error.message : String(error))); canvas.style.opacity = '0'; preview.dispose(); return; }
          frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      } catch (error) {
        if (!abort.signal.aborted) { console.warn('[ModelPreview]', error); showState(previewError(error, t)); }
      }
    })();
    return () => { abort.abort(); cancelAnimationFrame(frame); observer.disconnect(); preview?.dispose(); canvas.remove(); };
  }, [enabled, modelPath, mode, scale, alt, teamColor, transparent, viewDistance, retry]);
  return <div className={className} style={{ position: 'relative', width: '100%', height: '100%', background: transparent ? 'transparent' : '#090a0d', overflow: 'hidden' }}>
    {!transparent && fallback && <img src={fallback} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: ready ? 0 : 1 }} />}
    <div ref={host} style={{ position: 'absolute', inset: 0 }} />
    {transparent && !ready && <div role="status" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, textAlign: 'center', color: '#dbd2bd', pointerEvents: 'none' }}>
      {placeholder !== 'none' && <img src={placeholder === 'model' ? './assets/quenching/model-preview-3d.svg' : './assets/quenching/logo.png'} alt="" onError={() => setPlaceholder(value => value === 'model' ? 'logo' : 'none')}
        style={{ width: 126, height: 126, objectFit: 'contain', opacity: .86, filter: 'drop-shadow(0 4px 20px rgba(0,0,0,.6))' }} />}
      <strong style={{ fontSize: 18, fontWeight: 400, textShadow: '0 2px 8px #000' }}>{isLoadingModel ? t('skin.panel.model.loading', '正在加载模型…') : t('skin.panel.model.failedTitle', '加载失败')}</strong>
      {!isLoadingModel && <>
        <span style={{ lineHeight: 1.5, textShadow: '0 2px 8px #000' }}>{t('skin.panel.model.checkHint', '请检查魔兽目录或模型')}</span>
        <small style={{ maxWidth: 390, color: '#a9a396', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{state}</small>
      </>}
      {enabled && modelPath && !isLoadingModel && <button type="button" onClick={() => setRetry(value => value + 1)} style={{ pointerEvents: 'auto', padding: '5px 14px', border: '1px solid #d4af37', background: 'rgba(0,0,0,.5)', color: '#e6c45b', cursor: 'pointer' }}>{t('skin.panel.model.retry', '重试加载')}</button>}
    </div>}
    {!transparent && enabled && modelPath && <span style={{ position: 'absolute', top: 4, right: 4, color: '#ddd', fontSize: 11 }}>{artSet.toUpperCase()}</span>}
    {!transparent && <span title={state} style={{ position: 'absolute', bottom: 3, left: 4, fontSize: 10, color: '#bbb', pointerEvents: 'none' }}>{state}</span>}
  </div>;
};
