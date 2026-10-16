import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import { originalSkin, parseSkinSections, writeVersionSkins } from '../../src/shared/skin-versions';

const sections = await fetch('/baseline').then(r => r.json());
let selections = JSON.parse(localStorage.getItem('skin-test-selections') || '{}');
let custom = JSON.parse(localStorage.getItem('skin-test-custom') || '[]');
let content = '';
let enabled = true;
// Browser fixture only: mutations stay in memory/localStorage; actual renderer components are bundled unchanged.
window.electronAPI = {
  getConfig: async () => new URLSearchParams(location.search).get('lang') || 'zh-CN',
  setConfig: async () => true,
  getVersionSkinPanel: async artSet => ({ selections, originals: Object.fromEntries(Object.entries(sections).map(([id, value]) => [id, originalSkin(value as any, artSet)])) }),
  listCustomSkins: async () => custom,
  isSkinEnabled: async () => enabled,
  enableSkins: async () => enabled = true,
  disableSkins: async () => { enabled = false; return true; },
  getRetroSkinStatus: async () => ({ unitsEnabled: false, buildingsEnabled: false }),
  applyVersionSkins: async (mode, choices) => {
    content = writeVersionSkins(content, sections, mode, choices);
    selections = { ...selections, [mode]: { ...selections[mode], ...Object.fromEntries(choices.map(c => [c.unitId, c.skinId])) } };
    localStorage.setItem('skin-test-selections', JSON.stringify(selections));
    (window as any).skinTest = { selections, applied: parseSkinSections(content) };
    return selections;
  },
  createCustomSkin: async input => {
    const record = { ...input, id: `custom_${Date.now()}`, config: input.modelPath ? [{ field: 'file', value: input.modelPath }] : [] };
    custom = [...custom, record]; localStorage.setItem('skin-test-custom', JSON.stringify(custom)); return record;
  },
  deleteCustomSkin: async id => {
    custom = custom.filter(skin => skin.id !== id);
    for (const artSet of Object.keys(selections)) for (const target of Object.keys(selections[artSet])) {
      if (selections[artSet][target] === id) selections[artSet][target] = 'original';
    }
    localStorage.setItem('skin-test-custom', JSON.stringify(custom));
    localStorage.setItem('skin-test-selections', JSON.stringify(selections));
    return true;
  },
  selectModelFile: async () => 'C:\\Example\\Knight.mdx',
  inspectCustomSkinModel: async () => ({ references: ['Textures\\KnightDiffuse.blp', 'Textures\\KnightGlow.blp'],
    siblingCandidates: ['C:\\Example\\KnightDiffuse.blp'], textureBindings: { 'Textures\\KnightDiffuse.blp': 'C:\\Example\\KnightDiffuse.blp' },
    gameReferences: [], unresolved: ['Textures\\KnightGlow.blp'] }),
  selectFile: async (options) => `C:\\Example\\${options.title.includes('DISBTN') ? 'DISBTNKnight' : options.title.includes('BTN') ? 'BTNKnight' : 'KnightGlow'}.png`,
  readModelResource: async (path, basePath, artSet) => {
    if (new URLSearchParams(location.search).has('missing-model')) throw new Error('Model resource not found');
    const response = await fetch('/resource?' + new URLSearchParams({ path, ...(basePath ? { basePath } : {}), artSet }));
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
} as any;
const { SkinModal } = await import('../../src/Renderer/components/MainWindow/SkinModal');
const { reaxel_I18n } = await import('../../src/Renderer/utils/i18n');
const locale = new URLSearchParams(location.search).get('lang') || 'zh-CN';
reaxel_I18n().setLanguage(locale as any);
(window as any).skinLanguageTest = reaxel_I18n();
createRoot(document.getElementById('root')!).render(<ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}><SkinModal open onClose={() => {}} isFullPackageInstalled /></ConfigProvider>);
