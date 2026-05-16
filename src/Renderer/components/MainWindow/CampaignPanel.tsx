import React, { useCallback, useEffect, useState } from 'react';
import { Button, Space, message } from 'antd';
import { ArrowLeftOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useTranslation } from '../../utils/i18n';
import { useSound } from '../../hooks/useSound';
import { useGlobalLoading } from '../GlobalLoadingProvider';

export interface InstalledCampaign {
  id: string;
  path: string;
  mapCount: number;
  title?: string;
  difficulty?: string;
  author?: string;
  description?: string;
  maps?: CampaignMapMetadata[];
}

interface CampaignMapMetadata {
  path: string;
  chapter?: string;
  title?: string;
}

interface CampaignExtractProgress {
  phase: 'prepare' | 'readList' | 'extractArchive' | 'discoverMaps' | 'mergeMap' | 'cleanup' | 'complete';
  percent: number;
  current?: string;
  index?: number;
  total?: number;
}

function joinFs(base: string, ...parts: string[]): string {
  let r = base.replace(/[/\\]+$/, '');
  const sep = r.includes('\\') ? '\\' : '/';
  for (const p of parts) {
    r += sep + p.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
  }
  return r;
}

function displayMapName(fileName: string): string {
  const lower = fileName.toLowerCase();
  const ext = lower.endsWith('.w3m') ? '.w3m' : '.w3x';
  const base = fileName.slice(0, -ext.length);
  return base.replace(/_merged$/i, '');
}

function displayCampaignTitle(campaign: InstalledCampaign): string {
  return campaign.title || campaign.id;
}

function getMapMetadata(campaign: InstalledCampaign, mapPath: string): CampaignMapMetadata | undefined {
  const fileName = (mapPath.split(/[/\\]/).pop() || mapPath).replace(/_merged(?=\.(w3x|w3m)$)/i, '').toLowerCase();
  return campaign.maps?.find((item) => (item.path.split(/[/\\]/).pop() || item.path).toLowerCase() === fileName);
}

function displayCampaignMapName(campaign: InstalledCampaign, mapPath: string): string {
  const meta = getMapMetadata(campaign, mapPath);
  const name = meta?.title || displayMapName(mapPath.split(/[/\\]/).pop() || mapPath);
  return meta?.chapter ? `${meta.chapter} - ${name}` : name;
}

export const CampaignPanel: React.FC<{
  war3RootPath: string | undefined;
  onOpenSettings?: () => void;
  /** ??? OverlayModal ??????????????????????????? */
  embedded?: boolean;
}> = ({ war3RootPath, onOpenSettings, embedded }) => {
  const { t } = useTranslation();
  const { playSmall, playHover } = useSound();
  const { showLoading, hideLoading, updateLoading } = useGlobalLoading();

  const [resolvedWar3Path, setResolvedWar3Path] = useState<string | undefined>(war3RootPath);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (war3RootPath) {
        setResolvedWar3Path(war3RootPath);
        return;
      }
      const p = await window.electronAPI?.getConfig?.('war3Path');
      if (!cancelled) setResolvedWar3Path(typeof p === 'string' && p ? p : undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [war3RootPath]);

  const [campaigns, setCampaigns] = useState<InstalledCampaign[]>([]);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeCampaign, setActiveCampaign] = useState<InstalledCampaign | null>(null);
  const [maps, setMaps] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string>('');
  const [difficulty, setDifficulty] = useState(0);

  const formatExtractProgress = useCallback((progress: CampaignExtractProgress) => {
    const current = progress.current ? progress.current.split(/[/\\]/).pop() : '';
    switch (progress.phase) {
      case 'prepare':
        return t('settings.campaign.extractW3n.progress.prepare', 'Preparing campaign extraction...');
      case 'readList':
        return t('settings.campaign.extractW3n.progress.readList', 'Reading campaign file list...');
      case 'extractArchive':
        return t('settings.campaign.extractW3n.progress.extractArchive', 'Extracting campaign files...') + (current ? ` ${current}` : '');
      case 'discoverMaps':
        return t('settings.campaign.extractW3n.progress.discoverMaps', 'Finding playable maps...');
      case 'mergeMap': {
        const base = t('settings.campaign.extractW3n.progress.mergeMap', 'Merging campaign map {{index}}/{{total}}...')
          .replace(/\{\{index\}\}/g, String(progress.index || 0))
          .replace(/\{\{total\}\}/g, String(progress.total || 0));
        return current ? `${base} ${current}` : base;
      }
      case 'cleanup':
        return t('settings.campaign.extractW3n.progress.cleanup', 'Cleaning temporary files...');
      case 'complete':
        return t('settings.campaign.extractW3n.progress.complete', 'Campaign extraction complete.');
      default:
        return t('settings.campaign.extractW3n.extracting');
    }
  }, [t]);

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const progress = (event as CustomEvent<CampaignExtractProgress>).detail;
      if (!progress) return;
      updateLoading(formatExtractProgress(progress), progress.percent);
    };

    window.addEventListener('campaign-extract-progress', handleProgress);
    return () => window.removeEventListener('campaign-extract-progress', handleProgress);
  }, [formatExtractProgress, updateLoading]);

  const refreshList = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.listInstalledCampaigns) {
      setCampaigns([]);
      return;
    }
    const res = await api.listInstalledCampaigns();
    setCampaigns(res?.campaigns || []);
  }, []);

  useEffect(() => {
    void refreshList();
  }, [resolvedWar3Path, refreshList]);

  const openCampaign = async (c: InstalledCampaign) => {
    playSmall();
    setActiveCampaign(c);
    setView('detail');
    setSelectedMap('');
    setDifficulty(0);
    const merged = joinFs(c.path, '_merged');
    const api = window.electronAPI;
    if (!api?.readDirectory) return;
    try {
      const items = await api.readDirectory(merged);
      const paths = items
        .filter((it) => it.isFile && (/\.w3x$/i.test(it.name) || /\.w3m$/i.test(it.name)))
        .map((it) => it.path)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      setMaps(paths);
      if (paths.length > 0) {
        setSelectedMap(paths[0]);
      }
    } catch (e: any) {
      message.error(e?.message || 'read maps failed');
      setMaps([]);
    }
  };

  const backToList = () => {
    playSmall();
    setView('list');
    setActiveCampaign(null);
    setMaps([]);
    setSelectedMap('');
    void refreshList();
  };

  const importW3n = async () => {
    playSmall();
    if (!resolvedWar3Path) {
      message.warning(t('campaign.error.noWar3Path'));
      return;
    }
    const picked = await window.electronAPI?.selectFile({
      title: t('settings.campaign.extractW3n.selectW3n'),
      filters: [{ name: 'Warcraft III Campaign', extensions: ['w3n'] }]
    });
    if (!picked) return;
    try {
      showLoading(t('settings.campaign.extractW3n.progress.prepare', 'Preparing campaign extraction...'), 0);
      await window.electronAPI?.extractCampaignW3n(picked);
      message.success(t('settings.campaign.extractW3n.success'));
      await refreshList();
    } catch (e: any) {
      message.error(e?.message || t('campaign.error.extract'));
    } finally {
      hideLoading();
    }
  };

  const launchSelected = async () => {
    if (!selectedMap) return;
    playSmall();
    try {
      showLoading(t('msg.launching'));
      await window.electronAPI?.launchMap(selectedMap, difficulty);
      message.success(t('msg.launch.success'));
    } catch (e: any) {
      message.error(e?.message || 'Launch failed');
    } finally {
      hideLoading();
    }
  };

  const titleStyle: React.CSSProperties = {
    color: '#d4af37',
    fontSize: '20px',
    fontFamily: "'Trajan Pro 3', serif",
    marginBottom: '12px',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
  };

  if (!resolvedWar3Path) {
    return (
      <div style={{ textAlign: 'center', maxWidth: '520px', padding: embedded ? '8px 0' : '24px' }}>
        {!embedded && <div style={titleStyle}>{t('campaign.tab.title')}</div>}
        <div style={{ color: '#888', marginBottom: '16px' }}>{t('campaign.empty.noWar3')}</div>
        {onOpenSettings && (
          <Button type="primary" ghost onClick={() => { playSmall(); onOpenSettings(); }} style={{ borderColor: '#d4af37', color: '#d4af37' }}>
            {t('setup.war3.path')}
          </Button>
        )}
      </div>
    );
  }

  if (view === 'detail' && activeCampaign) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          padding: '8px 12px',
          textAlign: 'left'
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => { playHover(); backToList(); }}
          style={{ color: '#d4af37', marginBottom: '8px', paddingLeft: 0, paddingRight: 8 }}
        >
          {t('campaign.detail.back')}
        </Button>
        <div style={titleStyle}>{displayCampaignTitle(activeCampaign)}</div>
        {(activeCampaign.description || activeCampaign.author) && (
          <div style={{ marginBottom: '16px' }}>
            {activeCampaign.author && (
              <div style={{ color: '#b8a56d', fontSize: '12px', marginBottom: activeCampaign.description ? '6px' : 0 }}>
                {activeCampaign.author}
              </div>
            )}
            {activeCampaign.description && (
              <div style={{ color: '#b8b8b8', fontSize: '13px', lineHeight: 1.55, maxWidth: '640px' }}>
                {activeCampaign.description}
              </div>
            )}
          </div>
        )}
        <div style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
          {t('campaign.detail.pickMap')}
        </div>
        <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: '16px' }}>
          {maps.map((p) => {
            const sel = p === selectedMap;
            return (
              <Button
                key={p}
                block
                type={sel ? 'primary' : 'default'}
                onClick={() => { playSmall(); setSelectedMap(p); }}
                onMouseEnter={() => playHover()}
                style={
                  sel
                    ? { background: 'rgba(212, 175, 55, 0.35)', borderColor: '#d4af37', color: '#fff' }
                    : { borderColor: 'rgba(212, 175, 55, 0.35)', color: '#ccc', background: 'rgba(0,0,0,0.35)' }
                }
              >
                {displayCampaignMapName(activeCampaign, p)}
              </Button>
            );
          })}
        </Space>
        <div style={{ color: '#d4af37', marginBottom: '8px', fontSize: '14px' }}>{t('settings.campaign.launchMap.difficulty')}</div>
        <Space wrap style={{ marginBottom: '20px' }}>
          {[
            { v: 0, label: t('settings.campaign.launchMap.easy') },
            { v: 1, label: t('settings.campaign.launchMap.normal') },
            { v: 2, label: t('settings.campaign.launchMap.hard') }
          ].map(({ v, label }) => (
            <Button
              key={v}
              size="small"
              type={difficulty === v ? 'primary' : 'default'}
              onClick={() => { playSmall(); setDifficulty(v); }}
              onMouseEnter={() => playHover()}
              ghost={difficulty !== v}
              style={{ borderColor: '#d4af37', color: difficulty === v ? '#000' : '#d4af37' }}
            >
              {label}
            </Button>
          ))}
        </Space>
        <div style={{ marginTop: '18px', marginBottom: '10px' }}>
          <Button
            type="primary"
            disabled={!selectedMap}
            onClick={() => void launchSelected()}
            onMouseEnter={() => playHover()}
            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #a67c00 100%)', borderColor: '#d4af37', color: '#000', fontWeight: 'bold', height: 40, padding: '0 28px' }}
          >
            {t('settings.campaign.launchMap.btn')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        padding: '8px 12px',
        textAlign: 'left'
      }}
    >
      {!embedded && <div style={{ ...titleStyle, textAlign: 'center' }}>{t('campaign.tab.title')}</div>}
        <div style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textAlign: embedded ? 'left' : 'center' }}>
        {t('campaign.path.hint').replace(/\{\{dir\}\}/g, joinFs(resolvedWar3Path, '_QMCampaign'))}
      </div>
      <Space style={{ marginBottom: '22px', width: '100%', justifyContent: 'flex-start' }} wrap>
        <Button
          type="primary"
          icon={<FolderOpenOutlined />}
          onClick={() => void importW3n()}
          onMouseEnter={() => playHover()}
          style={{ borderColor: '#d4af37', background: 'linear-gradient(135deg, #d4af37 0%, #a67c00 100%)', color: '#000', fontWeight: 'bold', height: 44, padding: '0 26px', fontSize: 16 }}
        >
          {t('campaign.import.btn')}
        </Button>
        <Button ghost onClick={() => { playSmall(); void refreshList(); }} style={{ borderColor: '#d4af37', color: '#d4af37', height: 44, padding: '0 24px', fontSize: 16 }}>
          {t('campaign.refresh')}
        </Button>
      </Space>

      {campaigns.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '24px' }}>{t('campaign.empty')}</div>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {campaigns.map((c) => (
            <div
              key={c.path}
              onClick={() => void openCampaign(c)}
              onMouseEnter={() => playHover()}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                background: 'linear-gradient(90deg, rgba(0,0,0,0.72), rgba(14,16,16,0.55))',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'stretch',
                minHeight: '96px'
              }}
            >
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ color: '#d4af37', fontSize: '18px', fontWeight: 'bold', fontFamily: "'Trajan Pro 3', serif", lineHeight: 1.2 }}>
                  {displayCampaignTitle(c)}
                </div>
                {(c.author || c.difficulty) && (
                  <div style={{ color: '#a89763', fontSize: '12px', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[c.author, c.difficulty].filter(Boolean).join(' / ')}
                  </div>
                )}
                {c.description && (
                  <div
                    style={{
                      color: '#aaa',
                      fontSize: '12px',
                      lineHeight: 1.45,
                      marginTop: '8px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {c.description}
                  </div>
                )}
                <div style={{ color: '#777', fontSize: '12px', marginTop: '8px' }}>
                  {t('campaign.list.mapsCount').replace(/\{\{count\}\}/g, String(c.mapCount))} / {c.id}
                </div>
              </div>
            </div>
          ))}
        </Space>
      )}
    </div>
  );
};
