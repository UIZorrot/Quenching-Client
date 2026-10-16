import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { Storage } from '@jamiephan/casclib';
import { openGameCascStorage } from '../src/Main/services/casc-storage';

const gamePath = process.argv[2];
if (!gamePath || !path.isAbsolute(gamePath)) throw new Error('Usage: tsx scripts/test-custom-skin-native-search.ts ABSOLUTE_GAME_ROOT');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-native-skin-search-'));
const storage = new Storage();
let releasePath: (() => void) | undefined;
try {
  const bundled = await build({
    stdin: { contents: `export { customSkinService } from './src/Main/services/custom-skin-service';
      export { ModelResourceService } from './src/Main/services/model-resource-service';
      export { modelTextureReferences } from './src/Main/services/custom-model-textures';`, resolveDir: process.cwd(), loader: 'ts' },
    platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
    plugins: [{ name: 'read-only-game-fixture', setup(plugin) {
      plugin.onResolve({ filter: /\/(?:config-manager|game-channel|version-skin-service)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents:
        args.path.endsWith('config-manager') ? `export const configManager={get:k=>k==='war3Path'?${JSON.stringify(gamePath)}:[],set(){throw new Error('Read-only test')}};`
        : args.path.endsWith('game-channel') ? `export const getSelectedGameFolder=()=>'_retail_';`
        : `export const versionSkinService={};` }));
    } }],
  });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  releasePath = (await openGameCascStorage(storage, gamePath)).release;
  for (const artSet of ['sd', 'hd', 'de']) {
    const prefix = artSet === 'sd' ? 'war3.w3mod:' : `war3.w3mod:_${artSet}.w3mod:`;
    const modelPath = prefix + 'units\\human\\footman\\footman.mdx';
    if (!storage.fileExists(modelPath)) { console.log(`SKIP ${artSet}: no stock Footman in this installation`); continue; }
    const file = storage.openFile(modelPath);
    let data: Buffer;
    try { data = file.readAll(); } finally { file.close(); }
    const dir = path.join(temporary, artSet);
    const model = path.join(dir, 'footman.mdx');
    await fs.outputFile(model, data);
    const inspection = await module.exports.customSkinService.inspectExternalModel(model, artSet);
    assert(inspection.references.length > 0);
    assert.equal(inspection.unresolved.length, 0, `Stock ${artSet} dependencies: ${inspection.unresolved.join(', ')}`);
    assert.equal(inspection.gameReferences.length, inspection.references.length, 'all stock references resolved without exporting textures');
    assert.deepEqual(await fs.readFile(model), data, 'search never changes the model');
    console.log(`PASS native ${artSet}: ${inspection.references.length} Warcraft dependencies auto-linked; original model unchanged.`);
    if (artSet !== 'sd') {
      const hiveModel = path.join(dir, 'hive-stock-textures.mdl');
      await fs.outputFile(hiveModel, `Textures 3 {
        Bitmap { Image "EnvironmentMap.blp", }
        Bitmap { Image "Textures\\EnvironmentMap.blp", }
        Bitmap { Image "war3mapImported\\EnvironmentMap.blp", }
      }`);
      const hive = await module.exports.customSkinService.inspectExternalModel(hiveModel, artSet);
      assert.deepEqual(hive.unresolved, []);
      for (const ref of hive.references) assert.equal(hive.gameTextureBindings[ref].toLowerCase(), 'replaceabletextures/environmentmap.dds');
      const resources = new module.exports.ModelResourceService();
      try {
        for (const ref of hive.references) {
          const resolved = await resources.read({ path: ref, artSet }, gamePath);
          assert.equal(resolved.bytes.toString('ascii', 0, 4), 'DDS ');
          assert.equal(resolved.resolvedPath.toLowerCase(), `casc://${prefix}replaceabletextures\\environmentmap.dds`);
        }
      } finally { resources.close(); }
      console.log(`PASS native ${artSet}: EnvironmentMap aliases auto-linked and DDS bytes read from the correct art set.`);
    }
  }
} finally {
  try { storage.close(); } catch {}
  releasePath?.();
  assert.equal(path.dirname(temporary), os.tmpdir());
  assert(path.basename(temporary).startsWith('quenching-native-skin-search-'));
  await fs.remove(temporary);
}
