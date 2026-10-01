import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { applyPostProcessingShaders, applyShaderToggles, pickFogVariant } from '../src/Main/services/fog-shader-override';

const hd = { graphics: 'hd', shaderPack: 'shaders-300-hd' } as const;
const expected: Record<string, Array<string | null>> = {
  standard: [null, null, null, 'brightness_2', 'brightness_2'],
  rpg: [null, null, null, 'brightness_2', 'brightness_2'],
  battle: ['brightness_2', 'brightness_2', 'brightness_2', 'brightness_3', 'brightness_3'],
};
for (const [lighting, variants] of Object.entries(expected)) {
  variants.forEach((variant, i) => assert.equal(pickFogVariant(hd, lighting, i + 1), variant, `${lighting} ${i + 1}`));
}
assert.equal(pickFogVariant(hd, undefined, 5), 'brightness_2', 'missing lighting means standard');
assert.equal(pickFogVariant(hd, 'battle', undefined), 'brightness_2', 'missing brightness means level 3');
for (const level of [1, 3, 5]) {
  assert.equal(pickFogVariant({ graphics: 'de', shaderPack: 'shaders-300-de' }, 'battle', level), null);
  assert.equal(pickFogVariant({ graphics: 'hd', shaderPack: 'shaders200' }, 'battle', level), null);
  assert.equal(pickFogVariant({ graphics: 'sd', shaderPack: 'shaders-300-hd' }, 'battle', level), null);
}

const quenchingDir = path.join(process.cwd(), 'assets', 'quenching');
const fogSource = (variant: string, file: string) => path.join(quenchingDir, 'shaders', 'fog_shaders', variant, 'ps', file);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fog-override-'));
try {
  const shadersDir = path.join(temp, 'shaders');
  const seed = async () => {
    await fs.remove(shadersDir);
    for (const file of ['fog.bls', 'volumetricfog.bls', 'bloomextract.bls']) await fs.outputFile(path.join(shadersDir, 'ps', file), `pack ${file}`);
  };
  const same = async (target: string, source: string) =>
    Buffer.compare(await fs.readFile(target), await fs.readFile(source)) === 0;

  await seed();
  await applyPostProcessingShaders(shadersDir, quenchingDir, hd, { lighting: 'battle', lightingBrightness: 5 });
  assert.ok(await same(path.join(shadersDir, 'ps', 'fog.bls'), fogSource('brightness_3', 'fog.bls')));
  assert.ok(await same(path.join(shadersDir, 'ps', 'volumetricfog.bls'), fogSource('brightness_3', 'volumetricfog.bls')));
  assert.equal(await fs.readFile(path.join(shadersDir, 'ps', 'bloomextract.bls'), 'utf8'), 'pack bloomextract.bls');

  await seed();
  await applyPostProcessingShaders(shadersDir, quenchingDir, hd, { lighting: 'rpg', lightingBrightness: 4 });
  assert.ok(await same(path.join(shadersDir, 'ps', 'fog.bls'), fogSource('brightness_2', 'fog.bls')));

  await seed();
  await applyPostProcessingShaders(shadersDir, quenchingDir, hd, { lighting: 'standard', lightingBrightness: 3 });
  assert.equal(await fs.readFile(path.join(shadersDir, 'ps', 'fog.bls'), 'utf8'), 'pack fog.bls');

  await seed();
  await fs.outputFile(path.join(shadersDir, 'ps', 'bloomcombine.bls'), 'pack bloomcombine.bls');
  await fs.outputFile(path.join(shadersDir, 'ps', 'gaussianblur.bls'), 'pack gaussianblur.bls');
  await applyPostProcessingShaders(shadersDir, quenchingDir, hd, { lighting: 'battle', lightingBrightness: 5, postProcessing: false });
  for (const file of ['fog.bls', 'volumetricfog.bls']) {
    assert.equal(await fs.pathExists(path.join(shadersDir, 'ps', file)), false, `${file} removed with shadow post-processing off`);
  }
  for (const file of ['bloomcombine.bls', 'bloomextract.bls', 'gaussianblur.bls']) {
    assert.equal(await fs.readFile(path.join(shadersDir, 'ps', file), 'utf8'), `pack ${file}`, `${file} kept when only shadows are off`);
  }

  await seed();
  await fs.outputFile(path.join(shadersDir, 'ps', 'bloomcombine.bls'), 'pack bloomcombine.bls');
  await fs.outputFile(path.join(shadersDir, 'ps', 'gaussianblur.bls'), 'pack gaussianblur.bls');
  await applyPostProcessingShaders(shadersDir, quenchingDir, hd, { lighting: 'standard', lightingBrightness: 3, postProcessingGlow: false });
  assert.equal(await fs.readFile(path.join(shadersDir, 'ps', 'fog.bls'), 'utf8'), 'pack fog.bls', 'fog kept when only glow is off');
  for (const file of ['bloomcombine.bls', 'bloomextract.bls', 'gaussianblur.bls']) {
    assert.equal(await fs.pathExists(path.join(shadersDir, 'ps', file)), false, `${file} removed with glow off`);
  }

  await seed();
  for (const file of ['ps/hd.bls', 'ps/terrain.bls', 'vs/hd.bls']) await fs.outputFile(path.join(shadersDir, file), 'object');
  await applyShaderToggles(shadersDir, quenchingDir, hd, { lighting: 'standard', lightingBrightness: 3, objectShader: false });
  for (const file of ['ps/hd.bls', 'ps/terrain.bls', 'vs/hd.bls']) {
    assert.equal(await fs.pathExists(path.join(shadersDir, file)), false, `${file} removed with object shader off`);
  }
  assert.equal(await fs.readFile(path.join(shadersDir, 'ps', 'fog.bls'), 'utf8'), 'pack fog.bls', 'post-processing untouched');

  await seed();
  await fs.outputFile(path.join(shadersDir, 'ps', 'hd.bls'), 'object');
  await applyShaderToggles(shadersDir, quenchingDir, hd, { lighting: 'standard', lightingBrightness: 3 });
  assert.equal(await fs.readFile(path.join(shadersDir, 'ps', 'hd.bls'), 'utf8'), 'object', 'object shader kept when on');
} finally {
  await fs.remove(temp);
}
console.log('Fog shader override checks passed');
