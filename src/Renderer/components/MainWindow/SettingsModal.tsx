import React, { useState, useMemo, useEffect } from 'react';
import { Typography, Button, Space, Row, Col, message, Spin, Modal } from 'antd';
import { useTranslation } from '../../utils/i18n';
import { OverlayModal } from './OverlayModal';
import { useWar3Settings } from '../../hooks/useWar3Settings';
import { useWar3Detector } from '../../hooks/useWar3Detector';
import { useSound } from '../../hooks/useSound';
import { useGlobalLoading } from '../GlobalLoadingProvider';

const { Text } = Typography;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  isFullPackageInstalled?: boolean;
  onModDeleted?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, isFullPackageInstalled = false, onModDeleted }) => {
  const { t } = useTranslation();
  const { modSettings, settings: war3Settings, saveModSettings, loadModSettings, toggleGameMode, isLoading } = useWar3Settings();
  const { currentInstallation, detectInstallations } = useWar3Detector();
  const { playSmall, playHover } = useSound();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [selectedCategory, setSelectedCategory] = useState<'graphics' | 'game' | 'basic'>('graphics');
  const [previewInfo, setPreviewInfo] = useState<{ title: string; desc: string; image: string | null }>({
    title: '',
    desc: t('settings.preview.default'),
    image: null
  });

  const isClassicMode = modSettings?.classicMode || false;

  const categories = [
    { id: 'game', name: t('settings.category.game') },
    { id: 'graphics', name: t('settings.category.graphics') },
    { id: 'basic', name: t('settings.basic.title') }
  ];

  const handleResetRendering = async () => {
    if (!currentInstallation?.path) return;
    try {
      showLoading(t('progress.hint'));
      await window.electronAPI?.resetRenderingComponents(currentInstallation.path);
      message.success(t('settings.basic.resetRendering.success'));
    } catch (e: any) {
      message.error(e.message || 'Error');
    } finally {
      hideLoading();
    }
  };

  const handleDeleteMod = async () => {
    if (!currentInstallation?.path) return;
    try {
      showLoading(t('progress.hint'));
      await window.electronAPI?.deleteMod(currentInstallation.path);
      message.success(t('settings.basic.deleteMod.success'));
      detectInstallations();
      onModDeleted?.();
    } catch (e: any) {
      message.error(e.message || 'Error');
    } finally {
      hideLoading();
    }
  };

  const handleToggleClassicMode = async () => {
    if (!currentInstallation?.path) return;
    const newMode = !isClassicMode;
    try {
      showLoading(t(newMode ? 'msg.classicMode.switching' : 'msg.classicMode.restoring'));
      await window.electronAPI?.toggleClassicMode(currentInstallation.path, newMode);
      message.success(t(newMode ? 'msg.classicMode.switched' : 'msg.classicMode.restored'));
      detectInstallations();
      // 强制刷新设置状态
      await loadModSettings(currentInstallation.path);
    } catch (e: any) {
      message.error(e.message || 'Error');
    } finally {
      hideLoading();
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    console.log('[SettingsModal] handleSettingChange called:', key, value);
    if (!currentInstallation?.path) {
      console.warn('[SettingsModal] No War3 installation path found!');
      message.error(t('install.not_found'));
      return;
    }

    try {
      showLoading(t('msg.settings.updating'));
      console.log('[SettingsModal] Saving settings to:', currentInstallation.path);
      if (key === 'gameVersion') {
        // gameVersion 对应 War3Preferences.txt 中的 hd 字段
        await toggleGameMode(currentInstallation.path, value === 'reforged');
      } else {
        await saveModSettings(currentInstallation.path, { [key]: value });
      }
      message.success(t('msg.settings.updated'));
    } catch (error) {
      console.error('Failed to update setting:', error);
      const msg = error instanceof Error ? error.message : t('msg.mod.failed');
      message.error(msg);
    } finally {
      hideLoading();
    }
  };

  const handleSelectVisionModPath = async () => {
    playSmall();
    const path = await window.electronAPI?.selectDirectory(t('setup.visionmod.path'));
    if (path) {
      // 验证目录
      const valid_1 = await window.electronAPI?.pathExists(`${path}/Install Guide.txt`);
      const valid_2 = await window.electronAPI?.pathExists(`${path}/visionmod.txt.txt`);
      const valid_3 = await window.electronAPI?.pathExists(`${path}/visionmod.txt`);

      if (valid_1 || valid_2 || valid_3) {
        await handleSettingChange('visionModPath', path);
        message.success(t('msg.visionmod.path.set'));
      } else {
        message.error(t('msg.visionmod.path.invalid'));
      }
    }
  };

  const renderVisionModPathSelector = () => (
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
      <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('setup.visionmod.path')}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          flex: 1,
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '4px',
          color: '#aaa',
          fontSize: '13px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {modSettings.visionModPath || t('setup.visionmod.unset')}
        </div>
        <Button
          type="primary"
          ghost
          size="small"
          onClick={handleSelectVisionModPath}
          onMouseEnter={() => playHover()}
          style={{ borderColor: '#d4af37', color: '#d4af37' }}
        >
          {t('setup.btn.change')}
        </Button>
      </div>
    </div>
  );

  const renderSettingButton = (label: string, currentValue: any, targetValue: any, onClick: () => void, onMouseEnter?: () => void, disabled?: boolean) => {
    const isSelected = currentValue === targetValue;
    const isDisabled = isLoading || disabled;

    // 默认预览信息
    const defaultPreview = {
      title: '',
      desc: t('settings.preview.default'),
      image: null
    };

    return (
      <Button
        disabled={isDisabled}
        onClick={(e) => {
          e.currentTarget.blur();
          playSmall();
          onClick();
        }}
        onMouseEnter={() => {
          playHover();
          onMouseEnter?.();
        }}
        onMouseLeave={() => {
          setPreviewInfo(defaultPreview);
        }}
        style={{
          background: isSelected ? 'rgba(212, 175, 55, 0.3)' : 'rgba(0,0,0,0.5)',
          border: isSelected ? '1px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
          color: isSelected ? '#fff' : '#aaa',
          fontSize: '12px',
          height: '28px',
          transition: 'all 0.2s',
          minWidth: '80px',
          opacity: isDisabled ? 0.4 : 1
        }}
      >
        {label}
      </Button>
    );
  };

  const getSettingStatus = (key: string) => {
    // 1. Full Package Check (Highest Priority)
    const requiresFullPackage = ['water', 'glow', 'terrain', 'tree'];
    if (requiresFullPackage.includes(key) && !isFullPackageInstalled) {
      return { disabled: true, reason: t('main.status.full_not_installed') };
    }

    // 2. Classic Mode Check
    const restrictedInClassic = ['foliage', 'objectShader', 'postProcessing', 'half', 'modelEnhance', 'water', 'lighting', 'glow'];
    if (restrictedInClassic.includes(key) && isClassicMode) {
      return { disabled: true, reason: t('settings.basic.classicMode.disabled') };
    }

    // 3. VisionMod Check
    const requiresVisionMod = ['half', 'modelEnhance'];
    if (requiresVisionMod.includes(key) && !modSettings.visionModPath) {
      // Not Installed logic
      return { disabled: true, reason: t('settings.status.visionmod_required') };
    }

    return { disabled: false, reason: null };
  };

  const renderStatusPlaceholder = (reason: string | null) => {
    return (
      <div style={{
        color: '#666',
        fontSize: '12px',
        marginTop: '4px',
        minHeight: '20px', // Reserve space for alignment
        lineHeight: '20px'
      }}>
        {reason || ''}
      </div>
    );
  };

  const renderGraphicsSettings = () => {
    // Helper to get status for each item
    const sWater = getSettingStatus('water');
    const sFoliage = getSettingStatus('foliage');
    const sShader = getSettingStatus('objectShader');
    const sPost = getSettingStatus('postProcessing');
    const sGlow = getSettingStatus('glow');
    const sHalf = getSettingStatus('half');
    const sEnv = getSettingStatus('envRender'); // likely none
    const sEnhance = getSettingStatus('modelEnhance');

    return (
      <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
        {renderVisionModPathSelector()}
        <Row gutter={[20, 20]}>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.water.title')}</h3>
            <Space wrap>
              {renderSettingButton(t('settings.water.realistic'), modSettings.water, 'realistic', () => handleSettingChange('water', 'realistic'), () => setPreviewInfo({ title: t('settings.water.title'), desc: t('settings.water.realistic.desc'), image: './assets/quenching/set1.png' }), sWater.disabled)}
              {renderSettingButton(t('settings.water.transparent'), modSettings.water, 'transparent', () => handleSettingChange('water', 'transparent'), () => setPreviewInfo({ title: t('settings.water.title'), desc: t('settings.water.transparent.desc'), image: './assets/quenching/set1.png' }), sWater.disabled)}
            </Space>
            {renderStatusPlaceholder(sWater.reason)}
          </Col>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.foliage.title')}</h3>
            <Space>
              {renderSettingButton(t('settings.btn.turnon'), modSettings.foliage, true, () => handleSettingChange('foliage', true), () => setPreviewInfo({ title: t('settings.foliage.title'), desc: t('settings.foliage.on.desc'), image: './assets/quenching/set4.png' }), sFoliage.disabled)}
              {renderSettingButton(t('settings.btn.turnoff'), modSettings.foliage, false, () => handleSettingChange('foliage', false), () => setPreviewInfo({ title: t('settings.foliage.title'), desc: t('settings.foliage.off.desc'), image: './assets/quenching/set4.png' }), sFoliage.disabled)}
            </Space>
            {renderStatusPlaceholder(sFoliage.reason)}
          </Col>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.shader.title')}</h3>
            <Space>
              {renderSettingButton(t('settings.btn.turnon'), modSettings.objectShader, true, () => handleSettingChange('objectShader', true), () => setPreviewInfo({ title: t('settings.shader.title'), desc: t('settings.shader.on.desc'), image: './assets/quenching/set5.png' }), sShader.disabled)}
              {renderSettingButton(t('settings.btn.turnoff'), modSettings.objectShader, false, () => handleSettingChange('objectShader', false), () => setPreviewInfo({ title: t('settings.shader.title'), desc: t('settings.shader.off.desc'), image: './assets/quenching/set5.png' }), sShader.disabled)}
            </Space>
            {renderStatusPlaceholder(sShader.reason)}
          </Col>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.postprocessing.title')}</h3>
            <Space>
              {renderSettingButton(t('settings.btn.turnon'), modSettings.postProcessing, true, () => handleSettingChange('postProcessing', true), () => setPreviewInfo({ title: t('settings.postprocessing.title'), desc: t('settings.postprocessing.on.desc'), image: './assets/quenching/set9.png' }), sPost.disabled)}
              {renderSettingButton(t('settings.btn.turnoff'), modSettings.postProcessing, false, () => handleSettingChange('postProcessing', false), () => setPreviewInfo({ title: t('settings.postprocessing.title'), desc: t('settings.postprocessing.off.desc'), image: './assets/quenching/set9.png' }), sPost.disabled)}
            </Space>
            {renderStatusPlaceholder(sPost.reason)}
          </Col>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.glow.title')}</h3>
            <Space>
              {renderSettingButton(t('settings.btn.turnon'), modSettings.glow, true, () => handleSettingChange('glow', true), () => setPreviewInfo({ title: t('settings.glow.title'), desc: t('settings.glow.on.desc'), image: './assets/quenching/ui4.png' }), sGlow.disabled)}
              {renderSettingButton(t('settings.btn.turnoff'), modSettings.glow, false, () => handleSettingChange('glow', false), () => setPreviewInfo({ title: t('settings.glow.title'), desc: t('settings.glow.off.desc'), image: './assets/quenching/ui4.png' }), sGlow.disabled)}
            </Space>
            {renderStatusPlaceholder(sGlow.reason)}
          </Col>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.half.title')}</h3>
            <Space>
              {renderSettingButton(t('settings.btn.turnon'), modSettings.half, true, () => handleSettingChange('half', true), () => setPreviewInfo({ title: t('settings.half.title'), desc: t('settings.half.on.desc'), image: './assets/quenching/ui5.png' }), sHalf.disabled)}
              {renderSettingButton(t('settings.btn.turnoff'), modSettings.half, false, () => handleSettingChange('half', false), () => setPreviewInfo({ title: t('settings.half.title'), desc: t('settings.half.off.desc'), image: './assets/quenching/ui5.png' }), sHalf.disabled)}
            </Space>
            {renderStatusPlaceholder(sHalf.reason)}
          </Col>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.envrender.title')}</h3>
            <Space>
              {renderSettingButton(t('settings.btn.turnon'), modSettings.envRender, true, () => handleSettingChange('envRender', true), () => setPreviewInfo({ title: t('settings.envrender.title'), desc: t('settings.envrender.on.desc'), image: './assets/quenching/set8.png' }), sEnv.disabled)}
              {renderSettingButton(t('settings.btn.turnoff'), modSettings.envRender, false, () => handleSettingChange('envRender', false), () => setPreviewInfo({ title: t('settings.envrender.title'), desc: t('settings.envrender.off.desc'), image: './assets/quenching/set8.png' }), sEnv.disabled)}
            </Space>
            {renderStatusPlaceholder(sEnv.reason)}
          </Col>
          <Col span={12}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.modelenhance.title')}</h3>
            <Space>
              {renderSettingButton(t('settings.btn.turnon'), modSettings.modelEnhance, true, () => handleSettingChange('modelEnhance', true), () => setPreviewInfo({ title: t('settings.modelenhance.title'), desc: t('settings.modelenhance.on.desc'), image: './assets/quenching/set7.png' }), sEnhance.disabled)}
              {renderSettingButton(t('settings.btn.turnoff'), modSettings.modelEnhance, false, () => handleSettingChange('modelEnhance', false), () => setPreviewInfo({ title: t('settings.modelenhance.title'), desc: t('settings.modelenhance.off.desc'), image: './assets/quenching/set7.png' }), sEnhance.disabled)}
            </Space>
            {renderStatusPlaceholder(sEnhance.reason)}
          </Col>
        </Row>
      </div>
    );
  };

  const renderGameSettings = () => {
    const sTerrain = getSettingStatus('terrain');
    const sTree = getSettingStatus('tree');
    const sLighting = getSettingStatus('lighting');
    const sUi = getSettingStatus('ui'); // not used yet but good to have

    return (
      <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('setup.war3.path')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '4px',
              color: '#aaa',
              fontSize: '13px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentInstallation?.path || t('setup.war3.unset')}
            </div>
            <Button
              type="primary"
              ghost
              size="small"
              disabled={isLoading}
              onClick={async () => {
                playSmall();
                const path = await window.electronAPI?.selectGamePath();
                if (path) {
                  message.success(t('msg.war3.path.set'));
                  // 强制触发一次检测
                  detectInstallations();
                }
              }}
              onMouseEnter={() => playHover()}
              style={{ borderColor: '#d4af37', color: '#d4af37' }}
            >
              {t('setup.btn.change')}
            </Button>
          </div>
        </div>

        <Row gutter={[20, 20]}>
          <Col span={24}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.ui.style')}</h3>
            <Space wrap>

              {renderSettingButton(t('settings.ui.classic'), modSettings.ui, 'classic', () => handleSettingChange('ui', 'classic'), () => setPreviewInfo({ title: t('settings.ui.style'), desc: t('settings.ui.classic.desc'), image: './assets/quenching/ui1.png' }))}
              {renderSettingButton(t('settings.ui.quenching'), modSettings.ui, 'quenching', () => handleSettingChange('ui', 'quenching'), () => setPreviewInfo({ title: t('settings.ui.style'), desc: t('settings.ui.quenching.desc'), image: './assets/quenching/ui2.png' }))}
              {renderSettingButton(t('settings.ui.blizzard'), modSettings.ui, 'carnival', () => handleSettingChange('ui', 'carnival'), () => setPreviewInfo({ title: t('settings.ui.style'), desc: t('settings.ui.blizzard.desc'), image: './assets/quenching/ui3.png' }))}
            </Space>
            {renderStatusPlaceholder(null)}
          </Col>
          <Col span={24}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.terrain.style')}</h3>
            <Space wrap>
              {renderSettingButton(t('settings.terrain.original'), modSettings.terrain, 'original', () => handleSettingChange('terrain', 'original'), () => setPreviewInfo({ title: t('settings.terrain.style'), desc: t('settings.terrain.original'), image: './assets/quenching/set6.png' }), sTerrain.disabled)}
              {renderSettingButton(t('settings.terrain.latest'), modSettings.terrain, 'latest', () => handleSettingChange('terrain', 'latest'), () => setPreviewInfo({ title: t('settings.terrain.style'), desc: t('settings.terrain.latest'), image: './assets/quenching/set6.png' }), sTerrain.disabled)}
              {/* {renderSettingButton(t('settings.terrain.retro'), modSettings.terrain, 'retro', () => handleSettingChange('terrain', 'retro'), () => setPreviewInfo({ title: t('settings.terrain.style'), desc: t('settings.terrain.retro'), image: './assets/quenching/set6.png' }), isClassicMode)} */}
            </Space>
            {renderStatusPlaceholder(sTerrain.reason)}
          </Col>
          <Col span={24}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.tree.style')}</h3>
            <Space wrap>
              {renderSettingButton(t('settings.tree.original'), modSettings.tree, 'original', () => handleSettingChange('tree', 'original'), () => setPreviewInfo({ title: t('settings.tree.style'), desc: t('settings.tree.original'), image: './assets/quenching/set2.png' }), sTree.disabled)}
              {renderSettingButton(t('settings.tree.tall'), modSettings.tree, 'tall', () => handleSettingChange('tree', 'tall'), () => setPreviewInfo({ title: t('settings.tree.style'), desc: t('settings.tree.tall'), image: './assets/quenching/set2.png' }), sTree.disabled)}
              {renderSettingButton(t('settings.tree.short'), modSettings.tree, 'short', () => handleSettingChange('tree', 'short'), () => setPreviewInfo({ title: t('settings.tree.style'), desc: t('settings.tree.short'), image: './assets/quenching/set2.png' }), sTree.disabled)}
            </Space>
            {renderStatusPlaceholder(sTree.reason)}
          </Col>
          <Col span={24}>
            <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.lighting')}</h3>
            <Space wrap>
              {renderSettingButton(t('settings.lighting.standard'), modSettings.lighting, 'standard', () => handleSettingChange('lighting', 'standard'), () => setPreviewInfo({ title: t('settings.lighting'), desc: t('settings.lighting.standard'), image: './assets/quenching/set3.png' }), sLighting.disabled)}
              {renderSettingButton(t('settings.lighting.level4'), modSettings.lighting, 'battle', () => handleSettingChange('lighting', 'battle'), () => setPreviewInfo({ title: t('settings.lighting'), desc: t('settings.lighting.level4'), image: './assets/quenching/set3.png' }), sLighting.disabled)}
              {renderSettingButton('RPG', modSettings.lighting, 'rpg', () => handleSettingChange('lighting', 'rpg'), () => setPreviewInfo({ title: t('settings.lighting'), desc: 'RPG', image: './assets/quenching/set3.png' }), sLighting.disabled)}
            </Space>
            {renderStatusPlaceholder(sLighting.reason)}
          </Col>
        </Row>
      </div>
    );
  };

  const renderBasicSettings = () => (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 经典版模式切换 */}
        <div>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>
            {t(isClassicMode ? 'settings.basic.classicMode.unlock' : 'settings.basic.classicMode.lock')}
          </h3>
          <Space direction="vertical">
            <div style={{ color: '#888' }}>
              {t(isClassicMode
                ? 'settings.basic.classicMode.unlock.desc'
                : 'settings.basic.classicMode.lock.desc'
              )}
            </div>
            <Button
              onClick={() => { playSmall(); handleToggleClassicMode(); }}
              onMouseEnter={() => playHover()}
              style={{ borderColor: isClassicMode ? '#ff4d4f' : '#d4af37', color: isClassicMode ? '#ff4d4f' : '#d4af37' }}
            >
              {t(isClassicMode ? 'settings.basic.classicMode.unlock' : 'settings.basic.classicMode.lock')}
            </Button>
          </Space>
        </div>

        {/* 重置渲染 */}
        <div>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.basic.resetRendering')}</h3>
          <Space direction="vertical">
            <div style={{ color: '#888' }}>{t('settings.basic.resetRendering.desc')}</div>
            <Button disabled={isClassicMode} onClick={() => { playSmall(); handleResetRendering(); }} onMouseEnter={() => playHover()} style={{ borderColor: '#d4af37', color: '#d4af37' }}>
              {t('settings.basic.resetRendering')}
            </Button>
            {isClassicMode && <div style={{ color: '#ff4d4f', fontSize: '12px' }}>{t('settings.basic.classicMode.restrict')}</div>}
          </Space>
        </div>

        {/* 删除MOD */}
        <div>
          <h3 style={{ color: '#ff4d4f', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>{t('settings.basic.deleteMod')}</h3>
          <Space direction="vertical">
            <div style={{ color: '#888' }}>{t('settings.basic.deleteMod.desc')}</div>
            <Button danger disabled={isClassicMode} onClick={() => { playSmall(); handleDeleteMod(); }} onMouseEnter={() => playHover()}>
              {t('settings.basic.deleteMod')}
            </Button>
            {isClassicMode && <div style={{ color: '#ff4d4f', fontSize: '12px' }}>{t('settings.basic.classicMode.restrict')}</div>}
          </Space>
        </div>
      </Space>
    </div>
  );

  return (
    <OverlayModal
      open={open}
      onClose={onClose}
      title={t('settings.title')}
      width="90%"
    >
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        height: '100%'
      }}>


        {/* 全局背景图 - 根据 hover 变化 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: previewInfo.image ? `url("${previewInfo.image}")` : 'none',
          /* 💡 backgroundSize: 控制图片缩放 */
          backgroundSize: '70% auto',
          backgroundRepeat: 'no-repeat',
          /* 💡 backgroundPosition: 'right bottom' 让图片靠右下 */
          backgroundPosition: 'right',
          opacity: previewInfo.image ? 0.7 : 0,
          transition: 'all 0.5s ease',
          zIndex: 0,
          filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
        }} />

        {/* 左侧菜单 */}
        <div style={{
          width: '200px',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0',
          zIndex: 1,
          borderRight: '1px solid rgba(212, 175, 55, 0.1)'
        }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              onClick={() => {
                playSmall();
                setSelectedCategory(cat.id as any);
              }}
              onMouseEnter={() => playHover()}
              style={{
                padding: '15px 30px',
                cursor: 'pointer',
                background: selectedCategory === cat.id ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.2), transparent)' : 'transparent',
                borderLeft: selectedCategory === cat.id ? '4px solid #d4af37' : '4px solid transparent',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{
                color: selectedCategory === cat.id ? '#d4af37' : '#888',
                fontSize: '18px',
                fontWeight: selectedCategory === cat.id ? 'bold' : 'normal',
                fontFamily: "'Trajan Pro 3', serif"
              }}>{cat.name}</span>
            </div>
          ))}
        </div>

        {/* 主内容区：设置 + 浮动说明 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          position: 'relative'
        }}>
          {/* 设置项滚动区 */}
          <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
            {selectedCategory === 'graphics' && renderGraphicsSettings()}
            {selectedCategory === 'game' && renderGameSettings()}
            {selectedCategory === 'basic' && renderBasicSettings()}
          </div>

          {/* 底部说明区 - 悬浮设计，解决太靠下的问题 */}
          <div style={{
            position: 'absolute',
            bottom: '0', // 向上浮动，离开底部边缘
            left: '40px',
            right: '40px',
            padding: '20px 30px',
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 100%)',
            borderRadius: '8px',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            opacity: previewInfo.title ? 1 : 0,
            transform: previewInfo.title ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none' // 不阻碍下方滚动
          }}>
            <h4 style={{
              color: '#d4af37',
              fontSize: '18px',
              marginBottom: '8px',
              fontFamily: "'Trajan Pro 3', serif",
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              {previewInfo.title || '说明'}
            </h4>
            <Text style={{
              color: '#eee',
              fontSize: '14px',
              lineHeight: '1.6',
              display: 'block',
              whiteSpace: 'pre-wrap',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              maxWidth: '70%' // 给右侧背景图留出视觉空间
            }}>
              {previewInfo.desc}
            </Text>
          </div>
        </div>
      </div>
    </OverlayModal>
  );
};

export default SettingsModal;
