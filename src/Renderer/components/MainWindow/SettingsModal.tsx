import React, { useState, useMemo, useEffect } from 'react';
import { Typography, Button, Space, Row, Col, message, Spin } from 'antd';
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
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { modSettings, settings: war3Settings, saveModSettings, toggleGameMode, isLoading } = useWar3Settings();
  const { currentInstallation, detectInstallations } = useWar3Detector();
  const { playSmall, playHover } = useSound();
  const { showLoading, hideLoading } = useGlobalLoading();
  const [selectedCategory, setSelectedCategory] = useState<'graphics' | 'game'>('graphics');
  const [previewInfo, setPreviewInfo] = useState<{ title: string; desc: string; image: string | null }>({
    title: '',
    desc: '请将鼠标悬停在选项上以查看说明',
    image: null
  });

  const categories = [
    { id: 'game', name: '游戏设置' },
    { id: 'graphics', name: '画面设置' }
  ];

  const handleSettingChange = async (key: string, value: any) => {
    console.log('[SettingsModal] handleSettingChange called:', key, value);
    if (!currentInstallation?.path) {
      console.warn('[SettingsModal] No War3 installation path found!');
      message.error('未找到游戏安装目录');
      return;
    }

    try {
      showLoading('正在应用设置...');
      console.log('[SettingsModal] Saving settings to:', currentInstallation.path);
      if (key === 'gameVersion') {
        // gameVersion 对应 War3Preferences.txt 中的 hd 字段
        await toggleGameMode(currentInstallation.path, value === 'reforged');
      } else {
        await saveModSettings(currentInstallation.path, { [key]: value });
      }
      message.success('设置已更新');
    } catch (error) {
      console.error('Failed to update setting:', error);
      const msg = error instanceof Error ? error.message : '设置更新失败';
      message.error(msg);
    } finally {
      hideLoading();
    }
  };

  const handleSelectVisionModPath = async () => {
    playSmall();
    const path = await window.electronAPI?.selectDirectory('选择 VisionMod 目录');
    if (path) {
      // 验证目录
      const valid_1 = await window.electronAPI?.pathExists(`${path}/Install Guide.txt`);
      const valid_2 = await window.electronAPI?.pathExists(`${path}/visionmod.txt.txt`);
      const valid_3 = await window.electronAPI?.pathExists(`${path}/visionmod.txt`);

      if (valid_1 || valid_2 || valid_3) {
        await handleSettingChange('visionModPath', path);
        message.success('VisionMod 目录已更新');
      } else {
        message.error('该目录不是有效的 VisionMod 目录！');
      }
    }
  };

  const renderVisionModPathSelector = () => (
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
      <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>VisionMod 目录</h3>
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
          {modSettings.visionModPath || '未设置 VisionMod 目录'}
        </div>
        <Button
          type="primary"
          ghost
          size="small"
          onClick={handleSelectVisionModPath}
          onMouseEnter={() => playHover()}
          style={{ borderColor: '#d4af37', color: '#d4af37' }}
        >
          更改目录
        </Button>
      </div>
    </div>
  );

  const renderSettingButton = (label: string, currentValue: any, targetValue: any, onClick: () => void, onMouseEnter?: () => void, key?: React.Key) => {
    const isSelected = currentValue === targetValue;
    return (
      <Button
        key={key}
        disabled={isLoading}
        onClick={(e) => {
          e.currentTarget.blur(); // 强制失去焦点，修复高亮状态滞后问题
          playSmall();
          onClick();
        }}
        onMouseEnter={() => {
          playHover();
          onMouseEnter?.();
        }}
        style={{
          background: isSelected ? 'rgba(212, 175, 55, 0.3)' : 'rgba(0,0,0,0.5)',
          border: isSelected ? '1px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
          color: isSelected ? '#fff' : '#aaa',
          fontSize: '12px',
          height: '28px',
          transition: 'all 0.2s',
          minWidth: '80px'
        }}
      >
        {label}
      </Button>
    );
  };

  const renderGraphicsSettings = () => (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      {renderVisionModPathSelector()}
      <Row gutter={[20, 20]}>
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>水面效果</h3>
          <Space wrap>
            {renderSettingButton('真实', modSettings.water, 'realistic', () => handleSettingChange('water', 'realistic'), () => setPreviewInfo({ title: '水面效果', desc: '更加真实的反射水面效果', image: './assets/quenching/set1.png' }))}
            {renderSettingButton('透明', modSettings.water, 'transparent', () => handleSettingChange('water', 'transparent'), () => setPreviewInfo({ title: '水面效果', desc: '更加清澈透明的水面效果', image: './assets/quenching/set1.png' }))}
          </Space>
        </Col>
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>植被效果</h3>
          <Space>
            {renderSettingButton('开启', modSettings.foliage, true, () => handleSettingChange('foliage', true), () => setPreviewInfo({ title: '植被设置', desc: '华丽的植被可能带来卡顿\n您可以根据硬件选择适合的植被', image: './assets/quenching/set4.png' }))}
            {renderSettingButton('关闭', modSettings.foliage, false, () => handleSettingChange('foliage', false), () => setPreviewInfo({ title: '植被设置', desc: '关闭植被效果以提升性能', image: null }))}
          </Space>
        </Col>
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>物体着色器</h3>
          <Space>
            {renderSettingButton('开启', modSettings.objectShader, true, () => handleSettingChange('objectShader', true), () => setPreviewInfo({ title: '物体着色器', desc: '增强物体表面材质细节，使模型更具质感', image: './assets/quenching/set5.png' }))}
            {renderSettingButton('关闭', modSettings.objectShader, false, () => handleSettingChange('objectShader', false), () => setPreviewInfo({ title: '物体着色器', desc: '关闭物体着色器以提升性能', image: null }))}
          </Space>
        </Col>
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>后处理</h3>
          <Space>
            {renderSettingButton('开启', modSettings.postProcessing, true, () => handleSettingChange('postProcessing', true), () => setPreviewInfo({ title: '后处理', desc: '开启全屏后处理特效，包括色调映射和色彩校正', image: './assets/quenching/setp7.png' }))}
            {renderSettingButton('关闭', modSettings.postProcessing, false, () => handleSettingChange('postProcessing', false), () => setPreviewInfo({ title: '后处理', desc: '关闭后处理效果', image: null }))}
          </Space>
        </Col>
        {/* <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>体积雾</h3>
          <Space>
            {renderSettingButton('开启', modSettings.volumetricFog, true, () => handleSettingChange('volumetricFog', true), () => setPreviewInfo({ title: '体积雾', desc: '更加真实的三维体积烟雾效果，增加战场氛围喵☁️', image: './assets/quenching/set6.png' }))}
            {renderSettingButton('关闭', modSettings.volumetricFog, false, () => handleSettingChange('volumetricFog', false), () => setPreviewInfo({ title: '体积雾', desc: '使用传统迷雾效果', image: null }))}
          </Space>
        </Col> */}
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>缩减光晕</h3>
          <Space>
            {renderSettingButton('开启', modSettings.glow, true, () => handleSettingChange('glow', true), () => setPreviewInfo({ title: '缩减光晕', desc: '缩减重制版中过于明亮的光晕\n使画面更加柔和自然', image: './assets/quenching/ui4.png' }))}
            {renderSettingButton('关闭', modSettings.glow, false, () => handleSettingChange('glow', false), () => setPreviewInfo({ title: '缩减光晕', desc: '保持默认光晕效果', image: null }))}
          </Space>
        </Col>
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>半身头像</h3>
          <Space>
            {renderSettingButton('开启', modSettings.half, true, () => handleSettingChange('half', true), () => setPreviewInfo({ title: '半身头像', desc: '在下方状态栏显示精美的单位半身像\n(需要 VisionMod 2.1+ 版本)', image: './assets/quenching/ui5.png' }))}
            {renderSettingButton('关闭', modSettings.half, false, () => handleSettingChange('half', false), () => setPreviewInfo({ title: '半身头像', desc: '显示完整头像', image: null }))}
          </Space>
        </Col>
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>环境渲染</h3>
          <Space>
            {renderSettingButton('开启', modSettings.envRender, true, () => handleSettingChange('envRender', true), () => setPreviewInfo({ title: '环境渲染', desc: '开启高级环境渲染效果，提升场景细节与真实感', image: './assets/quenching/setp10.png' }))}
            {renderSettingButton('关闭', modSettings.envRender, false, () => handleSettingChange('envRender', false), () => setPreviewInfo({ title: '环境渲染', desc: '关闭环境渲染效果', image: null }))}
          </Space>
        </Col>
        <Col span={12}>
          <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>模型加强</h3>
          <Space>
            {renderSettingButton('开启', modSettings.modelEnhance, true, () => handleSettingChange('modelEnhance', true), () => setPreviewInfo({ title: '模型加强', desc: '提升单位与建筑模型的网格细节与材质表现\n(需要 VisionMod 2.1+ 版本)', image: './assets/quenching/setp11.png' }))}
            {renderSettingButton('关闭', modSettings.modelEnhance, false, () => handleSettingChange('modelEnhance', false), () => setPreviewInfo({ title: '模型加强', desc: '使用默认模型精度', image: null }))}
          </Space>
        </Col>
      </Row>
    </div>
  );

  const renderGameSettings = () => (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
        <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>魔兽目录</h3>
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
            {currentInstallation?.path || '未设置魔兽目录'}
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
                message.success('魔兽目录已更新');
                // 强制触发一次检测
                detectInstallations();
              }
            }}
            onMouseEnter={() => playHover()}
            style={{ borderColor: '#d4af37', color: '#d4af37' }}
          >
            更改目录
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>UI风格</h3>
        <Space wrap>
          {renderSettingButton('经典', modSettings.ui, 'classic', () => handleSettingChange('ui', 'classic'), () => setPreviewInfo({ title: 'UI风格', desc: '原汁原味的经典版 UI', image: './assets/quenching/ui1.png' }))}
          {renderSettingButton('淬火', modSettings.ui, 'quenching', () => handleSettingChange('ui', 'quenching'), () => setPreviewInfo({ title: 'UI风格', desc: '淬火专属定制 UI 风格', image: './assets/quenching/ui2.png' }))}
          {renderSettingButton('嘉年华', modSettings.ui, 'carnival', () => handleSettingChange('ui', 'carnival'), () => setPreviewInfo({ title: 'UI风格', desc: '暴雪嘉年华限定 UI 风格', image: './assets/quenching/ui3.png' }))}
        </Space>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>地形设置</h3>
        <Space wrap>
          {renderSettingButton('原版', modSettings.terrain, 'original', () => handleSettingChange('terrain', 'original'), () => setPreviewInfo({ title: '地形设置', desc: '使用原版地形纹理', image: './assets/quenching/setp8.png' }))}
          {renderSettingButton('最新', modSettings.terrain, 'latest', () => handleSettingChange('terrain', 'latest'), () => setPreviewInfo({ title: '地形设置', desc: '使用淬火最新优化的地形纹理', image: './assets/quenching/setp8.png' }))}
          {/* {renderSettingButton('复古', modSettings.terrain, 'retro', () => handleSettingChange('terrain', 'retro'), () => setPreviewInfo({ title: '地形设置', desc: '怀旧风格的地形贴图', image: './assets/quenching/setp8.png' }))} */}
          {/* {renderSettingButton('1.6', modSettings.terrain, 'v16', () => handleSettingChange('terrain', 'v16'), () => setPreviewInfo({ title: '地形设置', desc: '淬火 v1.6 版本地形风格', image: './assets/quenching/setp8.png' }))}
          {renderSettingButton('1.8', modSettings.terrain, 'v18', () => handleSettingChange('terrain', 'v18'), () => setPreviewInfo({ title: '地形设置', desc: '淬火 v1.8 版本地形风格', image: './assets/quenching/setp8.png' }))} */}
        </Space>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>树木设置</h3>
        <Space wrap>
          {renderSettingButton('原版', modSettings.tree, 'original', () => handleSettingChange('tree', 'original'), () => setPreviewInfo({ title: '树木设置', desc: '使用原版树木模型', image: null }))}
          {renderSettingButton('高耸', modSettings.tree, 'tall', () => handleSettingChange('tree', 'tall'), () => setPreviewInfo({ title: '树木设置', desc: '更加高大茂密的树木风格', image: null }))}
          {renderSettingButton('低垂', modSettings.tree, 'short', () => handleSettingChange('tree', 'short'), () => setPreviewInfo({ title: '树木设置', desc: '枝叶低垂的自然风格树木', image: null }))}
          {renderSettingButton('复古', modSettings.tree, 'retro', () => handleSettingChange('tree', 'retro'), () => setPreviewInfo({ title: '树木设置', desc: '复古风格树木模型', image: null }))}
          {/* {renderSettingButton('1.6', modSettings.tree, 'v16', () => handleSettingChange('tree', 'v16'), () => setPreviewInfo({ title: '树木设置', desc: '淬火 v1.6 版本树木模型', image: null }))}
          {renderSettingButton('1.8', modSettings.tree, 'v18', () => handleSettingChange('tree', 'v18'), () => setPreviewInfo({ title: '树木设置', desc: '淬火 v1.8 版本树木模型', image: null }))} */}
        </Space>
      </div>

      <div>
        <h3 style={{ color: '#d4af37', marginBottom: '10px', fontSize: '16px', fontFamily: "'Trajan Pro 3', serif" }}>光照模式</h3>
        <Space wrap>
          {renderSettingButton('普通', modSettings.lighting, 'standard', () => handleSettingChange('lighting', 'standard'), () => setPreviewInfo({ title: '光照模式', desc: '原版标准光照', image: './assets/quenching/set7.png' }))}
          {renderSettingButton('对战', modSettings.lighting, 'battle', () => handleSettingChange('lighting', 'battle'), () => setPreviewInfo({ title: '光照模式', desc: '为对战优化的明亮清晰光照', image: './assets/quenching/set7.png' }))}
          {renderSettingButton('RPG', modSettings.lighting, 'rpg', () => handleSettingChange('lighting', 'rpg'), () => setPreviewInfo({ title: '光照模式', desc: '极具氛围感的电影级 RPG 光照', image: './assets/quenching/set7.png' }))}
        </Space>
      </div>

    </div>
  );

  return (
    <OverlayModal
      open={open}
      onClose={onClose}
      title="设置中心"
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
          </div>

          {/* 底部说明区 - 悬浮设计，解决太靠下的问题 */}
          <div style={{
            position: 'absolute',
            bottom: '50px', // 向上浮动，离开底部边缘
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
