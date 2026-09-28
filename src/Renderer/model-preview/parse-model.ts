import ModelImport from 'mdx-m3-viewer/dist/cjs/parsers/mdlx/model';
import MaterialImport from 'mdx-m3-viewer/dist/cjs/parsers/mdlx/material';
import LayerImport from 'mdx-m3-viewer/dist/cjs/parsers/mdlx/layer';
import GeosetImport from 'mdx-m3-viewer/dist/cjs/parsers/mdlx/geoset';
import ExtentImport from 'mdx-m3-viewer/dist/cjs/parsers/mdlx/extent';
import BinaryStreamImport from 'mdx-m3-viewer/dist/cjs/common/binarystream';
import animationMapImport from 'mdx-m3-viewer/dist/cjs/parsers/mdlx/animationmap';
import TextureImport from 'mdx-m3-viewer/dist/cjs/parsers/mdlx/texture';
import { cjsDefault } from './interop';
const Model = cjsDefault(ModelImport), Material = cjsDefault(MaterialImport), Layer = cjsDefault(LayerImport);
const Geoset = cjsDefault(GeosetImport), Extent = cjsDefault(ExtentImport), BinaryStream = cjsDefault(BinaryStreamImport);
const animationMap = cjsDefault(animationMapImport);
type Model = ModelImport;
type Material = MaterialImport;
type Geoset = GeosetImport;
type Layer = LayerImport;
type BinaryStream = BinaryStreamImport;

function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(`MDX: ${message}`); }
function peek(s: BinaryStream, offset = s.index) {
  return String.fromCharCode(...s.uint8array.subarray(offset, offset + 4));
}
function record(s: BinaryStream) {
  assert(s.remaining >= 4, 'truncated record');
  const start = s.index, size = s.readUint32();
  assert(size >= 4 && size <= s.byteLength - start, 'record exceeds chunk');
  s.seek(start);
  const child = s.substream(size);
  s.seek(start + size);
  return child;
}
function track(s: BinaryStream) {
  const tag = s.readBinary(4);
  const entry = animationMap[tag];
  assert(entry && s.remaining >= 12, `unknown/truncated animation ${tag}`);
  const start = s.index, count = s.readUint32(), interpolation = s.readUint32();
  assert(interpolation <= 3 && count <= s.remaining / 4, 'invalid animation count');
  s.seek(start);
  const animation = new entry[1]();
  animation.readMdx(s, tag);
  assert(s.index <= s.byteLength, 'animation exceeds layer');
  return animation;
}

function materials(s: BinaryStream, version: number, teamTexture: () => number): Material[] {
  const result: Material[] = [];
  while (s.remaining) {
    const r = record(s), material = new Material();
    r.skip(4);
    material.priorityPlane = r.readInt32(); material.flags = r.readUint32();
    const modern = peek(r) === 'LAYS' && version >= 1100;
    if (!modern) {
      r.seek(0); material.readMdx(r, version);
      assert(r.remaining === 0, 'legacy material length mismatch');
    } else {
      r.skip(4);
      const count = r.readUint32();
      assert(count <= r.remaining / 28, 'invalid layer count');
      for (let i = 0; i < count; i++) {
        const l = record(r), layer = new Layer();
        assert(l.byteLength >= 60, 'short modern layer');
        l.skip(4);
        layer.filterMode = l.readUint32(); layer.flags = l.readUint32();
        layer.textureId = l.readInt32(); layer.textureAnimationId = l.readInt32();
        layer.coordId = l.readUint32(); layer.alpha = l.readFloat32();
        layer.emissiveGain = l.readFloat32(); layer.fresnelColor = l.readFloat32Array(3);
        layer.fresnelOpacity = l.readFloat32(); layer.fresnelTeamColor = l.readFloat32();
        const shaderType = l.readUint32(), slotCount = l.readUint32();
        assert(shaderType <= 1 && slotCount > 0 && slotCount <= 6, 'unsupported texture slot table');
        const slots = new Map<number, Layer>();
        for (let j = 0; j < slotCount; j++) {
          assert(l.remaining >= 8, 'truncated texture slot');
          const textureId = l.readInt32(), storedSlot = l.readUint32();
          // Animated bindings in shipped DE models write a zero placeholder in
          // this field (including the normal slot); their table position is the slot.
          const animated = peek(l) === 'KMTF';
          const slot = animated && storedSlot === 0 ? j : storedSlot;
          assert(slot < 6 && !slots.has(slot), 'invalid/duplicate texture slot');
          const binding = Object.assign(new Layer(), layer, { textureId, animations: [] });
          if (animated) binding.animations.push(track(l));
          slots.set(slot, binding);
        }
        while (l.remaining) layer.animations.push(track(l));
        assert(slots.has(0), 'missing diffuse slot');
        const diffuse = slots.get(0)!;
        diffuse.animations.push(...layer.animations);
        if (shaderType === 1) {
          // Frost Wyrm portrait omits the team-color binding but keeps all PBR maps.
          if (slots.size === 5 && !slots.has(4)) slots.set(4, Object.assign(new Layer(), { textureId: teamTexture() }));
          assert(slots.size === 6, 'incomplete HD material');
          material.shader = 'Shader_HD_DefaultUnit';
          material.layers.push(...Array.from({ length: 6 }, (_, slot) => slots.get(slot)!));
        } else material.layers.push(diffuse);
      }
      assert(r.remaining === 0, 'material length mismatch');
    }
    result.push(material);
  }
  return result;
}

function geosets(s: BinaryStream, version: number): Geoset[] {
  const result: Geoset[] = [];
  while (s.remaining) {
    const r = record(s), g = new Geoset();
    r.skip(4);
    const count = (tag: string, stride: number) => {
      assert(r.remaining >= 8 && r.readBinary(4) === tag, `expected ${tag}`);
      const n = r.readUint32(); assert(n <= r.remaining / stride, `${tag} exceeds geoset`); return n;
    };
    g.vertices = r.readFloat32Array(count('VRTX', 12) * 3);
    g.normals = r.readFloat32Array(count('NRMS', 12) * 3);
    g.faceTypeGroups = r.readUint32Array(count('PTYP', 4));
    g.faceGroups = r.readUint32Array(count('PCNT', 4));
    g.faces = r.readUint16Array(count('PVTX', 2));
    g.vertexGroups = r.readUint8Array(count('GNDX', 1));
    g.matrixGroups = r.readUint32Array(count('MTGC', 4));
    g.matrixIndices = r.readUint32Array(count('MATS', 4));
    g.materialId = r.readUint32(); g.selectionGroup = r.readUint32(); g.selectionFlags = r.readUint32();
    if (version > 800) { g.lod = r.readInt32(); g.lodName = r.read(80); }
    g.extent.readMdx(r);
    const extents = r.readUint32(); assert(extents <= r.remaining / 28, 'invalid extent count');
    for (let i = 0; i < extents; i++) { const e = new Extent(); e.readMdx(r); g.sequenceExtents.push(e); }
    if (peek(r) === 'TANG') g.tangents = r.readFloat32Array(count('TANG', 16) * 4);
    const vertices = g.vertices.length / 3;
    if (peek(r) === 'SKIN') {
      r.skip(4); const n = r.readUint32(), start = r.index;
      assert(n === vertices * 8, 'SKIN/vertex count mismatch');
      const fits = (width: number) => {
        let p = start + n * width;
        const view = new DataView(r.uint8array.buffer, r.uint8array.byteOffset, r.byteLength);
        if (p + 8 > r.byteLength || peek(r, p) !== 'UVAS') return false;
        const sets = view.getUint32(p + 4, true); p += 8;
        if (sets > 32) return false;
        for (let i = 0; i < sets; i++) {
          if (p + 8 > r.byteLength || peek(r, p) !== 'UVBS' || view.getUint32(p + 4, true) !== vertices) return false;
          p += 8 + vertices * 8;
        }
        return p === r.byteLength;
      };
      const narrow = fits(1), wide = fits(2);
      assert(narrow !== wide, 'ambiguous/unsupported SKIN width');
      // Viewer GPU adapter preserves all 16 bits of bone indices.
      (g as any).skin = wide ? r.readUint16Array(n) : r.readUint8Array(n);
      for (let i = 4; i < g.skin.length; i += 8)
        for (let j = 0; j < 4; j++) assert(g.skin[i + j] <= 255, 'unsupported skin weight range');
    }
    assert(r.readBinary(4) === 'UVAS', 'missing UVAS');
    const sets = r.readUint32(); assert(sets <= 32, 'invalid UV count');
    for (let i = 0; i < sets; i++) {
      const n = count('UVBS', 8); assert(n === vertices, 'UV/vertex count mismatch');
      g.uvSets.push(r.readFloat32Array(n * 2));
    }
    assert(r.remaining === 0, 'geoset length mismatch');
    result.push(g);
  }
  return result;
}

/** Read-only preview adapter: never rewrites the user's original model. */
export function parsePreviewModel(bytes: Uint8Array): Model {
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'MDLX') {
    const model = new Model(); model.load(bytes); return model;
  }
  const s = new BinaryStream(bytes), chunks: { tag: string; data: Uint8Array }[] = [];
  s.skip(4); let version = 800;
  while (s.remaining) {
    assert(s.remaining >= 8, 'truncated chunk header');
    const tag = s.readBinary(4), size = s.readUint32();
    assert(size <= s.remaining, `${tag} exceeds file`);
    const data = s.readUint8Array(size);
    if (tag === 'VERS') { assert(size === 4, 'invalid VERS'); version = new DataView(data.buffer, data.byteOffset, 4).getUint32(0, true); }
    chunks.push({ tag, data });
  }
  const model = new Model();
  // Use the existing animation/node parser without invoking its obsolete MTLS/GEOS readers.
  // Preview uses its own orbit camera and light. Modern camera/light records have
  // additional fields not understood by the legacy parser; do not misparse them.
  const others = chunks.filter(c => !['MTLS', 'GEOS', 'CAMS', 'LITE'].includes(c.tag));
  const buffer = new Uint8Array(4 + others.reduce((n, c) => n + 8 + c.data.length, 0));
  const w = new BinaryStream(buffer); w.writeBinary('MDLX');
  for (const c of others) { w.writeBinary(c.tag); w.writeUint32(c.data.length); w.writeUint8Array(c.data); }
  model.load(buffer);
  const teamTexture = () => {
    let index = model.textures.findIndex(t => t.replaceableId === 1);
    if (index < 0) {
      const Texture = cjsDefault(TextureImport), texture = new Texture(); texture.replaceableId = 1;
      index = model.textures.push(texture) - 1;
    }
    return index;
  };
  for (const c of chunks) {
    if (c.tag === 'MTLS') model.materials.push(...materials(new BinaryStream(c.data), version, teamTexture));
    if (c.tag === 'GEOS') model.geosets.push(...geosets(new BinaryStream(c.data), version));
  }
  for (const g of model.geosets) assert(g.materialId < model.materials.length, 'invalid material reference');
  return model;
}
