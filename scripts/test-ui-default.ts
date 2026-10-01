import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { extractZipArchive } from '../src/Main/services/zip-extraction';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-ui-default-'));
const fixture = {
  settings: {} as any, channel: 'retail', enabled: true, paused: false,
  zip: 'zip-ui-30.zip', extractions: 0, assets: path.resolve('assets'),
  async extract(zip: string, destination: string) {
    this.extractions++;
    return extractZipArchive(zip, destination);
  },
};
(globalThis as any).__uiDefaultFixture = fixture;
const bundle = await build({
  stdin: { contents: 'export { UIService } from "./src/Main/services/ui-service";', resolveDir: process.cwd(), loader: 'ts' },
  platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'ui-fixture', setup(plugin) {
    plugin.onResolve({ filter: /(?:game-channel|config-manager|war3-version|asset-sync|full-package-service|third-party-resources)$/ },
      args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({
      contents: 'const f = globalThis.__uiDefaultFixture;' + (
        args.path.endsWith('game-channel') ? 'export const getSelectedGameFolder=()=>f.channel==="ptr"?"_ptr_":"_retail_"; export const getSelectedGameChannel=()=>f.channel; export const getChannelModEnabled=()=>f.enabled;'
        : args.path.endsWith('config-manager') ? 'export const configManager={get:()=>f.settings};'
        : args.path.endsWith('war3-version') ? 'export const resolveUiZipName=async()=>f.zip;'
        : args.path.endsWith('asset-sync') ? 'export const AssetSyncService={getAssetsDir:async()=>f.assets,extractZip:(...args)=>f.extract(...args)};'
        : args.path.endsWith('full-package-service') ? 'export const isFullPackageInstalled=async()=>true;'
        : 'export const isThirdPartyQuenchingPaused=async()=>f.paused;'),
    }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { UIService } = module.exports;
try {
  for (const zip of ['zip-ui-20.zip', 'zip-ui-30.zip']) {
    fixture.zip = zip;
    const ui = path.join(root, '_retail_', 'ui');
    await fs.outputFile(path.join(ui, 'console', 'obsolete.dds'), 'old enhanced UI');
    await fs.outputFile(path.join(ui, 'framedef', 'obsolete.fdf'), 'old enhanced UI');
    assert.equal(await UIService.syncConfiguredUI(root), true);
    assert.equal(await fs.pathExists(path.join(ui, 'console', 'obsolete.dds')), false);
    assert.equal(await fs.pathExists(path.join(ui, 'framedef', 'obsolete.fdf')), false);
    assert((await fs.readdir(path.join(ui, 'feedback'))).length > 0);
    assert.equal((await fs.readFile(path.join(ui, '.quenching-ui-style'), 'utf8')).trim(), `${zip}:classic`);
    const extractions = fixture.extractions;
    await UIService.syncConfiguredUI(root);
    assert.equal(fixture.extractions, extractions, 'unchanged UI must not unzip again');

    // A new package may overwrite UI files while the previous marker remains.
    await fs.outputFile(path.join(ui, 'console', 'from-new-package.dds'), 'enhanced');
    await UIService.syncConfiguredUI(root, true);
    assert.equal(await fs.pathExists(path.join(ui, 'console', 'from-new-package.dds')), false);
  }
  fixture.settings.ui = 'quenching';
  await UIService.syncConfiguredUI(root);
  assert((await fs.readdir(path.join(root, '_retail_', 'ui', 'console'))).length > 0);
  fixture.channel = 'ptr';
  fixture.settings = {};
  await fs.ensureDir(path.join(root, '_ptr_'));
  await UIService.syncConfiguredUI(root);
  assert.equal((await fs.readFile(path.join(root, '_ptr_', 'ui', '.quenching-ui-style'), 'utf8')).trim(), 'zip-ui-30.zip:classic');

  const extractions = fixture.extractions;
  fixture.enabled = false;
  assert.equal(await UIService.syncConfiguredUI(root, true), false);
  fixture.enabled = true;
  fixture.paused = true;
  assert.equal(await UIService.syncConfiguredUI(root, true), false);
  fixture.paused = false;
  fixture.settings.graphicsSelection = 'sd';
  assert.equal(await UIService.syncConfiguredUI(root, true), false);
  assert.equal(fixture.extractions, extractions);
  console.log('PASS: default classic UI is applied for 2.x/3.x and PTR; installs reapply it, repeat sync skips extraction, SD/off/third-party stay parked');
} finally {
  await fs.remove(root);
  delete (globalThis as any).__uiDefaultFixture;
}
