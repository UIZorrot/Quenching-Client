import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parsePreviewModel } from '../src/Renderer/model-preview/parse-model';
import { resourceCandidates } from '../src/Main/services/model-resource-service';
const require = createRequire(import.meta.url);
const Model = require('mdx-m3-viewer/dist/cjs/parsers/mdlx/model').default;
const Geoset = require('mdx-m3-viewer/dist/cjs/parsers/mdlx/geoset').default;
const Material = require('mdx-m3-viewer/dist/cjs/parsers/mdlx/material').default;
const Layer = require('mdx-m3-viewer/dist/cjs/parsers/mdlx/layer').default;
const setupGeosets = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/setupgeosets').default;
const ViewerGeoset = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/geoset').default;
const hdFragment = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/shaders/hd.frag').default as string;
assert.match(hdFragment, /mix\(0\.7, 1\.0, aoFactor\)/, 'DE preview shader needs an AO-independent fill');
const sdFragment = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/shaders/sd.frag').default as string;
assert.match(sdFragment, /color\.a \*= intensity/, 'SD additive effects must not leave opaque-black polygons');

const candidate = resourceCandidates({ path: 'Units/Human/Footman/footman_Diffuse.tif',
  basePath: 'casc://war3.w3mod:_de.w3mod:units\\human\\footman\\footman.mdx' });
assert.equal(candidate.casc[0], 'war3.w3mod:_de.w3mod:Units\\Human\\Footman\\footman_Diffuse.dds');
assert(!candidate.casc.some(p => p.includes('_hd.w3mod')));
assert.equal(resourceCandidates({ path: 'units/test.mdx', artSet: 'de' }).casc.length, 1,
  'missing DE models must not masquerade as SD models');
for (const invalid of ['../secret.dds', 'units/../../x.dds', '/root.dds', 'C:/secret.dds', 'foo.exe'])
  assert.throws(() => resourceCandidates({ path: invalid }));

// Old external MDX remains readable, including classic models without LOD/SKIN.
for (const version of [800, 1000]) {
  const m = new Model(); m.version = version;
  const mat = new Material(); mat.layers.push(new Layer()); m.materials.push(mat);
  const geo = new Geoset(); geo.vertices = new Float32Array([0, 0, 0]); geo.normals = new Float32Array([0, 0, 1]);
  geo.uvSets = [new Float32Array([0, 0])]; geo.faceTypeGroups = new Uint32Array([4]); m.geosets.push(geo);
  const bytes = m.saveMdx(), parsed = parsePreviewModel(bytes);
  assert.equal(parsed.version, version); assert.equal(parsed.geosets.length, 1);
  assert.throws(() => parsePreviewModel(bytes.subarray(0, bytes.length - 1)));
}

// Exercise the actual patched upload/bind code, not a duplicate implementation.
const uploads: ArrayBufferView[] = [], attributes: any[][] = [];
const gl = { UNSIGNED_BYTE: 5121, UNSIGNED_SHORT: 5123, createBuffer: () => ({}), bindBuffer() {}, bufferData() {},
  bufferSubData(_target: number, _offset: number, data: ArrayBufferView) { uploads.push(data); },
  vertexAttribPointer(...args: any[]) { attributes.push(args); } };
const gpuModel: any = { viewer: { gl }, bones: [], geosetAnimations: [], geosets: [], batches: [],
  materials: [{ shader: 'Shader_HD_DefaultUnit', layers: [{}] }] };
const wideGeo = new Geoset(); wideGeo.lod = 0; wideGeo.vertices = new Float32Array(3);
wideGeo.normals = new Float32Array(3); wideGeo.uvSets = [new Float32Array(2)]; wideGeo.tangents = new Float32Array(4);
wideGeo.skin = new Uint16Array([365, 0, 0, 0, 255, 0, 0, 0]); wideGeo.faceTypeGroups = new Uint32Array([4]);
setupGeosets(gpuModel, [wideGeo]);
const uploaded = uploads.find(a => a instanceof Uint16Array && a.length === 8) as Uint16Array;
assert.equal(uploaded[0], 365); assert.equal(uploaded[4], 65535);
assert.equal(wideGeo.skin[4], 255, 'must not mutate source weights');
ViewerGeoset.prototype.bindSkin.call({ model: gpuModel, skinOffset: 32 }, gl, { a_bones: 1, a_weights: 2 });
assert.deepEqual(attributes, [[1, 4, 5123, false, 16, 32], [2, 4, 5123, true, 16, 40]]);
gpuModel.materials[0].layers = Array.from({ length: 12 }, () => ({}));
gpuModel.batches = []; gpuModel.geosets = [];
setupGeosets(gpuModel, [wideGeo]);
assert.equal(gpuModel.batches.length, 2, 'multi-layer HD material must produce two passes');

// A modern animated normal binding stores zero in its slot field; its position
// disambiguates it from diffuse. No official asset needed for this regression.
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
const animatedSlot = (texture: number) => Buffer.concat([u32(texture), u32(0), Buffer.from('KMTF'),
  u32(1), u32(0), u32(0xffffffff), u32(0), u32(texture)]);
const slots = Buffer.concat([animatedSlot(3), animatedSlot(4), ...[2, 3, 4, 5].map(i => Buffer.concat([u32(i), u32(i)]))]);
const baseLayer = Buffer.alloc(60); baseLayer.writeUInt32LE(baseLayer.length + slots.length, 0);
baseLayer.writeUInt32LE(1, 52); baseLayer.writeUInt32LE(6, 56);
const materialHeader = Buffer.concat([u32(20 + baseLayer.length + slots.length), Buffer.alloc(8), Buffer.from('LAYS'), u32(1)]);
const materialBytes = Buffer.concat([materialHeader, baseLayer, slots]);
const modernModel = Buffer.concat([Buffer.from('MDLXVERS'), u32(4), u32(1800), Buffer.from('MTLS'), u32(materialBytes.length), materialBytes]);
const animated = parsePreviewModel(modernModel);
assert.equal(animated.materials[0].layers[0].textureId, 3);
assert.equal(animated.materials[0].layers[1].textureId, 4);
assert.equal(animated.materials[0].layers[1].animations[0].name, 'KMTF');

let real = 0;
const manifestPath = process.argv[2];
if (manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const sample of manifest.samples) {
    const bytes = fs.readFileSync(path.join(path.dirname(manifestPath), sample.file));
    const parsed = parsePreviewModel(bytes);
    assert(parsed.geosets.length > 0, sample.name);
    assert.equal(parsed.version, sample.mdx.version);
    const geometries = sample.mdx.chunks.find((c: any) => c.tag === 'GEOS').records;
    assert.equal(parsed.geosets.length, geometries.length);
    parsed.geosets.forEach((g: any, i: number) => {
      assert.equal(g.vertices.length / 3, geometries[i].layout.vertices);
      if (geometries[i].layout.skin_element_bytes === 2) assert(g.skin instanceof Uint16Array);
    });
    for (const material of parsed.materials) for (const layer of material.layers)
      assert(layer.textureId >= 0 && layer.textureId < parsed.textures.length, sample.name);
    real++;
  }
}
console.log(JSON.stringify({ synthetic: 'PASS (resource paths, legacy models, truncation, 16-bit GPU upload/binding)', realModels: real }));
