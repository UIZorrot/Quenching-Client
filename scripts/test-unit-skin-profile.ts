import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { activeSkinProfile, storedSkinPath, switchUnitSkinProfile } from '../src/Main/services/unit-skin-profile';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-unit-skin-profile-'));
const retail = path.join(root, '_retail_');
const assets = path.join(root, 'assets', 'quenching');
const active = path.join(retail, 'units', 'unitskin.txt');
try {
  const shippedDe = await fs.readFile(path.resolve('assets', 'quenching', 'skin', 'unitskin-de.txt'), 'utf8');
  const shippedSd = await fs.readFile(path.resolve('assets', 'quenching', 'skin', 'unitskin-sd.txt'), 'utf8');
  assert.match(shippedDe, /^file:de=/m);
  assert.doesNotMatch(shippedDe, /^file:(?:sd|hd)=/m);
  assert.match(shippedSd, /^file:sd=/m);
  assert.doesNotMatch(shippedSd, /^file:(?:de|hd)=/m);
  await fs.outputFile(path.join(assets, 'skin', 'unitskin-new.txt'), 'HD baseline');
  await fs.outputFile(path.join(assets, 'skin', 'unitskin-old.txt'), 'HD retro baseline');
  await fs.outputFile(path.join(assets, 'skin', 'unitskin-sd.txt'), 'SD baseline');
  await fs.outputFile(path.join(assets, 'skin', 'unitskin-de.txt'), 'DE baseline');
  await fs.outputFile(active, 'HD player choice');

  assert.deepEqual(await switchUnitSkinProfile(retail, assets, 'de'), { created: true, switched: true });
  assert.equal(await fs.readFile(active, 'utf8'), 'DE baseline');
  assert.equal(await fs.readFile(storedSkinPath(retail, 'hd'), 'utf8'), 'HD player choice');
  await fs.writeFile(active, 'DE player choice');

  await switchUnitSkinProfile(retail, assets, 'sd');
  assert.equal(await fs.readFile(active, 'utf8'), 'SD baseline');
  assert.equal(await fs.readFile(storedSkinPath(retail, 'de'), 'utf8'), 'DE player choice');

  await switchUnitSkinProfile(retail, assets, 'hd-retro');
  assert.equal(await fs.readFile(active, 'utf8'), 'HD retro baseline');
  await switchUnitSkinProfile(retail, assets, 'hd');
  assert.equal(await fs.readFile(active, 'utf8'), 'HD player choice');
  await switchUnitSkinProfile(retail, assets, 'de');
  assert.equal(await fs.readFile(active, 'utf8'), 'DE player choice');
  assert.equal(await activeSkinProfile(retail), 'de');
  await fs.move(active, storedSkinPath(retail, 'de', true), { overwrite: true });
  await switchUnitSkinProfile(retail, assets, 'hd');
  assert.equal(await fs.pathExists(active), false);
  assert.equal(await fs.pathExists(path.join(retail, 'units', 'unitskin-dis.txt')), false);
  assert.equal(await fs.readFile(storedSkinPath(retail, 'hd', true), 'utf8'), 'HD player choice');
  await switchUnitSkinProfile(retail, assets, 'de');
  assert.equal(await fs.pathExists(active), false);
  assert.equal(await fs.readFile(storedSkinPath(retail, 'de', true), 'utf8'), 'DE player choice');
  console.log('PASS: SD, HD, HD retro and DE use independent unitskin files');
} finally {
  await fs.remove(root);
}
