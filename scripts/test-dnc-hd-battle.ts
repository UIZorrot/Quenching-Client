import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { applyDncLighting } from '../src/Main/services/dnc-lighting';
import { getShaderResourcePath } from '../src/Main/services/mod-profile';
import type { ModProfile } from '../src/shared/mod-profile';

const hd = path.join(process.cwd(), 'assets', 'quenching', 'dnc', 'dnc30-hd');
const statics = (text: string, name: string) =>
  [...text.matchAll(new RegExp(`static\\s+${name}\\s+([\\d.-]+)`, 'gi'))].map(m => parseFloat(m[1]));
const nonStatic = (text: string) =>
  text.split(/\r?\n/).filter(line => !/static\s+AmbIntensity/i.test(line)).join('\n');

// HD 3.0 battle runs exactly like standard except AmbIntensity +0.05 on terrain and unit DNC.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dnc-hd-battle-'));
try {
  const standard = path.join(root, 'standard');
  const battle = path.join(root, 'battle');
  await fs.copy(hd, standard);
  await fs.copy(hd, battle);
  await applyDncLighting(standard, 'standard', 3, { deMode: false, isVersion30: true });
  await applyDncLighting(battle, 'battle', 3, { deMode: false, isVersion30: true });

  let checked = 0;
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.name.toLowerCase().endsWith('.mdl')) continue;
      const rel = path.relative(standard, full);
      const [s, b] = await Promise.all([fs.readFile(full, 'utf8'), fs.readFile(path.join(battle, rel), 'utf8')]);
      const [sa, ba] = [statics(s, 'AmbIntensity'), statics(b, 'AmbIntensity')];
      assert.equal(ba.length, sa.length, rel);
      sa.forEach((value, i) => assert.ok(Math.abs(ba[i] - (value + 0.05)) < 0.006, `${rel} amb ${value} -> ${ba[i]}`));
      assert.equal(nonStatic(b), nonStatic(s), `${rel}: only AmbIntensity may differ`);
      if (sa.length) checked++;
    }
  };
  await walk(standard);
  assert.ok(checked > 0);

  const profile = { graphics: 'hd', shaderPack: 'shaders-300-hd', dncPack: 'dnc30-hd' } as ModProfile;
  assert.equal(getShaderResourcePath('Q', profile, 'battle'), getShaderResourcePath('Q', profile, 'standard'));
  console.log(`PASS: HD 3.0 battle = standard + AmbIntensity 0.05 (${checked} DNC files)`);
} finally {
  await fs.remove(root);
}
