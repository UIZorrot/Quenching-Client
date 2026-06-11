import React, { useState } from 'react';
import { Button, Space, message } from 'antd';
import { useTranslation } from '../../utils/i18n';
import { OverlayModal } from './OverlayModal';
import { useSound } from '../../hooks/useSound';
import { useGlobalLoading } from '../GlobalLoadingProvider';
import { CampaignPanel } from './CampaignPanel';

interface CampaignModalProps {
  open: boolean;
  onClose: () => void;
  war3RootPath: string | undefined;
  onRequestOpenSettings: () => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  open,
  onClose,
  war3RootPath,
  onRequestOpenSettings
}) => {
  const { t } = useTranslation();
  const { playSmall, playHover } = useSound();
  const { showLoading, hideLoading } = useGlobalLoading();

  const [quickMapPath, setQuickMapPath] = useState('');
  const [quickDifficulty, setQuickDifficulty] = useState(0);
  const [activeTab, setActiveTab] = useState<'map' | 'campaign'>('map');

  const categories = [
    { id: 'map', name: t('campaign.tab.map', 'Map') },
    { id: 'campaign', name: t('campaign.tab.campaign', 'Campaign') }
  ] as const;

  const launchQuickMap = async () => {
    if (!quickMapPath) return;
    playSmall();
    try {
      showLoading(t('msg.launching'));
      await window.electronAPI?.launchMap(quickMapPath, quickDifficulty);
      message.success(t('msg.launch.success'));
    } catch (e: any) {
      message.error(e?.message || t('msg.game.start.failed'));
    } finally {
      hideLoading();
    }
  };

  const sectionTitle: React.CSSProperties = {
    color: '#d4af37',
    marginBottom: '10px',
    fontSize: '16px',
    fontFamily: "'Trajan Pro 3', serif"
  };

  const settingBtn = (label: string, selected: boolean, onClick: () => void) => (
    <Button
      size="small"
      disabled={false}
      onClick={(e) => {
        e.currentTarget.blur();
        playSmall();
        onClick();
      }}
      onMouseEnter={() => playHover()}
      style={{
        background: selected ? 'rgba(212, 175, 55, 0.3)' : 'rgba(0,0,0,0.5)',
        border: selected ? '1px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
        color: selected ? '#fff' : '#aaa',
        fontSize: '12px',
        height: '28px',
        minWidth: '80px'
      }}
    >
      {label}
    </Button>
  );

  return (
    <OverlayModal open={open} onClose={onClose} title={t('main.btn.campaign')} width="90%">
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        position: 'relative',
        height: '100%',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '200px',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0',
          zIndex: 1,
          borderRight: '1px solid rgba(212, 175, 55, 0.1)',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                playSmall();
                setActiveTab(cat.id);
              }}
              onMouseEnter={() => playHover()}
              style={{
                padding: '15px 30px',
                cursor: 'pointer',
                background: activeTab === cat.id ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.2), transparent)' : 'transparent',
                borderLeft: activeTab === cat.id ? '4px solid #d4af37' : '4px solid transparent',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{
                color: activeTab === cat.id ? '#d4af37' : '#888',
                fontSize: '18px',
                fontWeight: activeTab === cat.id ? 'bold' : 'normal',
                fontFamily: "'Trajan Pro 3', serif"
              }}>
                {cat.name}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '30px',
          overflowY: 'auto',
          zIndex: 1
        }}>
          {activeTab === 'map' ? (
            <div style={{ maxWidth: '820px' }}>
              <h3 style={sectionTitle}>{t('settings.campaign.launchMap.title')}</h3>
              <div style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>
                {t('settings.campaign.launchMap.desc')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    borderRadius: '4px',
                    color: '#aaa',
                    fontSize: '13px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {quickMapPath || t('settings.campaign.launchMap.selectMap')}
                </div>
                <Button
                  type="primary"
                  ghost
                  size="small"
                  onClick={async () => {
                    playSmall();
                    const picked = await window.electronAPI?.selectFile({
                      title: t('settings.campaign.launchMap.selectMap'),
                      filters: [{ name: 'Warcraft III Map', extensions: ['w3x', 'w3m'] }]
                    });
                    if (picked) setQuickMapPath(picked);
                  }}
                  onMouseEnter={() => playHover()}
                  style={{ borderColor: '#d4af37', color: '#d4af37' }}
                >
                  {t('setup.btn.change')}
                </Button>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#d4af37', marginBottom: '8px', fontSize: '14px' }}>
                  {t('settings.campaign.launchMap.difficulty')}
                </div>
                <Space wrap>
                  {settingBtn(t('settings.campaign.launchMap.easy'), quickDifficulty === 0, () => setQuickDifficulty(0))}
                  {settingBtn(t('settings.campaign.launchMap.normal'), quickDifficulty === 1, () => setQuickDifficulty(1))}
                  {settingBtn(t('settings.campaign.launchMap.hard'), quickDifficulty === 2, () => setQuickDifficulty(2))}
                </Space>
              </div>
              <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                <Button
                  type="primary"
                  disabled={!quickMapPath}
                  onClick={() => void launchQuickMap()}
                  onMouseEnter={() => playHover()}
                  style={{
                    background: quickMapPath ? 'linear-gradient(135deg, #d4af37 0%, #a67c00 100%)' : 'rgba(212, 175, 55, 0.15)',
                    borderColor: '#d4af37',
                    color: quickMapPath ? '#000' : '#888',
                    fontWeight: 'bold',
                    height: '40px',
                    padding: '0 28px'
                  }}
                >
                  {t('settings.campaign.launchMap.btn')}
                </Button>
              </div>
            </div>
          ) : (
            <CampaignPanel
              embedded
              war3RootPath={war3RootPath}
              onOpenSettings={onRequestOpenSettings}
            />
          )}
        </div>
      </div>
    </OverlayModal>
  );
};
