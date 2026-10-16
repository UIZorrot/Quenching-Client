import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { setBranchModEnabledOnDisk } from '../src/Main/services/branch-mod-toggle';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-custom-icons-'));
const bundle = await build({
  entryPoints: ['src/Main/services/custom-skin-icons.ts'], platform: 'node', format: 'cjs',
  packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'native-image-fixture', setup(plugin) {
    plugin.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents:
      'export const nativeImage={createFromPath:()=>({isEmpty:()=>false,getSize:()=>({width:1,height:1}),toBitmap:()=>Buffer.from([10,20,30,255])})};' }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { installCustomIconPair, removeCustomIconPair } = module.exports;
const gameFile = (relative: string) => path.join(root, '_retail_', relative.replace(/\\/g, '/'));
try {
  const source = path.join(root, 'source');
  const normal = path.join(source, 'BTN.blp');
  const disabled = path.join(source, 'different-name.blp');
  await fs.outputFile(normal, 'normal BLP bytes'); await fs.outputFile(disabled, 'disabled BLP bytes');
  const files = await installCustomIconPair(path.join(root, '_retail_'), 'skin-one', normal, disabled);
  assert.match(files.enabled, /^ReplaceableTextures\\CommandButtons\\BTNQCustom_[a-f0-9]{24}\.blp$/);
  assert.equal(files.disabled, files.enabled.replace('CommandButtons\\', 'CommandButtonsDisabled\\DIS'));
  assert.equal(await fs.readFile(gameFile(files.enabled), 'utf8'), 'normal BLP bytes');
  assert.equal(await fs.readFile(gameFile(files.disabled), 'utf8'), 'disabled BLP bytes');
  const other = await installCustomIconPair(path.join(root, '_retail_'), 'skin-two', normal, disabled);
  assert.notEqual(other.enabled, files.enabled, 'skins with identical source names must not collide');

  const tga = Buffer.alloc(22); tga[2] = 2; tga.writeUInt16LE(1, 12); tga.writeUInt16LE(1, 14);
  tga[16] = 32; tga[17] = 0x28; tga.set([40, 50, 60, 255], 18);
  const inactiveTga = path.join(source, 'DISBTN.tga'); await fs.outputFile(inactiveTga, tga);
  const png = path.join(source, 'BTN.png'); await fs.outputFile(png, 'native image fixture');
  const mixed = await installCustomIconPair(path.join(root, '_retail_'), 'mixed', png, inactiveTga);
  assert(mixed.enabled.endsWith('.tga') && mixed.disabled.endsWith('.tga'), 'mixed input extensions share a game-readable extension');
  assert.deepEqual((await fs.readFile(gameFile(mixed.enabled))).subarray(18), Buffer.from([10, 20, 30, 255]));
  assert.deepEqual((await fs.readFile(gameFile(mixed.disabled))).subarray(18), tga.subarray(18));
  // Convert a real indexed BLP1 with alpha, even when it comes from a pooled Buffer.
  const blp = Buffer.alloc(1184); blp.write('BLP1'); blp.writeUInt32LE(1, 4); blp.writeUInt32LE(8, 8);
  blp.writeUInt32LE(1, 12); blp.writeUInt32LE(1, 16); blp.writeUInt32LE(1180, 28); blp.writeUInt32LE(2, 92);
  blp.set([7, 8, 9, 255], 156); blp[1180] = 0; blp[1181] = 128;
  const indexedBlp = path.join(source, 'indexed.blp'); await fs.outputFile(indexedBlp, blp);
  const convertedBlp = await installCustomIconPair(path.join(root, '_retail_'), 'indexed', indexedBlp, inactiveTga);
  assert.deepEqual((await fs.readFile(gameFile(convertedBlp.enabled))).subarray(18), Buffer.from([7, 8, 9, 128]));

  await setBranchModEnabledOnDisk(path.join(root, '_retail_'), false);
  assert.equal(await fs.pathExists(gameFile(files.enabled)), false);
  assert.equal(await fs.pathExists(gameFile(files.disabled)), false);
  await removeCustomIconPair(path.join(root, '_retail_'), 'skin-one');
  await setBranchModEnabledOnDisk(path.join(root, '_retail_'), true);
  assert.equal(await fs.pathExists(gameFile(files.enabled)), false, 'deleted icons must not reappear after enabling');
  assert.equal(await fs.readFile(gameFile(other.disabled), 'utf8'), 'disabled BLP bytes');

  await setBranchModEnabledOnDisk(path.join(root, '_retail_'), false);
  const addedWhileOff = await installCustomIconPair(path.join(root, '_retail_', 'QMoff'), 'off-import', normal, disabled);
  await setBranchModEnabledOnDisk(path.join(root, '_retail_'), true);
  assert.equal(await fs.readFile(gameFile(addedWhileOff.disabled), 'utf8'), 'disabled BLP bytes');
  assert.equal(await fs.readFile(normal, 'utf8'), 'normal BLP bytes');
  assert.equal(await fs.readFile(disabled, 'utf8'), 'disabled BLP bytes');
  console.log('PASS: BTN/DISBTN pairing, format conversion, unique names, source preservation, MOD off/on and parked deletion');
} finally {
  assert.equal(path.dirname(root), os.tmpdir());
  assert(path.basename(root).startsWith('quenching-custom-icons-'));
  await fs.remove(root);
}
