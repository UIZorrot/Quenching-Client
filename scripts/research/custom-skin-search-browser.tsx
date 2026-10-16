import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';

// Only the bridge is mocked. The real editor, translations and React state are exercised.
const fixture = { scans: 0, failNext: false, delay: 120, saved: undefined as any };
(window as any).skinSearchFixture = fixture;
window.electronAPI = {
  getConfig: async () => new URLSearchParams(location.search).get('language') || 'zh-CN',
  setConfig: async () => {},
  selectModelFile: async () => 'C:\\fixture\\Hero.mdx',
  selectFile: async options => options.title.includes('图标') ? 'C:\\fixture\\icon.blp' : 'C:\\fixture\\manual-glow.dds',
  inspectCustomSkinModel: async (modelPath: string) => {
    const scan = ++fixture.scans;
    await new Promise(resolve => setTimeout(resolve, fixture.delay));
    if (fixture.failNext) { fixture.failNext = false; throw new Error('搜索测试失败，请重试'); }
    return { modelPath, references: ['Textures/Body.blp', 'Textures/Stock.blp', 'war3mapImported/Glow.blp'],
      textureBindings: { 'Textures/Body.blp': `C:\\fixture\\nested\\body-${scan}.dds`,
        ...(scan > 1 ? { 'war3mapImported/Glow.blp': 'C:\\fixture\\automatic-glow.blp' } : {}) },
      gameReferences: ['Textures/Stock.blp'], gameTextureBindings: { 'Textures/Stock.blp': 'Textures/Stock.blp' },
      siblingCandidates: [], unresolved: scan > 1 ? [] : ['war3mapImported/Glow.blp'] };
  },
  createCustomSkin: async input => {
    fixture.saved = input;
    return { ...input, id: 'fixture', config: [], createdAt: new Date().toISOString() };
  },
} as any;

// As in Electron preload, install the bridge before renderer module initialization.
const { CustomSkinEditor } = await import('../../src/Renderer/components/MainWindow/CustomSkinEditor');
const { useTranslation } = await import('../../src/Renderer/utils/i18n');

function Fixture() {
  const [open, setOpen] = React.useState(true);
  const { currentLanguage, setLanguage } = useTranslation();
  return <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
    <button onClick={() => setOpen(true)}>重新打开编辑器</button>
    <button onClick={() => setLanguage('fr-FR')}>Test manual French</button>
    <output id="language">{currentLanguage}</output>
    <CustomSkinEditor open={open} targetId="hfoo" targetName="步兵" category="unit" artSet="hd" race="hum"
      onClose={() => setOpen(false)} onCreated={() => {}} />
  </ConfigProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
