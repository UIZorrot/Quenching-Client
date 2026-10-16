import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
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
  const assetHashes = new Map(await Promise.all(['zip-ui-20.zip', 'zip-ui-30.zip'].map(async zip =>
    [zip, createHash('sha256').update(await fs.readFile(path.join(fixture.assets, 'quenching', zip))).digest('hex')] as const)));
  for (const zip of ['zip-ui-20.zip', 'zip-ui-30.zip']) {
    fixture.zip = zip;
    const ui = path.join(root, '_retail_', 'ui');
    await fs.outputFile(path.join(ui, 'console', 'obsolete.dds'), 'old enhanced UI');
    await fs.outputFile(path.join(ui, 'framedef', 'obsolete.fdf'), 'old enhanced UI');
    await fs.outputFile(path.join(ui, 'unknown-old-ui', 'leftover.txt'), 'discard old UI');
    await fs.ensureDir(path.join(ui, 'empty-old-ui', 'child'));
    await fs.outputFile(path.join(root, '_retail_', 'outside-ui.txt'), 'keep outside UI');
    assert.equal(await UIService.syncConfiguredUI(root), true);
    assert.equal(await fs.pathExists(path.join(ui, 'console', 'obsolete.dds')), false);
    assert.equal(await fs.pathExists(path.join(ui, 'framedef', 'obsolete.fdf')), false);
    assert.equal(await fs.pathExists(path.join(ui, 'unknown-old-ui')), false);
    assert.equal(await fs.pathExists(path.join(ui, 'empty-old-ui')), false);
    assert.equal(await fs.readFile(path.join(root, '_retail_', 'outside-ui.txt'), 'utf8'), 'keep outside UI');
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
  fixture.enabled = false;
  const countWhileOff = fixture.extractions;
  assert.equal(await UIService.applyUISettings(root, 'quenching'), false, 'direct UI changes must not recreate resources while MOD is off');
  assert.equal(fixture.extractions, countWhileOff);
  fixture.enabled = true;
  await UIService.syncConfiguredUI(root);
  assert((await fs.readdir(path.join(root, '_retail_', 'ui', 'console'))).length > 0);
  fixture.channel = 'ptr';
  fixture.settings = {};
  await fs.ensureDir(path.join(root, '_ptr_'));
  await fs.outputFile(path.join(root, '_retail_', 'ui', 'other-branch.txt'), 'keep Retail UI');
  await fs.outputFile(path.join(root, '_ptr_', 'ui', 'unknown-old-ui.txt'), 'discard PTR UI');
  await UIService.syncConfiguredUI(root);
  assert.equal((await fs.readFile(path.join(root, '_ptr_', 'ui', '.quenching-ui-style'), 'utf8')).trim(), 'zip-ui-30.zip:classic');
  assert.equal(await fs.pathExists(path.join(root, '_ptr_', 'ui', 'unknown-old-ui.txt')), false);
  assert.equal(await fs.readFile(path.join(root, '_retail_', 'ui', 'other-branch.txt'), 'utf8'), 'keep Retail UI');

  // Invalid client UI assets must fail before resetting the installed UI.
  const ptrUi = path.join(root, '_ptr_', 'ui');
  await fs.outputFile(path.join(ptrUi, 'before-invalid-zip.txt'), 'keep existing UI');
  fixture.zip = 'missing-ui.zip';
  await assert.rejects(UIService.syncConfiguredUI(root, true), /missing-ui.zip not found/);
  assert.equal(await fs.readFile(path.join(ptrUi, 'before-invalid-zip.txt'), 'utf8'), 'keep existing UI');
  fixture.zip = 'zip-ui-30.zip';

  fixture.settings.ui = 'carnival';
  await UIService.syncConfiguredUI(root, true);
  assert.equal(await fs.pathExists(path.join(ptrUi, 'before-invalid-zip.txt')), false);
  assert.equal((await fs.readFile(path.join(ptrUi, '.quenching-ui-style'), 'utf8')).trim(), 'zip-ui-30.zip:carnival');

  // Full UI replacement must still use classic-compatible feedback when requested.
  fixture.settings.classicMode = true;
  await UIService.applyUISettings(root, 'quenching');
  const baseline = path.join(root, 'ui-assets-baseline');
  await extractZipArchive(path.join(fixture.assets, 'quenching', fixture.zip), baseline);
  const checkFeedback = async (source: string, target: string): Promise<void> => {
    assert.deepEqual((await fs.readdir(target)).sort(), (await fs.readdir(source)).sort());
    for (const entry of await fs.readdir(source, { withFileTypes: true })) {
      const from = path.join(source, entry.name), to = path.join(target, entry.name);
      if (entry.isDirectory()) await checkFeedback(from, to);
      else assert.deepEqual(await fs.readFile(to), await fs.readFile(from));
    }
  };
  await checkFeedback(path.join(baseline, 'ui-org', 'feedback'), path.join(ptrUi, 'feedback'));
  fixture.settings.classicMode = false;

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
  for (const [zip, hash] of assetHashes) {
    assert.equal(createHash('sha256').update(await fs.readFile(path.join(fixture.assets, 'quenching', zip))).digest('hex'), hash,
      'client source assets must remain unchanged');
  }
  console.log('PASS: UI resets from client assets for 2.x/3.x and PTR; invalid assets preserve UI, sibling branch/outside files stay intact, repeat sync skips extraction, SD/off/third-party stay parked');
} finally {
  await fs.remove(root);
  delete (globalThis as any).__uiDefaultFixture;
}
