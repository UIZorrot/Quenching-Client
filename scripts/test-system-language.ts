import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { systemLanguage } from '../src/shared/system-language';

const require = createRequire(import.meta.url);
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-system-language-'));
const fixture = { directory: root, preferred: ['en-GB'], locale: 'en-US', fail: false, ready: false, calls: 0 };
(globalThis as any).__languageFixture = fixture;
const previousConfigDir = process.env.QUENCHING_TEST_CONFIG_DIR;
delete process.env.QUENCHING_TEST_CONFIG_DIR;

try {
  for (const [locale, expected] of Object.entries({
    'en-GB': 'en-US', en_AU: 'en-US', 'zh-Hant-TW': 'zh-CN', 'ko-KR': 'ko-KR',
    'fr-CA': 'fr-FR', 'pt-PT': 'pt-BR', 'ru-RU': 'ru-RU', 'es-MX': 'es-ES', pl_PL: 'pl-PL',
    'ja-JP': 'zh-CN', 'de-DE': 'zh-CN', '': 'zh-CN', ' EN-us ': 'en-US',
  })) assert.equal(systemLanguage([locale]), expected, locale);
  assert.equal(systemLanguage([]), 'zh-CN');
  assert.equal(systemLanguage(['ja-JP', 'fr-CA']), 'fr-FR');

  // Real electron-store/Conf and real configuration files; mock only Electron's OS APIs.
  const bundle = await build({
    stdin: { contents: "export { ConfigManager } from './src/Main/services/config-manager';", resolveDir: process.cwd(), loader: 'ts' },
    platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
    plugins: [{ name: 'system-locale-fixture', setup(plugin) {
      plugin.onResolve({ filter: /^electron-store$/ }, () => ({ path: require.resolve('electron-store') }));
      plugin.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        const f=globalThis.__languageFixture;
        const check=()=>{if(!f.ready)throw new Error('Locale queried before app.ready');f.calls++;if(f.fail)throw new Error('OS detection failed')};
        export const app={getPath:()=>f.directory,getVersion:()=> '3.5.1',
          getPreferredSystemLanguages:()=>{check();return f.preferred},getSystemLocale:()=>{check();return f.locale}};
        export const ipcMain={on(){}};
      ` }));
    } }],
  });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, module, module.exports);
  const { ConfigManager } = module.exports;
  const makeConfig = async (name: string, saved?: object) => {
    fixture.directory = path.join(root, name);
    await fs.ensureDir(fixture.directory);
    if (saved) await fs.outputJson(path.join(fixture.directory, 'config.json'), saved);
    fixture.ready = false;
    const config = new ConfigManager();
    assert.equal(fixture.ready, false);
    fixture.ready = true;
    return config;
  };

  const fresh = await makeConfig('fresh');
  fresh.initializeSystemLanguage();
  assert.equal(fresh.get('language'), 'en-US');
  assert.equal((await fs.readJson(path.join(fixture.directory, 'config.json'))).language, 'en-US');
  fresh.set('language', 'ru-RU');
  fresh.set('war3Path', 'F:\\Warcraft III');
  fresh.set('modSettings', { graphicsSelection: 'hd', water: 'off' });
  fixture.preferred = ['ko-KR'];
  fresh.initializeSystemLanguage();
  assert.equal(fresh.get('language'), 'ru-RU', 'manual choice wins');
  const reopened = new ConfigManager();
  reopened.initializeSystemLanguage();
  assert.equal(reopened.get('language'), 'ru-RU', 'manual choice persists across restart');
  assert.equal(reopened.get('war3Path'), 'F:\\Warcraft III');
  assert.deepEqual(reopened.get('modSettings'), { graphicsSelection: 'hd', water: 'off' });

  const saved = await makeConfig('saved', { language: 'zh-CN', theme: 'roc' });
  saved.initializeSystemLanguage();
  assert.equal(saved.get('language'), 'zh-CN', 'a saved Chinese choice is not forced to OS Korean');
  assert.equal(saved.get('theme'), 'roc');

  fixture.preferred = ['pt-PT'];
  const missing = await makeConfig('missing-language', { war3Path: 'D:\\Warcraft III', modSettings: { ui: 'quenching' } });
  missing.initializeSystemLanguage();
  assert.equal(missing.get('language'), 'pt-BR');
  assert.equal(missing.get('war3Path'), 'D:\\Warcraft III');
  assert.deepEqual(missing.get('modSettings'), { ui: 'quenching' });

  fixture.preferred = ['pl-PL'];
  const polish = await makeConfig('polish-system');
  polish.initializeSystemLanguage();
  assert.equal(polish.get('language'), 'pl-PL');
  assert.equal((await fs.readJson(path.join(fixture.directory, 'config.json'))).language, 'pl-PL');
  fixture.preferred = ['en-US'];
  const savedPolish = await makeConfig('saved-polish', { language: 'pl-PL', war3Path: 'F:\\Warcraft III' });
  savedPolish.initializeSystemLanguage();
  assert.equal(savedPolish.get('language'), 'pl-PL', 'a saved Polish choice survives a different OS language');
  assert.equal(savedPolish.get('war3Path'), 'F:\\Warcraft III');

  fixture.preferred = ['ja-JP'];
  const unsupported = await makeConfig('unsupported');
  unsupported.initializeSystemLanguage();
  assert.equal(unsupported.get('language'), 'zh-CN');
  fixture.fail = true;
  const failed = await makeConfig('failed');
  failed.initializeSystemLanguage();
  assert.equal(failed.get('language'), 'zh-CN');
  fixture.fail = false;
  fixture.preferred = [];
  fixture.locale = 'es-MX';
  const localeFallback = await makeConfig('empty-preferences');
  localeFallback.initializeSystemLanguage();
  assert.equal(localeFallback.get('language'), 'es-ES');
  console.log('PASS: OS language mapping, ready-only detection, Chinese fallback, real persistent manual selection, existing game/config preservation.');
} finally {
  if (previousConfigDir === undefined) delete process.env.QUENCHING_TEST_CONFIG_DIR;
  else process.env.QUENCHING_TEST_CONFIG_DIR = previousConfigDir;
  delete (globalThis as any).__languageFixture;
  assert.equal(path.dirname(root), os.tmpdir());
  assert(path.basename(root).startsWith('quenching-system-language-'));
  await fs.remove(root);
}
