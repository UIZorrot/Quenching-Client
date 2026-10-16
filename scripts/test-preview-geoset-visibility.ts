import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parsePreviewModel } from '../src/Renderer/model-preview/parse-model';
import { selectPreviewSequence } from '../src/Renderer/model-preview/sequence-selection';

const require = createRequire(import.meta.url);
const BatchGroup = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/batchgroup').default;
const GeosetAnimation = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/geosetanimation').default;
const hdFragment = require('mdx-m3-viewer/dist/cjs/viewer/handlers/mdx/shaders/hd.frag').default as string;
assert.match(hdFragment, /color\.a \*= v_layerAlpha/, 'HD shader must retain the evaluated geometry/layer alpha');

// Exercise the installed renderer (including patch-package), not a copy of its
// visibility logic. Town Hall, Keep and Castle are three meshes in one model.
const drawn: number[] = [], alphas: number[] = [];
const gl = new Proxy({ uniform1f(name: string, value: number) { if (name === 'alpha') alphas.push(value); } },
  { get(target, name: string) { return (target as any)[name] || (() => {}); } });
const shader = { use() {}, uniforms: { u_layerAlpha: 'alpha' } };
const model: any = {
  viewer: { gl, webgl: { bindTextureAndWrap() {} }, sharedCache: new Map([['mdx', {
    hdShader: shader, hdSkinShader: shader, teamColors: [{ texture: {} }], teamGlows: [],
  }]]), debugRenderMode: 0 },
  textures: Array.from({ length: 6 }, () => ({ texture: {}, replaceableId: 0 })),
  batches: Array.from({ length: 3 }, (_, index) => ({
    geoset: { index, bindHd() {}, render() { drawn.push(index); } },
    material: { layers: Array.from({ length: 6 }, (_, index) => ({ index, filterMode: 0, bind() {} })) },
  })),
};
const instance: any = {
  scene: { camera: {} }, textureOverrides: new Map(), model, teamColor: 0,
  layerAlphas: new Float32Array([1]), layerTextures: [0, 1, 2, 3, 4, 5],
  vertexColor: new Float32Array([1, 1, 1, 1]),
  geosetColors: Array.from({ length: 3 }, () => new Float32Array([1, 1, 1, 0])),
};
const group = new BatchGroup(model, 0, true); group.objects = [0, 1, 2];
for (const stage of [0, 1, 2, 0]) {
  instance.geosetColors.forEach((color: Float32Array, index: number) => { color[3] = +(stage === index); });
  drawn.length = alphas.length = 0; group.render(instance);
  assert.deepEqual(drawn, [stage], 'hidden upgrade meshes must never reach the HD draw call');
  assert.deepEqual(alphas, [1]);
}
instance.geosetColors[0][3] = 0.5; instance.layerAlphas[0] = 0.5; instance.vertexColor[3] = 0.5;
drawn.length = alphas.length = 0; group.render(instance);
assert.deepEqual(drawn, [0]); assert.deepEqual(alphas, [0.125], 'geometry, layer and instance alpha must compose');
instance.layerAlphas[0] = 0; drawn.length = 0; group.render(instance); assert.deepEqual(drawn, []);
instance.layerAlphas[0] = 1; instance.vertexColor[3] = 0; group.render(instance); assert.deepEqual(drawn, []);

// Optional real-file check: read only from an installed game, never extract or
// bundle Warcraft models. The normal regression above requires no game assets.
const game = process.argv[2];
if (game) {
  const { Storage } = require('@jamiephan/casclib'); const storage = new Storage();
  storage.open(`${game}*w3`);
  const read = (name: string) => {
    const file = storage.openFile(name);
    try { return new Uint8Array(file.readAll()); } finally { file.close(); }
  };
  try {
    const units = new TextDecoder().decode(read('war3.w3mod:units\\unitskin.txt'));
    for (const ids of [['htow', 'hkee', 'hcas'], ['ogre', 'ostr', 'ofrt'], ['etol', 'etoa', 'etoe'],
      ['unpl', 'unp1', 'unp2'], ['hwtw', 'hgtw', 'hctw', 'hatw'], ['uzig', 'uzg1', 'uzg2']]) {
      for (const artSet of ['sd', 'hd', 'de']) {
        const prefix = artSet === 'sd' ? '' : `_${artSet}.w3mod:`;
        const models = new Map<string, ReturnType<typeof parsePreviewModel>>();
        const visible = ids.map(id => {
          const section = units.split(`[${id}]`)[1]?.split('[')[0];
          const file = section?.match(/^file=(.+)$/m)?.[1].trim().replace(/\.mdl$/i, '.mdx');
          assert(file, `${id} original model path must exist`);
          const name = /\.mdx$/i.test(file) ? file : `${file}.mdx`;
          if (!models.has(name)) models.set(name, parsePreviewModel(read(`war3.w3mod:${prefix}${name}`)));
          const parsed = models.get(name)!;
          const animationModel = { sequences: parsed.sequences, globalSequences: parsed.globalSequences };
          const animations = new Map<number, any>(parsed.geosetAnimations.map(animation =>
            [animation.geosetId, new GeosetAnimation(animationModel, animation)]));
          const sequence = selectPreviewSequence(parsed.sequences, id);
          assert(sequence >= 0); const frame = parsed.sequences[sequence].interval[0], alpha = new Float32Array(1);
          const geosets = parsed.geosets.flatMap((geoset, index) => {
            if (parsed.version > 800 && geoset.lod !== 0) return [];
            alpha[0] = 1; animations.get(index)?.getAlpha(alpha, sequence, frame, 0);
            return alpha[0] > 0.01 ? [index] : [];
          });
          assert(geosets.length > 0, `${artSet}/${id} must have visible geometry`);
          return { id, model: name, sequence: parsed.sequences[sequence].name, geosets };
        });
        // Trees can change through bones/replaceable textures instead of GEOA;
        // their shared body need not produce a distinct visible-mesh list.
        if (ids[0] !== 'etol') assert.equal(new Set(visible.map(stage => `${stage.model}:${stage.geosets.join(',')}`)).size, ids.length,
          `${artSet}/${ids[0]} upgrade stages must have different visible meshes`);
        console.log(JSON.stringify({ artSet, stages: visible }));
      }
    }
  } finally { storage.close(); }
}
console.log('PASS: HD/DE renderer skips hidden upgrade meshes and applies geometry/layer/instance alpha.');
