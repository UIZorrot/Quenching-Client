export interface PreviewStatus {
  key: string;
  fallback: string;
  params?: Record<string, string>;
}

export type Translate = (key: string, fallback?: string) => string;

// Status is kept as key + params so it can be translated at render time and follows language changes.
export function resolvePreviewStatus(status: PreviewStatus | null, t: Translate): string {
  if (!status) return '';
  let text = t(status.key, status.fallback);
  for (const [name, value] of Object.entries(status.params ?? {})) text = text.split(`{{${name}}}`).join(value);
  return text;
}

export function describePreviewError(error: unknown): PreviewStatus {
  const detail = error instanceof Error ? error.message : String(error);
  if (/no handler registered|readModelResource is not a function/i.test(detail))
    return { key: 'skin.panel.model.notReady', fallback: '模型预览服务未就绪，请完全退出并重新启动客户端' };
  if (/chunkloaderror|loading chunk/i.test(detail))
    return { key: 'skin.panel.model.chunk', fallback: '模型渲染模块未加载，请重新启动客户端' };
  return { key: 'skin.panel.model.loadFailed', fallback: '模型加载失败：{{detail}}', params: { detail } };
}
