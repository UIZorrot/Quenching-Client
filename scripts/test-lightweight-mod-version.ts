import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import {
  hasLegacy34Sentinels,
  readCurrentModMarkerAtDir,
  resolveManagedSequence,
} from '../src/Main/services/mod-version-detection';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-lightweight-version-'));
const retail = path.join(root, '_retail_');

try {
  await fs.outputFile(path.join(retail, '_patch', 'keep.que'), '-v3.5-\n');
  const baseMarker = await readCurrentModMarkerAtDir(retail);
  assert.deepEqual(baseMarker, { version: '3.5', sequence: null, displayVersion: null });
  assert.equal(resolveManagedSequence(baseMarker!), 35);

  await fs.outputFile(path.join(retail, '_patch', 'keep.que'), '-v3.5-\n-v3.51-\n-s36-\n-d3.5-\n');
  const internal = await readCurrentModMarkerAtDir(retail);
  assert.deepEqual(internal, { version: '3.51', sequence: 36, displayVersion: '3.5' });
  assert.equal(resolveManagedSequence(internal!), 36);

  await fs.remove(path.join(retail, '_patch'));
  await fs.ensureDir(path.join(retail, 'Rbuildings'));
  await fs.ensureDir(path.join(retail, 'QMoff', 'RetroTex'));
  await fs.ensureDir(path.join(retail, 'RUnits'));
  assert.equal(await hasLegacy34Sentinels(retail), true);

  await fs.remove(path.join(retail, 'QMoff', 'RetroTex'));
  assert.equal(await hasLegacy34Sentinels(retail), false);
  console.log('Lightweight MOD version checks passed');
} finally {
  await fs.remove(root);
}
