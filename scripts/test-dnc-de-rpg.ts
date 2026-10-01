import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { applyDncLighting } from '../src/Main/services/dnc-lighting';

const dncRoot = path.join(process.cwd(), 'assets', 'quenching', 'dnc');
const hd = path.join(dncRoot, 'dnc30-hd');
const deRpg = path.join(dncRoot, 'dnc30-de-rpg');

async function listMdl(root: string, dir = root): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await listMdl(root, full));
    else if (entry.name.toLowerCase().endsWith('.mdl')) found.push(path.relative(root, full));
  }
  return found.sort();
}

function intensities(content: string): number[] {
  const values: number[] = [];
  let inIntensity = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    const staticMatch = line.match(/^static\s+Intensity\s+([\d.-]+)/i);
    if (staticMatch) values.push(parseFloat(staticMatch[1]));
    if (/^Intensity\s+\d+\s*\{/i.test(line)) { inIntensity = true; continue; }
    if (inIntensity) {
      const key = line.match(/^\d+:\s*([\d.-]+),?$/);
      if (key) values.push(parseFloat(key[1]));
      else if (line.startsWith('}')) inIntensity = false;
    }
  }
  return values;
}

const hdFiles = await listMdl(hd);
assert.deepEqual(await listMdl(deRpg), hdFiles, 'dnc30-de-rpg must mirror dnc30-hd');
for (const rel of hdFiles) {
  const base = intensities(await fs.readFile(path.join(hd, rel), 'utf8'));
  const scaled = intensities(await fs.readFile(path.join(deRpg, rel), 'utf8'));
  assert.ok(base.length > 0, `${rel} has intensity values`);
  assert.equal(scaled.length, base.length, rel);
  base.forEach((value, i) => assert.ok(Math.abs(scaled[i] - value * 1.15) < 0.006, `${rel}[${i}] ${scaled[i]} != ${value}×1.15`));
}

// In game DE RPG runs as standard on 3.0: only Intensity changes, never Amb/Shadow.
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'dnc-de-rpg-'));
try {
  await fs.copy(deRpg, temp);
  await applyDncLighting(temp, 'standard', 3, { deMode: true, isVersion30: true });
  for (const rel of hdFiles) {
    const before = await fs.readFile(path.join(deRpg, rel), 'utf8');
    const after = await fs.readFile(path.join(temp, rel), 'utf8');
    const pick = (text: string) => [...text.matchAll(/static\s+(?:Amb|Shadow)Intensity\s+([\d.-]+)/gi)].map(m => parseFloat(m[1]));
    const [b, a] = [pick(before), pick(after)];
    assert.equal(a.length, b.length, rel);
    b.forEach((value, i) => assert.ok(Math.abs(a[i] - value) < 0.006, `${rel} ambient/shadow ${value} -> ${a[i]}`));
  }
} finally {
  await fs.remove(temp);
}

console.log(`dnc30-de-rpg OK (${hdFiles.length} files)`);
