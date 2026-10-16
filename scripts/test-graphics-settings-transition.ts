import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const fixture: any = { category: 'game', enabled: true, failSync: false, fullPackage: true, syncs: 0, writes: [], treeRequests: [] };
(globalThis as any).__graphicsSettingsFixture = fixture;
const bundled = await build({
  stdin: { contents: `export { reaxel_War3Settings } from './src/Renderer/hooks/useWar3Settings';
    export { SettingsModal } from './src/Renderer/components/MainWindow/SettingsModal';`, resolveDir: process.cwd(), loader: 'ts' },
  platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'graphics-settings-fixture', setup(plugin) {
    plugin.onResolve({ filter: /^reaxes$|^antd$|^react$|(?:useWar3Settings|useWar3Detector|useSound|GlobalLoadingProvider|OverlayModal|i18n)$/ }, args => {
      if (args.namespace === 'fixture' && args.path === 'react') return { path: args.path, external: true };
      if (args.path.endsWith('useWar3Settings') && !args.importer.endsWith('SettingsModal.tsx')) return;
      return { path: args.path, namespace: 'fixture' };
    });
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: process.cwd(), contents:
      'const f=globalThis.__graphicsSettingsFixture;' + (
        args.path === 'reaxes' ? `export const reaxel=(factory)=>{let instance;return ()=>{
          instance??=factory();return typeof instance==='function'?instance():instance;};};
          export const createReaxable=(store)=>({store,setState:(change)=>Object.assign(store,change)});`
        : args.path === 'react' ? `const React=require('react');export default React;
          export const useState=(initial)=>React.useState(initial==='graphics'?f.category:initial);
          export const useEffect=React.useEffect;export const useMemo=React.useMemo;`
        : args.path === 'antd' ? `const React=require('react');const layout=({children})=>React.createElement('div',null,children);
          export const Button=({children,disabled})=>React.createElement('button',{disabled},children);
          export const Space=layout,Row=layout,Col=layout,Spin=layout,Typography={Text:layout};
          export const message={error(){},success(){},warning(){}};`
        : args.path.endsWith('useWar3Settings') ? `export const useWar3Settings=()=>({modSettings:f.hook.store.modSettings,
          settings:f.hook.store.settings,saveModSettings:f.hook.saveModSettings,toggleGameMode(){},isLoading:f.hook.store.isLoading});`
        : args.path.endsWith('useWar3Detector') ? `export const useWar3Detector=()=>({currentInstallation:{path:'Z:/fixture-game'},detectInstallations:async()=>{}});`
        : args.path.endsWith('useSound') ? `export const useSound=()=>({playSmall(){},playHover(){}});`
        : args.path.endsWith('GlobalLoadingProvider') ? `export const useGlobalLoading=()=>({showLoading(){},hideLoading(){}});`
        : args.path.endsWith('OverlayModal') ? `export const OverlayModal=({children})=>children;`
        : `export const useTranslation=()=>({t:(key)=>key});`
      ),
    }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { SettingsModal, reaxel_War3Settings } = module.exports;
fixture.hook = reaxel_War3Settings();
const hook = fixture.hook;
fixture.saved = { ...hook.store.modSettings, terrain: 'latest', resolvedGraphics: 'hd', resolvedVersion: 'v30' };
hook.store.modSettings = { ...fixture.saved };
let preferences = '[video]\nhd=1\n';
let terrainMeta = '20';
let treeContent = '';
const api = {
  getConfig: async (key: string) => key === 'gameChannel' ? 'retail' : { ...fixture.saved },
  setConfig: async (key: string, value: any) => { if (key === 'modSettings') fixture.saved = { ...value }; },
  getInstalledModState: async () => null,
  getFullPackageStatus: async () => fixture.fullPackage,
  getBranchModStates: async () => ({ retail: { enabled: fixture.enabled } }),
  getAppPath: async () => 'Z:/fixture-documents',
  pathExists: async (name: string) => /War3Preferences\.txt$|_retail_$|terrainart\/meta\.que$|units\/destructableskin\.txt$/.test(name),
  readFile: async (name: string) => name.endsWith('destructableskin.txt') ? treeContent : name.endsWith('meta.que') ? terrainMeta : preferences,
  copyFile: async () => {},
  writeFile: async (_name: string, content: string) => { preferences = content; },
  syncAssets: async () => {
    fixture.syncs++;
    if (fixture.failSync) throw new Error('fixture missing profile assets');
    fixture.saved = { ...fixture.saved, resolvedGraphics: fixture.saved.graphicsSelection, resolvedVersion: 'v30' };
    if (fixture.saved.graphicsSelection !== 'sd') {
      await api.updateTreeSettings('Z:/fixture-game', fixture.saved.tree);
    }
  },
  updateTerrainSettings: async (_path: string, terrain: string) => {
    fixture.writes.push(`terrain:${terrain}`);
    terrainMeta = ({ original: 'original', latest: '20', v16: '16', v18: '18', retro: '00', decisive: '30' } as any)[terrain];
    return true;
  },
  updateTreeSettings: async (_path: string, tree: string) => {
    fixture.writes.push('trees');
    fixture.treeRequests.push(tree);
    treeContent = tree === 'tall' ? 'tree/t20/LordaeronTree' : 'Trees/LordaeronTree';
    return true;
  },
  updateWaterSettings: async () => { fixture.writes.push('water'); return true; },
  updateUISettings: async () => true,
  updateBlightSettings: async () => true,
  syncUISettings: async () => true,
};
const previousWindow = (globalThis as any).window;
(globalThis as any).window = { electronAPI: api };
const originalLog = console.log;
const originalError = console.error;
const originalSetTimeout = globalThis.setTimeout;
// Existing IPC timeout races must not keep a completed fixture alive for 45s.
globalThis.setTimeout = ((callback: any, delay: number, ...args: any[]) => {
  const timer = originalSetTimeout(callback, delay, ...args);
  if (delay > 1000) timer.unref();
  return timer;
}) as typeof setTimeout;
console.log = () => {};
console.error = () => {};

function buttonDisabled(label: string, category: string): boolean {
  fixture.category = category;
  const html = renderToStaticMarkup(React.createElement(SettingsModal, { open: true, onClose() {}, isFullPackageInstalled: fixture.fullPackage }));
  const button = [...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)].find(match => match[2] === label);
  assert(button, `missing actual SettingsModal button: ${label}`);
  return /\bdisabled/.test(button[1]);
}
try {
  // The exact reported flow, repeated in the same client session.
  for (let round = 0; round < 2; round++) {
    await hook.saveModSettings('Z:/fixture-game', { terrain: 'latest' });
    await hook.saveModSettings('Z:/fixture-game', { tree: 'tall' });
    assert.equal(hook.store.modSettings.tree, 'tall');
    await hook.saveModSettings('Z:/fixture-game', { graphicsSelection: 'de' });
    assert.equal(hook.store.modSettings.resolvedGraphics, 'de');
    assert.equal(fixture.saved.resolvedGraphics, 'de');
    assert.equal(hook.store.modSettings.terrain, 'latest', 'DE must retain the selected terrain');
    assert(fixture.writes.includes('terrain:latest'));
    assert.equal(fixture.saved.tree, 'original');
    assert.equal(hook.store.modSettings.tree, 'original');
    assert.equal(fixture.treeRequests.at(-1), 'original', 'entering DE must apply original tree resources');
    await hook.saveModSettings('Z:/fixture-game', { tree: 'tall' });
    assert.equal(hook.store.modSettings.tree, 'tall', 'DE still allows manually selected trees');
    await hook.saveModSettings('Z:/fixture-game', { versionSelection: 'v30' });
    await hook.saveModSettings('Z:/fixture-game', { graphicsSelection: 'de' });
    assert.equal(fixture.saved.tree, 'tall', 'remaining in DE must preserve manual tree selection');
    assert.equal(fixture.treeRequests.at(-1), 'tall');
    for (const terrain of ['latest', 'v16', 'v18', 'retro', 'original', 'decisive'] as const) {
      await hook.saveModSettings('Z:/fixture-game', { terrain });
      assert.equal(fixture.saved.terrain, terrain);
      assert.equal(fixture.saved.resolvedGraphics, 'de');
    }
    assert.equal(buttonDisabled('settings.terrain.latest', 'game'), false);
    assert.equal(buttonDisabled('settings.tree.height.16', 'game'), false);
    assert.equal(buttonDisabled('settings.tree.height.18', 'game'), false);
    assert.equal(buttonDisabled('settings.terrain.retro', 'game'), false);
    assert.equal(buttonDisabled('settings.water.transparent', 'graphics'), true);
    await hook.saveModSettings('Z:/fixture-game', { graphicsSelection: 'hd' });
    assert.equal(hook.store.modSettings.resolvedGraphics, 'hd');
    assert.equal(fixture.saved.resolvedGraphics, 'hd');
    assert.equal(buttonDisabled('settings.terrain.latest', 'game'), false);
    assert.equal(buttonDisabled('settings.water.transparent', 'graphics'), false);
    for (const terrain of ['latest', 'v16', 'v18', 'retro', 'original', 'decisive'] as const) {
      await hook.saveModSettings('Z:/fixture-game', { terrain });
      assert.equal(hook.store.modSettings.terrain, terrain);
      assert.equal(fixture.saved.resolvedGraphics, 'hd');
    }
    // Even a stale renderer snapshot must not overwrite a newer main-process result.
    hook.store.modSettings = { ...hook.store.modSettings, resolvedGraphics: 'de', resolvedVersion: 'v20' };
    assert.equal(buttonDisabled('settings.terrain.latest', 'game'), false);
    assert.equal(buttonDisabled('settings.water.transparent', 'graphics'), false);
    await hook.saveModSettings('Z:/fixture-game', { ui: 'quenching' });
    assert.equal(fixture.saved.resolvedGraphics, 'hd');
    assert.equal(hook.store.modSettings.resolvedVersion, 'v30');
    hook.store.modSettings = { ...hook.store.modSettings, resolvedGraphics: 'de' };
    await hook.saveModSettings('Z:/fixture-game', { blight: round === 0 });
    assert.equal(fixture.saved.resolvedGraphics, 'hd');
  }
  // DE itself and the full-package prerequisite remain restricted.
  fixture.fullPackage = false;
  assert.equal(buttonDisabled('settings.terrain.latest', 'game'), true);
  fixture.fullPackage = true;
  fixture.failSync = true;
  await assert.rejects(hook.saveModSettings('Z:/fixture-game', { graphicsSelection: 'de' }), /missing profile assets/);
  assert.equal(fixture.saved.graphicsSelection, 'hd');
  assert.equal(hook.store.modSettings.resolvedGraphics, 'hd');
  assert.equal(hook.store.isLoading, false);
  fixture.failSync = false;

  await hook.saveModSettings('Z:/fixture-game', { graphicsSelection: 'sd' });
  assert.equal(hook.store.modSettings.resolvedGraphics, 'sd');
  assert.equal(buttonDisabled('settings.terrain.latest', 'game'), true);
  await hook.saveModSettings('Z:/fixture-game', { graphicsSelection: 'de' });
  assert.equal(fixture.saved.tree, 'original', 'SD to DE also resets tree selection');
  assert.equal(fixture.treeRequests.at(-1), 'original');
  fixture.enabled = false;
  const syncs = fixture.syncs, writes = fixture.writes.length;
  await hook.saveModSettings('Z:/fixture-game', { graphicsSelection: 'hd' });
  assert.equal(fixture.syncs, syncs);
  assert.equal(fixture.writes.length, writes);
  assert.equal(hook.store.modSettings.resolvedGraphics, 'de', 'off switch retains last applied profile until enabled');
  assert.equal(buttonDisabled('settings.terrain.latest', 'game'), false, 'explicit HD is not locked by parked DE');
  assert.equal(buttonDisabled('settings.water.transparent', 'graphics'), false);
} finally {
  console.log = originalLog;
  console.error = originalError;
  globalThis.setTimeout = originalSetTimeout;
  if (previousWindow === undefined) delete (globalThis as any).window;
  else (globalThis as any).window = previousWindow;
  delete (globalThis as any).__graphicsSettingsFixture;
}
console.log('PASS: graphics transitions, original trees on entering DE, manual DE trees, terrain choices, water unlock, stale profile writes, failed sync rollback and MOD-off/SD restrictions');
