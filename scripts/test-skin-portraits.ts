import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { associatePortrait } from '../src/Main/services/skin-portrait';
import { parseSkinSections, writeVersionSkins } from '../src/shared/skin-versions';

const model = (texture: string, camera = false) => {
  const tex = Buffer.alloc(268); tex.write(texture, 4);
  const chunk = (tag: string, data: Buffer) => { const header = Buffer.alloc(8); header.write(tag); header.writeUInt32LE(data.length, 4); return Buffer.concat([header, data]); };
  return Buffer.concat([Buffer.from('MDLX'), chunk('TEXS', tex), ...(camera ? [chunk('CAMS', Buffer.alloc(4))] : [])]);
};
const source = 'Units/Orc/Samuro/Samuro';
const original = 'Units/Orc/HeroBladeMaster/HeroBladeMaster_portrait';
const bad = source + '_portrait.mdx';
const files = new Map([[original, model('valid.dds')], [bad, model('missing.dds')], [source, model('valid.dds')],
  ['self.mdx', model('valid.dds', true)], ['manual.mdx', model('valid.dds')]]);
const resources = { read: async (name: string) => { const bytes = files.get(name); if (!bytes) throw new Error('missing'); return { bytes, resolvedPath: name }; },
  exists: async (name: string) => name === 'valid.dds' };
const baseline = { Obla: { file: 'Units/Orc/HeroBladeMaster/HeroBladeMaster' }, Osam: { 'file:de': source, 'portrait:de': original } };
assert.equal((await associatePortrait(baseline, 'Obla', 'de', source, resources)).path, original);
assert.equal((await associatePortrait(baseline, 'Obla', 'de', source, resources)).source, 'official');
assert.equal((await associatePortrait({}, 'Obla', 'hd', source, resources)).source, 'unavailable', 'Never borrow the DE association for HD');
const fallback = await associatePortrait({ Obla: { portrait: original } }, 'Obla', 'de', source, resources);
assert.equal(fallback.source, 'fallback'); assert.equal(fallback.path, original);
assert.deepEqual(fallback.rejected[0], { path: bad, missing: ['missing.dds'] });
assert.equal((await associatePortrait({}, 'Obla', 'de', 'self.mdx', resources)).source, 'model');
assert.equal((await associatePortrait(baseline, 'Obla', 'de', source, resources, 'manual.mdx')).source, 'manual');
await assert.rejects(associatePortrait(baseline, 'Obla', 'de', source, resources, bad), /missing.dds/);
files.set('custom_portrait.mdx', model('valid.dds'));
assert.equal((await associatePortrait({}, 'Obla', 'sd', 'custom', resources)).source, 'companion');

let text = '[Obla]\nfile=original\n';
for (const mode of ['sd', 'hd', 'de'] as const) {
  text = writeVersionSkins(text, baseline, mode, [{ unitId: 'Obla', skinId: mode, changes: [{ field: 'portrait', value: `${mode}-portrait` }] }]);
}
assert.deepEqual(['sd', 'hd', 'de'].map(mode => parseSkinSections(text).Obla[`portrait:${mode}`]), ['sd-portrait', 'hd-portrait', 'de-portrait']);
text = writeVersionSkins(text, baseline, 'de', [{ unitId: 'Obla', skinId: 'original', changes: [] }]);
assert.equal(parseSkinSections(text).Obla['portrait:de'], undefined, 'Original without explicit portrait restores native automatic lookup');
assert.equal(parseSkinSections(text).Obla['portrait:hd'], 'hd-portrait');
const qualified = '[Osam]\nportrait:de:melee=broken\nportrait:hd=keep\n';
const restored = parseSkinSections(writeVersionSkins(qualified, baseline, 'de', [{ unitId: 'Osam', skinId: 'original', changes: [] }])).Osam;
assert.equal(restored['portrait:de'], original); assert.equal(restored['portrait:de:melee'], undefined); assert.equal(restored['portrait:hd'], 'keep');

if (process.argv[2]) {
  const root = process.argv[2];
  const bundle = await build({ stdin: { contents: 'export {ModelResourceService} from "./src/Main/services/model-resource-service";', resolveDir: process.cwd(), loader: 'ts' },
    platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
    plugins: [{ name: 'read-only-branch', setup(plugin) {
      plugin.onResolve({ filter: /\/game-channel$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const getSelectedGameFolder=()=>"_retail_";' }));
    } }] });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  const reader = new module.exports.ModelResourceService();
  try {
    const { Storage } = await import('@jamiephan/casclib'); const storage = new Storage(); storage.open(root + '*w3');
    let stock;
    try { const file = storage.openFile('war3.w3mod:units\\unitskin.txt'); try { stock = parseSkinSections(file.readAll().toString('utf8')); } finally { file.close(); } }
    finally { storage.close(); }
    const game = { read: (name: string) => reader.read({ path: name, artSet: 'de' }, root),
      exists: (name: string, basePath: string) => reader.exists({ path: name, basePath, artSet: 'de' }, root) };
    const association = await associatePortrait(stock, 'Obla', 'de', source, game);
    assert.equal(association.path?.toLowerCase().replace(/\\/g, '/'), original.toLowerCase());
    await assert.rejects(associatePortrait(stock, 'Obla', 'de', source, game, bad), /BladeMaster_Diffuse/);
    console.log(JSON.stringify({ realDE: association }));
  } finally { reader.close(); }
}
console.log('PASS: official/source-unit portrait matching, dependency checks, manual rejection, companion/camera/fallback, per-version reset; stock resources remain read-only.');
