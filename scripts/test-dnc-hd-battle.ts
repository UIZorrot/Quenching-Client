import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { applyDncLighting, getBrightnessMultiplier } from '../src/Main/services/dnc-lighting';
import { getShaderResourcePath } from '../src/Main/services/mod-profile';
import type { ModProfile } from '../src/shared/mod-profile';

const hd = path.join(process.cwd(), 'assets', 'quenching', 'dnc', 'dnc30-hd');
const statics = (text: string, name: string) =>
  [...text.matchAll(new RegExp(`static\\s+${name}\\s+([\\d.-]+)`, 'gi'))].map(m => parseFloat(m[1]));
const intensityValues = (text: string): number[] => {
  const fixed = statics(text, 'Intensity');
  if (fixed.length) return fixed;
  const block = text.match(/^\s*Intensity\s+\d+\s*\{([\s\S]*?)^\s*\}/im)?.[1] || '';
  return [...block.matchAll(/\d+:\s*([\d.-]+),?/g)].map(match => Number(match[1]));
};
const withoutChangedFields = (text: string) => {
  let intensity = false;
  return text.split(/\r?\n/).filter(raw => {
    const line = raw.trim();
    if (/^Intensity\s+\d+\s*\{/i.test(line)) { intensity = true; return true; }
    if (intensity && /^\d+:/.test(line)) return false;
    if (intensity && line.startsWith('}')) intensity = false;
    return !/^static\s+(?:AmbIntensity|Intensity)\b/i.test(line);
  }).map(line => line.trim()).join('\n');
};
const round = (value: number) => Math.round(value * 100) / 100;
async function list(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await list(full));
    else if (entry.name.toLowerCase().endsWith('.mdl')) files.push(full);
  }
  return files.sort();
}

// Apply to fresh copies: unit/terrain/underground ambient and day/night curves
// change only in 3.0 HD battle. Standard, RPG and DE retain their old rules.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dnc-hd-battle-'));
try {
  const originals = new Map<string, string>();
  for (const file of await list(hd)) originals.set(path.relative(hd, file), await fs.readFile(file, 'utf8'));
  let checked = 0;
  for (const [level, multiplier] of [[3, 1.05], [4, 1.2], [5, 1.35]]) {
    const target = path.join(root, 'battle-' + level, 'environment', 'dnc');
    await fs.copy(hd, target);
    await applyDncLighting(target, 'battle', level, { deMode: false, isVersion30: true });
    assert.equal(getBrightnessMultiplier(level, 'battle', { isVersion30: true, deMode: false }), multiplier);
    for (const [rel, before] of originals) {
      const after = await fs.readFile(path.join(target, rel), 'utf8');
      const underground = /dncdungeon|dncunderground/i.test(rel);
      assert.deepEqual(statics(after, 'AmbIntensity'), [underground ? -0.1 : /terrain/i.test(rel) ? 0.15 : 0.12]);
      assert.deepEqual(statics(after, 'ShadowIntensity'), statics(before, 'ShadowIntensity'), 'shadow unchanged: ' + rel);
      const sourceValues = intensityValues(before), actual = intensityValues(after);
      const peak = Math.max(...sourceValues);
      const expected = sourceValues.map(value => round((sourceValues.length > 1 ? peak - (peak - value) * 0.5 : value) * multiplier));
      assert.deepEqual(actual, expected, 'battle brightness/night fill: ' + rel);
      assert.equal(Math.max(...actual), round(peak * multiplier), 'daytime peak: ' + rel);
      assert.equal(withoutChangedFields(after), withoutChangedFields(before), 'colors/rotation/key times unchanged: ' + rel);
      checked++;
    }
    for (const mode of ['standard', 'rpg', 'battle']) {
      for (const deMode of [false, true]) {
        if (mode === 'battle' && !deMode) continue;
        const unaffected = path.join(root, `${mode}-${deMode}-${level}`, 'environment', 'dnc');
        await fs.copy(hd, unaffected);
        await applyDncLighting(unaffected, mode, level, { deMode, isVersion30: true });
        const baselineMultiplier = [1.1, 1.3, 1.5][level - 3];
        assert.equal(getBrightnessMultiplier(level, mode, { deMode, isVersion30: true }), baselineMultiplier);
        for (const [rel, before] of originals) {
          const after = await fs.readFile(path.join(unaffected, rel), 'utf8');
          assert.deepEqual(intensityValues(after), intensityValues(before).map(value => round(value * baselineMultiplier)), 'other profile curve: ' + rel);
          assert.deepEqual(statics(after, 'AmbIntensity'), statics(before, 'AmbIntensity').map(value => round(value + (mode === 'battle' ? 0.03 : mode === 'rpg' ? 0.01 : 0))), 'other profile ambient: ' + rel);
        }
      }
    }
  }
  assert.ok(checked > 0);
  for (const [rel, before] of originals) assert.equal(await fs.readFile(path.join(hd, rel), 'utf8'), before, 'bundled baseline unchanged');
  for (const level of [3, 4, 5]) {
    assert.equal(getBrightnessMultiplier(level, 'battle', { isVersion30: false }), [1.1, 1.3, 1.5][level - 3]);
    assert.equal(getBrightnessMultiplier(level), [1.1, 1.3, 1.5][level - 3]);
  }

  for (const shaderPack of ['shaders-300-hd', 'shaders-ptr-hd'] as const) {
    const profile = { graphics: 'hd', shaderPack, dncPack: 'dnc30-hd' } as ModProfile;
    for (const [lighting, folder] of [['standard', 'standard'], ['battle', 'melee'], ['rpg', 'rpg']]) {
      const actual = getShaderResourcePath(path.join(process.cwd(), 'assets', 'quenching'), profile, lighting);
      assert.equal(actual, path.join(process.cwd(), 'assets', 'quenching', 'shaders', shaderPack, 'ps', folder));
      assert.ok(await fs.pathExists(path.join(actual, 'hd.bls')), `${shaderPack}/${lighting}: shader exists`);
    }
  }
  for (const shaderPack of ['shaders-300-de', 'shaders-ptr-de'] as const) {
    const profile = { graphics: 'de', shaderPack, dncPack: 'dnc30-de' } as ModProfile;
    for (const lighting of ['standard', 'battle', 'rpg']) {
      assert.equal(getShaderResourcePath('Q', profile, lighting), path.join('Q', 'shaders', shaderPack));
    }
  }
  console.log(`PASS: HD 3.0 battle brightness/ambient/night fill (${checked} files); other profiles and shader routing unchanged`);
} finally {
  await fs.remove(root);
}
