import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { build } from 'esbuild';

const bundled = await build({
  stdin: { contents: 'export { ModelResourceService } from "./src/Main/services/model-resource-service";', resolveDir: process.cwd(), loader: 'ts' },
  platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'selected-branch-fixture', setup(plugin) {
    plugin.onResolve({ filter: /\/game-channel$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const getSelectedGameFolder = () => "_retail_";' }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-model-layers-'));
const files = new Map([
  ['war3.w3mod:units\\human\\model.mdx', Buffer.from('classic-model')],
  ['war3.w3mod:textures\\shared.blp', Buffer.from('classic-texture')],
  ['war3.w3mod:_hd.w3mod:textures\\shared.blp', Buffer.from('hd-texture')],
  ['war3.w3mod:_de.w3mod:textures\\shared.blp', Buffer.from('de-texture')],
]);
let opens = 0;
const service = new module.exports.ModelResourceService(() => ({
  open() { opens++; }, close() {}, fileExists(name: string) { return files.has(name); },
  openFile(name: string) { const bytes = files.get(name)!; return { getSize64: () => bytes.length, readAll: () => bytes, close() {} }; },
}));
try {
  const retail = path.join(fixture, '_retail_');
  await fs.outputFile(path.join(retail, 'units/human/model.mdx'), 'loose-hd-model');
  await fs.outputFile(path.join(retail, 'textures/shared.blp'), 'loose-hd-texture');
  const model = await service.read({ path: 'units/human/model.mdl', artSet: 'sd' }, fixture);
  assert.equal(model.bytes.toString(), 'classic-model');
  const classic = await service.read({ path: 'textures/shared.blp', basePath: model.resolvedPath, artSet: 'sd' }, fixture);
  assert.equal(classic.bytes.toString(), 'classic-texture');
  const explicit = await service.read({ path: 'casc://war3.w3mod:_hd.w3mod:textures/shared.blp' }, fixture);
  assert.equal(explicit.bytes.toString(), 'hd-texture', 'an explicit CASC path must not read a loose replacement');
  for (const artSet of ['hd', 'de']) {
    const texture = await service.read({ path: 'textures/shared.blp', basePath: `casc://war3.w3mod:_${artSet}.w3mod:units\\human\\model.mdx`, artSet }, fixture);
    assert.equal(texture.bytes.toString(), `${artSet}-texture`, 'CASC previews must not borrow loose files from another art set');
  }
  await fs.outputFile(path.join(retail, 'cos/custom/sd/units/hfoo/test/model.mdx'), 'imported-model');
  await fs.outputFile(path.join(retail, 'cos/custom/sd/units/hfoo/test/textures/shared.blp'), 'imported-texture');
  const imported = await service.read({ path: 'cos/custom/sd/units/hfoo/test/model.mdx', artSet: 'sd' }, fixture);
  assert.equal(imported.bytes.toString(), 'imported-model');
  const importedTexture = await service.read({ path: 'textures/shared.blp', basePath: imported.resolvedPath, artSet: 'sd' }, fixture);
  assert.equal(importedTexture.bytes.toString(), 'imported-texture');
  assert.equal(opens, 1, 'texture reads reuse the CASC handle');
  service.close();
  await Promise.all(Array.from({ length: 8 }, () => service.read({ path: 'casc://war3.w3mod:textures/shared.blp' }, fixture)));
  assert.equal(opens, 2, 'parallel texture requests must share a single new CASC handle');
  console.log('PASS: SD/CASC art-set isolation, HD/DE texture provenance and imported skin textures');
} finally {
  service.close();
  assert.equal(path.dirname(fixture), os.tmpdir());
  assert.ok(path.basename(fixture).startsWith('quenching-model-layers-'));
  await fs.remove(fixture);
}
