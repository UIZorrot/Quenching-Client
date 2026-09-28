import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'path';
import fs from 'fs-extra';
import JSZip from 'jszip';
import { getThirdPartyState, importThirdPartySource, peelToGamePaths, setThirdPartyEnabled, setThirdPartyFeature, setThirdPartyName } from '../src/Main/services/third-party-resources';

assert.deepEqual(
  peelToGamePaths(['VisionMod/Install Guide.txt', 'VisionMod/_retail_/units/hero.mdx', 'VisionMod/_retail_/terrainart/terrain.slk']),
  ['units/hero.mdx', 'terrainart/terrain.slk']
);
assert.deepEqual(peelToGamePaths(['units/hero.mdx']), ['units/hero.mdx']);
assert.deepEqual(peelToGamePaths(['mycustom/readme.txt']), ['mycustom/readme.txt']);
assert.deepEqual(
  peelToGamePaths(['Pack/_retail_/t00/a.txt', 'Pack/_ptr_/t00/b.txt'], '_ptr_'),
  ['t00/b.txt']
);

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-third-party-'));
const retail = path.join(root, '_retail_');
try {
  await fs.ensureDir(path.join(retail, 't00'));
  await fs.writeFile(path.join(retail, 't00', 'tile.txt'), 'quenching');
  await fs.ensureDir(path.join(retail, 'terrainart'));
  await fs.writeFile(path.join(retail, 'terrainart', 'terrain.slk'), 'slk');
  await fs.ensureDir(path.join(retail, 'shaders'));

  const empty = await getThirdPartyState(root);
  assert.equal(empty.slots[0].imported, false);
  assert.equal(empty.slots[0].name, 'Assets 1');
  await setThirdPartyName(root, 1, 'My campaign');
  assert.equal((await getThirdPartyState(root)).slots[0].name, 'My campaign');
  await assert.rejects(setThirdPartyEnabled(root, 1, true), /请先导入资源/);

  const source = path.join(root, 'incoming', 'VisionMod');
  await fs.ensureDir(path.join(source, '_retail_', 'units'));
  await fs.ensureDir(path.join(source, '_retail_', 'terrainart'));
  await fs.writeFile(path.join(source, 'Install Guide.txt'), 'ignore');
  await fs.writeFile(path.join(source, '_retail_', 'units', 'hero.mdx'), 'model');
  await fs.writeFile(path.join(source, '_retail_', 'terrainart', 'terrain.slk'), 'other');
  const imported = await importThirdPartySource(root, 1, { kind: 'directory', path: source });
  const slot = imported.slots[0];
  assert.equal(slot.imported, true);
  assert.equal(slot.enabled, false);
  assert.equal(await fs.pathExists(path.join(root, 'QM Assets 1', 'units', 'hero.mdx')), true);
  assert.equal(await fs.pathExists(path.join(retail, 'units', 'hero.mdx')), false);
  assert.equal(slot.features?.find(feature => feature.id === 'terrain')?.blocked, true);
  assert.equal(slot.features?.find(feature => feature.id === 'units')?.blocked, true);
  assert.equal(slot.features?.find(feature => feature.id === 'shaders')?.blocked, false);
  await assert.rejects(setThirdPartyFeature(root, 1, 'terrain', true), /冲突/);

  await setThirdPartyFeature(root, 1, 'shaders', false);
  await setThirdPartyEnabled(root, 1, true);
  assert.equal(await fs.pathExists(path.join(retail, 'units', 'hero.mdx')), true);
  assert.equal(await fs.pathExists(path.join(retail, 'QMoff', 'third-party', 'shaders')), true);
  assert.equal(await fs.pathExists(path.join(retail, 'shaders')), false);
  assert.equal(await fs.pathExists(path.join(root, 'QM Assets 1', 'units', 'hero.mdx')), true);

  await fs.writeFile(path.join(retail, 'units', 'hero.mdx'), 'player edited model');
  await fs.outputFile(path.join(retail, 'shaders', 'extra.bls'), 'player shader');
  await setThirdPartyEnabled(root, 1, false);
  assert.equal(await fs.pathExists(path.join(retail, 'units', 'hero.mdx')), false);
  assert.equal(await fs.pathExists(path.join(retail, 'shaders')), true);
  assert.equal(await fs.pathExists(path.join(retail, 't00', 'tile.txt')), true);
  const backupNames = await fs.readdir(path.join(root, '.quenching', 'player-file-backups'));
  const backup = path.join(root, '.quenching', 'player-file-backups', backupNames.find(name => name.startsWith('third-party-1-'))!);
  assert.equal(await fs.readFile(path.join(backup, 'modified', 'units', 'hero.mdx'), 'utf8'), 'player edited model');
  assert.equal(await fs.readFile(path.join(backup, '_leftovers', 'shaders', 'extra.bls'), 'utf8'), 'player shader');

  const zip = new JSZip();
  zip.file('Outer/Install Guide.txt', 'ignore');
  zip.file('Outer/_ptr_/t16/cliff.txt', 'tile');
  const zipPath = path.join(root, 'pack.zip');
  await fs.writeFile(zipPath, await zip.generateAsync({ type: 'nodebuffer' }));
  const fromZip = await importThirdPartySource(root, 2, { kind: 'zip', path: zipPath });
  assert.deepEqual(fromZip.slots[1].topLevel, ['t16']);
  assert.equal(fromZip.slots[1].features?.find(feature => feature.id === 'terrain')?.blocked, true);
  assert.equal(await fs.pathExists(path.join(root, 'QM Assets 2', 't16', 'cliff.txt')), true);
  assert.equal(await fs.pathExists(path.join(retail, 't16')), false);

  console.log('third-party resource smoke test passed');
} finally {
  await fs.remove(root);
  if (process.versions.electron) (await import('electron')).app.quit();
}
