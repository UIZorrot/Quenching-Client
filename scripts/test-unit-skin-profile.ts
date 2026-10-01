import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import {
  activeSkinEra,
  activeSkinProfile,
  refreshUnitSkinBaseline,
  storedSkinPath,
  switchUnitSkinProfile,
  UNIT_SKIN_BASELINE,
} from '../src/Main/services/unit-skin-profile';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-unit-skin-profile-'));
const retail = path.join(root, '_retail_');
const assets = path.join(root, 'assets', 'quenching');
const active = path.join(retail, 'units', 'unitskin.txt');
const markerFile = path.join(retail, '.quenching', 'unit-skin-profile.json');
const read = (file: string) => fs.readFile(file, 'utf8');
const reset = async (marker: object, activeText: string) => {
  await fs.remove(retail);
  await fs.outputJson(markerFile, marker);
  await fs.outputFile(active, activeText);
};
try {
  // 3.0 SD, HD and DE share one baseline carrying every mode's model paths; 2.x keeps the old per-mode files.
  const shipped = (name: string) => read(path.resolve('assets', 'quenching', 'skin', name));
  const [shippedSd, shippedHd, shippedDe, shippedRetro, legacySd, legacyHd] = await Promise.all(
    ['unitskin-sd.txt', 'unitskin-new.txt', 'unitskin-de.txt', 'unitskin-old.txt', 'legacy/unitskin-sd.txt', 'legacy/unitskin-new.txt']
      .map(shipped));
  assert.equal(shippedSd, shippedDe);
  assert.equal(shippedHd, shippedDe);
  for (const key of ['sd', 'hd', 'de']) assert.match(shippedDe, new RegExp(`^file:${key}=`, 'm'));
  assert.notEqual(shippedRetro, shippedDe);
  assert.notEqual(legacySd, legacyHd);
  assert.notEqual(legacyHd, shippedHd);

  for (const [name, text] of [
    ['unitskin-new.txt', 'HD30'], ['unitskin-sd.txt', 'SD30'], ['unitskin-de.txt', 'DE30'], ['unitskin-old.txt', 'RETRO'],
    ['legacy/unitskin-new.txt', 'HD20'], ['legacy/unitskin-sd.txt', 'SD20'], ['legacy/unitskin-de.txt', 'DE20'],
  ]) await fs.outputFile(path.join(assets, 'skin', name), text);

  // Pre-split copies were built from the 2.x baseline: a 3.0 player keeps them for 2.x and starts 3.0 fresh.
  await reset({ schema: 1, profile: 'de' }, 'old DE edit');
  await fs.outputFile(path.join(retail, 'QMoff', 'skin-profiles', 'hd', 'unitskin.txt'), 'old HD parked');
  assert.deepEqual(await refreshUnitSkinBaseline(retail, assets, 'hd', 'v30'), { refreshed: true, profile: 'de', era: 'v30' });
  assert.equal(await read(active), 'DE30');
  assert.equal(await read(storedSkinPath(retail, 'de', false, 'v20')), 'old DE edit');
  assert.equal(await read(storedSkinPath(retail, 'hd', false, 'v20')), 'old HD parked');
  assert.equal((await fs.readJson(markerFile)).baseline, UNIT_SKIN_BASELINE);
  await fs.writeFile(active, 'DE30 edit');
  assert.deepEqual(await refreshUnitSkinBaseline(retail, assets, 'hd', 'v30'), { refreshed: false, profile: 'de', era: 'v30' });
  assert.equal(await read(active), 'DE30 edit');

  // A 2.x player keeps the active copy untouched.
  await reset({ schema: 1, profile: 'sd' }, 'old SD edit');
  await fs.outputFile(path.join(retail, 'QMoff', 'units', 'unitskin.txt'), 'stale legacy park');
  assert.deepEqual(await refreshUnitSkinBaseline(retail, assets, 'hd', 'v20'), { refreshed: false, profile: 'sd', era: 'v20' });
  assert.equal(await read(active), 'old SD edit');
  assert.equal(await fs.pathExists(path.join(retail, 'QMoff', 'units', 'unitskin.txt')), false);
  assert.equal(await activeSkinEra(retail), 'v20');

  // `force` (after a package install) rebuilds the current profile and keeps a disabled skin disabled.
  await fs.move(active, storedSkinPath(retail, 'sd', true, 'v20'));
  assert.deepEqual(await refreshUnitSkinBaseline(retail, assets, 'hd', 'v20', { force: true }), { refreshed: true, profile: 'sd', era: 'v20' });
  assert.equal(await fs.pathExists(active), false);
  assert.equal(await read(storedSkinPath(retail, 'sd', true, 'v20')), 'SD20');

  // Switching from an outdated retro file drops the unmerged 3.0 template instead of parking it.
  await reset({ schema: 1, profile: 'hd-retro' }, 'old retro merge');
  await switchUnitSkinProfile(retail, assets, 'de', 'v30');
  assert.equal(await read(active), 'DE30');
  assert.equal(await fs.pathExists(storedSkinPath(retail, 'hd-retro', false, 'v30')), false);
  assert.equal(await read(storedSkinPath(retail, 'hd-retro', false, 'v20')), 'old retro merge');

  // Every profile keeps an independent copy per era.
  await reset({ schema: 1, profile: 'hd', era: 'v30', baseline: UNIT_SKIN_BASELINE }, 'HD30 player');
  assert.deepEqual(await switchUnitSkinProfile(retail, assets, 'de', 'v30'), { created: true, switched: true });
  assert.equal(await read(active), 'DE30');
  assert.equal(await read(storedSkinPath(retail, 'hd', false, 'v30')), 'HD30 player');
  await fs.writeFile(active, 'DE30 player');

  assert.deepEqual(await switchUnitSkinProfile(retail, assets, 'hd', 'v20'), { created: true, switched: true });
  assert.equal(await read(active), 'HD20');
  assert.equal(await read(storedSkinPath(retail, 'de', false, 'v30')), 'DE30 player');
  await fs.writeFile(active, 'HD20 player');
  await switchUnitSkinProfile(retail, assets, 'sd', 'v20');
  assert.equal(await read(active), 'SD20');
  assert.equal(await read(storedSkinPath(retail, 'hd', false, 'v20')), 'HD20 player');

  await switchUnitSkinProfile(retail, assets, 'hd', 'v30');
  assert.equal(await read(active), 'HD30 player');
  await switchUnitSkinProfile(retail, assets, 'hd', 'v20');
  assert.equal(await read(active), 'HD20 player');
  assert.equal(await read(storedSkinPath(retail, 'hd', false, 'v30')), 'HD30 player');
  await switchUnitSkinProfile(retail, assets, 'hd-retro', 'v20');
  assert.equal(await read(active), 'RETRO');
  await switchUnitSkinProfile(retail, assets, 'de', 'v30');
  assert.equal(await read(active), 'DE30 player');
  assert.equal(await activeSkinProfile(retail), 'de');
  assert.equal(await activeSkinEra(retail), 'v30');

  // Disabled skins stay disabled across switches.
  await fs.move(active, storedSkinPath(retail, 'de', true, 'v30'), { overwrite: true });
  await switchUnitSkinProfile(retail, assets, 'hd', 'v20');
  assert.equal(await fs.pathExists(active), false);
  assert.equal(await fs.pathExists(path.join(retail, 'units', 'unitskin-dis.txt')), false);
  assert.equal(await read(storedSkinPath(retail, 'hd', true, 'v20')), 'HD20 player');
  await switchUnitSkinProfile(retail, assets, 'de', 'v30');
  assert.equal(await fs.pathExists(active), false);
  assert.equal(await read(storedSkinPath(retail, 'de', true, 'v30')), 'DE30 player');
  console.log('PASS: unitskin profiles are kept per mode and per 2.x/3.0 era');
} finally {
  await fs.remove(root);
}
