import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Storage } from '@jamiephan/casclib';
import { SKIN_CONFIG, CUSTOM_SKIN_CONFIG } from '../src/Renderer/assets/data/skin-config';
import { builtInSkins, skinTargets } from '../src/Renderer/assets/data/skin-panel-catalog';
import { originalSkin, parseSkinSections, writeVersionSkins } from '../src/shared/skin-versions';
import { parsePreviewModel } from '../src/Renderer/model-preview/parse-model';

const unitId = 'Npal';
const hero = SKIN_CONFIG.neutral.heroes.find(hero => hero.unitId === unitId)!;
assert(hero, 'Forsaken Paladin belongs to the neutral tavern roster');
assert.equal(hero.id, 'forsakenpaladin');
assert(CUSTOM_SKIN_CONFIG.neutral.units.some(unit => unit.unitId === unitId));
assert.equal(skinTargets('neutral', 'hero').filter(target => target.unitId === unitId).length, 1);
for (const race of ['hum', 'orc', 'ud', 'ne']) assert(!skinTargets(race, 'hero').some(target => target.unitId === unitId));
assert(!skinTargets('neutral', 'unit').some(target => target.unitId === unitId));
assert(!skinTargets('neutral', 'building').some(target => target.unitId === unitId));

// Reproduce the new SD material layout without shipping an official model.
// Two type-2 single-map layers retain their cutout/blend filter modes and alpha.
const u32 = (value: number) => { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(value >>> 0); return bytes; };
const makeLayer = (filter: number, alpha: number, texture: number, shaderType = 2, slots = 1) => {
  const header = Buffer.alloc(60); header.writeUInt32LE(60 + slots * 8);
  header.writeUInt32LE(filter, 4); header.writeUInt32LE(16, 8); header.writeInt32LE(-1, 16);
  header.writeFloatLE(alpha, 24); header.writeUInt32LE(shaderType, 52); header.writeUInt32LE(slots, 56);
  return Buffer.concat([header, ...Array.from({ length: slots }, (_, slot) => Buffer.concat([u32(texture), u32(slot)]))]);
};
const makeModel = (layers: Buffer[]) => {
  const material = Buffer.concat([u32(20 + layers.reduce((bytes, layer) => bytes + layer.length, 0)),
    Buffer.alloc(8), Buffer.from('LAYS'), u32(layers.length), ...layers]);
  return Buffer.concat([Buffer.from('MDLXVERS'), u32(4), u32(1800), Buffer.from('MTLS'), u32(material.length), material]);
};
const sdMaterial = parsePreviewModel(makeModel([makeLayer(1, 1, 0), makeLayer(2, 0.75, 1)])).materials[0];
assert.notEqual(sdMaterial.shader, 'Shader_HD_DefaultUnit');
assert.deepEqual(sdMaterial.layers.map(layer => ({ filter: layer.filterMode, alpha: layer.alpha, texture: layer.textureId, flags: layer.flags })),
  [{ filter: 1, alpha: 1, texture: 0, flags: 16 }, { filter: 2, alpha: 0.75, texture: 1, flags: 16 }]);
assert.throws(() => parsePreviewModel(makeModel([makeLayer(1, 1, 0, 3)])), /unsupported texture slot table/);
assert.throws(() => parsePreviewModel(makeModel([makeLayer(1, 1, 0, 2, 2)])), /unsupported type-2 texture slot table/);

// Weighted SKIN is independent of SD/HD material shading. The 3.0 SD hero
// needs a weighted SD shader and weights, not the legacy vertex-group count.
const require = createRequire(import.meta.url);
const handler = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/handler').default;
const { SkinningType } = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/batch');
const { DebugRenderMode } = require('mdx-m3-viewer/dist/cjs/viewer/viewer');
const ViewerGeoset = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/geoset').default;
const sdVertex = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/shaders/sd.vert').default;
assert.match(sdVertex, /#ifdef SKIN[\s\S]*transformSkin\(position, normal, tangent, binormal\)/);
const shaderCache = { sdSkinShader: {}, sdShader: {}, sdExtendedShader: {}, hdSkinShader: {},
  sdDebugShaders: { [SkinningType.Skin]: { [DebugRenderMode.Normals]: {} } } };
const viewer = { sharedCache: new Map([['mdx', shaderCache]]), debugRenderMode: DebugRenderMode.None };
assert.equal(handler.getBatchShader(viewer, SkinningType.Skin, false), shaderCache.sdSkinShader);
assert.equal(handler.getBatchShader(viewer, SkinningType.VertexGroups, false), shaderCache.sdShader);
assert.equal(handler.getBatchShader(viewer, SkinningType.ExtendedVertexGroups, false), shaderCache.sdExtendedShader);
assert.equal(handler.getBatchShader(viewer, SkinningType.Skin, true), shaderCache.hdSkinShader);
viewer.debugRenderMode = DebugRenderMode.Normals;
assert.equal(handler.getBatchShader(viewer, SkinningType.Skin, false), shaderCache.sdDebugShaders[SkinningType.Skin][DebugRenderMode.Normals]);
const attributes: unknown[][] = [];
const gl = { FLOAT: 5126, vertexAttribPointer(...args: unknown[]) { attributes.push(args); } };
const geoset = Object.assign(Object.create(ViewerGeoset.prototype), {
  model: { viewer: { gl }, skinDataType: 5123, bytesPerSkinElement: 2 },
  positionOffset: 0, normalOffset: 12, uvOffset: 24, vertices: 1, skinOffset: 32,
});
geoset.bindSdSkin({ attribs: { a_position: 0, a_normal: 1, a_uv: 2, a_bones: 3, a_weights: 4 } }, 0);
assert.deepEqual(attributes.slice(-2), [[3, 4, 5123, false, 16, 32], [4, 4, 5123, true, 16, 40]]);

const icon = fs.readFileSync(path.join('public', 'assets', 'quenching', hero.icon));
assert.equal(icon.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(icon.readUInt32BE(16), 64); assert.equal(icon.readUInt32BE(20), 64);
assert(icon.length < 32 * 1024, 'Only the compact command-button icon may be bundled');

let content = '';
const originalFile = 'Units\\Creeps\\HeroForsakenPaladin\\HeroForsakenPaladin';
const originalArt = 'ReplaceableTextures\\CommandButtons\\BTNForsakenPaladin.blp';
for (const artSet of ['sd', 'hd', 'de'] as const) {
  const template = fs.readFileSync(path.join('assets', 'quenching', 'skin',
    artSet === 'hd' ? 'unitskin-new.txt' : `unitskin-${artSet}.txt`), 'utf8');
  const baseline = parseSkinSections(template);
  assert(baseline[unitId], `${artSet} fallback template includes the new hero`);
  const original = Object.fromEntries(originalSkin(baseline[unitId], artSet).map(change => [change.field, change.value]));
  assert.equal(original.file, originalFile); assert.equal(original.Art, originalArt);
  assert.equal(original.unitSound, 'HeroForsakenPaladin');
  assert.equal(builtInSkins('neutral', unitId, artSet).length, 0, 'No invented alternate skins; players can add their own');
  content = writeVersionSkins(content, baseline, artSet, [{ unitId, skinId: `${artSet}-custom`,
    changes: [{ field: 'file', value: `cos/custom/${artSet}/heroes/Npal/model.mdx` }] }]);
  for (const mode of ['sd', 'hd', 'de']) {
    const previous = parseSkinSections(content)[unitId][`file:${mode}`];
    if (previous) assert.equal(previous, `cos/custom/${mode}/heroes/Npal/model.mdx`, 'Selected art sets remain isolated');
  }
  const reset = parseSkinSections(writeVersionSkins(content, baseline, artSet, [{ unitId, skinId: 'original', changes: [] }]));
  assert.equal(reset[unitId][`file:${artSet}`], originalFile);
}

// Optional read-only checks against a 3.0 installation. No models are extracted.
if (process.argv[2]) {
  const storage = new Storage(); storage.open(`${process.argv[2]}*w3`);
  try {
    for (const artSet of ['sd', 'hd', 'de']) {
      const prefix = `war3.w3mod:${artSet === 'sd' ? '' : `_${artSet}.w3mod:`}`;
      const file = storage.openFile(`${prefix}${originalFile}.mdx`);
      let parsed;
      try { parsed = parsePreviewModel(new Uint8Array(file.readAll())); } finally { file.close(); }
      assert(parsed.geosets.length && parsed.sequences.some(sequence => /^stand/i.test(sequence.name)));
      if (artSet === 'sd') assert(parsed.geosets.some(geoset => geoset.skin.length > 0), 'Exercise weighted SD skinning');
      const artExists = [prefix, 'war3.w3mod:'].some(layer => storage.fileExists(layer + originalArt)
        || storage.fileExists(layer + originalArt.replace(/\.blp$/, '.dds')));
      assert(artExists, `${artSet} command-button icon must exist`);
      console.log(JSON.stringify({ artSet, version: parsed.version, geosets: parsed.geosets.length }));
    }
  } finally { storage.close(); }
}
console.log('PASS: neutral tavern Npal, compact icon, SD/HD/DE originals, isolated custom choices and reset.');
