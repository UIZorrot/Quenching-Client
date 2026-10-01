import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { applyBranchModFilesForSwitch, isBranchModDisabled, recoverBranchModToggle, setBranchModEnabledOnDisk } from '../src/Main/services/branch-mod-toggle';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-branch-toggle-'));
const retail = path.join(root, '_retail_');
const ptr = path.join(root, '_ptr_');
const legacy = path.join(root, 'legacy-retail');
const legacyClosed = path.join(root, 'legacy-closed');
const previousBaselineManifest = process.env.QUENCHING_BASELINE_MANIFEST;
try {
  await fs.outputFile(path.join(retail, 't00', 'mod.txt'), 'retail mod');
  await fs.outputFile(path.join(retail, 'textures', 'same.txt'), 'retail active custom');
  await fs.outputFile(path.join(retail, 'QMoff', 'textures', 'same.txt'), 'retail SD parked custom');
  await fs.outputFile(path.join(ptr, 't00', 'mod.txt'), 'ptr mod');
  await fs.outputFile(path.join(retail, 't00', 'player-custom.txt'), 'leave me active');
  // Enabling a valid branch is a logical switch and must never require a full
  // package, version marker, sentinel folders, or ownership manifest.
  await setBranchModEnabledOnDisk(ptr, true);
  assert.equal(await fs.pathExists(path.join(ptr, '.quenching', 'branch-toggle.json')), false);
  // A branch without a full package can still toggle basic client features.
  // Its loose files are not package-owned and must not be moved.
  await applyBranchModFilesForSwitch(ptr, false);
  await applyBranchModFilesForSwitch(ptr, true);
  assert.equal(await fs.readFile(path.join(ptr, 't00', 'mod.txt'), 'utf8'), 'ptr mod');
  assert.equal(await fs.pathExists(path.join(ptr, '.quenching', 'branch-toggle.json')), false);
  const owned = ['t00/mod.txt', 'textures/same.txt'];
  const records = owned.map((file) => {
    const value = file === 't00/mod.txt' ? 'retail mod' : 'retail active custom';
    return { path: file, size: Buffer.byteLength(value), sha256: crypto.createHash('sha256').update(value).digest('hex') };
  });
  const filesDigest = crypto.createHash('sha256').update(records.map((record) =>
    `${record.path}\0${record.size}\0${record.sha256}\n`).join('')).digest('hex');
  await fs.outputFile(path.join(retail, '_patch', 'keep.que'), '-v3.5-\n');
  await fs.outputFile(path.join(retail, '_patch', 'qmf-3.5.files.json.gz'), zlib.gzipSync(JSON.stringify({
    schema: 1, product: 'quenching-mod', version: '3.5', filesDigest, files: records,
  })));

  await setBranchModEnabledOnDisk(retail, false);
  assert.equal(await isBranchModDisabled(retail), true);
  assert.equal(await fs.pathExists(path.join(retail, 't00', 'mod.txt')), false);
  assert.equal(await fs.readFile(path.join(retail, 'QMoff', 't00', 'mod.txt'), 'utf8'), 'retail mod');
  assert.equal(await fs.readFile(path.join(retail, 'QMoff', 'textures', 'same.txt'), 'utf8'), 'retail active custom');
  assert.equal(await fs.readFile(path.join(ptr, 't00', 'mod.txt'), 'utf8'), 'ptr mod');
  assert.equal(await fs.readFile(path.join(retail, 't00', 'player-custom.txt'), 'utf8'), 'leave me active');

  await fs.outputFile(path.join(retail, 'textures', 'same.txt'), 'new player file');
  await applyBranchModFilesForSwitch(retail, true);
  assert.equal(await isBranchModDisabled(retail), false);
  assert.equal(await fs.readFile(path.join(retail, 'textures', 'same.txt'), 'utf8'), 'retail active custom');
  assert.equal(await fs.pathExists(path.join(retail, 'QMoff', 'textures', 'same.txt')), false);
  assert.equal(await fs.readFile(path.join(retail, 't00', 'mod.txt'), 'utf8'), 'retail mod');

  await fs.outputFile(path.join(retail, '.quenching', 'branch-toggle.json'), JSON.stringify({
    schema: 1, phase: 'disabling', moves: [
      { active: 't00/mod.txt', parked: 'QMoff/t00/mod.txt' },
      { active: 'textures/same.txt', parked: 'QMoff/textures/same.txt' },
    ],
  }));
  await fs.rename(path.join(retail, 't00', 'mod.txt'), path.join(retail, 'QMoff', 't00', 'mod.txt'));
  assert.equal(await recoverBranchModToggle(retail), true);
  assert.equal(await fs.readFile(path.join(retail, 't00', 'mod.txt'), 'utf8'), 'retail mod');
  assert.equal(await fs.pathExists(path.join(retail, '.quenching', 'branch-toggle.json')), false);

  const legacyOwned = ['Rbuildings/owned.txt', 'RetroTex/owned.txt', 'RUnits/owned.txt'];
  const legacyRecords = legacyOwned.map((file) => ({
    path: file,
    size: Buffer.byteLength(file),
    sha256: crypto.createHash('sha256').update(file).digest('hex'),
  }));
  const legacyDigest = crypto.createHash('sha256').update(legacyRecords.map((record) =>
    `${record.path}\0${record.size}\0${record.sha256}\n`).join('')).digest('hex');
  const legacyManifest = path.join(root, 'qmf-3.4.files.json.gz');
  await fs.outputFile(legacyManifest, zlib.gzipSync(JSON.stringify({
    schema: 1, product: 'quenching-mod', version: '3.4', sequence: 34,
    generatedAt: new Date().toISOString(), filesDigest: legacyDigest, files: legacyRecords,
  })));
  process.env.QUENCHING_BASELINE_MANIFEST = legacyManifest;
  for (const file of legacyOwned) await fs.outputFile(path.join(legacy, ...file.split('/')), file);
  await fs.outputFile(path.join(legacy, 'RUnits', 'player-custom.txt'), 'leave legacy custom file active');

  await setBranchModEnabledOnDisk(legacy, false);
  assert.equal(await isBranchModDisabled(legacy), true);
  for (const file of legacyOwned) {
    assert.equal(await fs.pathExists(path.join(legacy, ...file.split('/'))), false);
    assert.equal(await fs.readFile(path.join(legacy, 'QMoff', ...file.split('/')), 'utf8'), file);
  }
  assert.equal(await fs.readFile(path.join(legacy, 'RUnits', 'player-custom.txt'), 'utf8'), 'leave legacy custom file active');
  await setBranchModEnabledOnDisk(legacy, true);
  for (const file of legacyOwned) assert.equal(await fs.readFile(path.join(legacy, ...file.split('/')), 'utf8'), file);

  // A 3.4 client could leave an installed package parked in QMoff without a
  // branch-toggle journal. The first 3.5 enable restores only bundled files.
  for (const file of legacyOwned) await fs.outputFile(path.join(legacyClosed, 'QMoff', ...file.split('/')), file);
  await fs.outputFile(path.join(legacyClosed, 'QMoff', 'RUnits', 'player-custom.txt'), 'leave parked custom file alone');
  await setBranchModEnabledOnDisk(legacyClosed, true);
  for (const file of legacyOwned) assert.equal(await fs.readFile(path.join(legacyClosed, ...file.split('/')), 'utf8'), file);
  assert.equal(await fs.readFile(path.join(legacyClosed, 'QMoff', 'RUnits', 'player-custom.txt'), 'utf8'), 'leave parked custom file alone');
  assert.equal(await fs.pathExists(path.join(legacyClosed, '.quenching', 'branch-toggle.json')), false);
  console.log('Branch toggle replaces stale duplicates and recovers interrupted moves');
} finally {
  if (previousBaselineManifest === undefined) delete process.env.QUENCHING_BASELINE_MANIFEST;
  else process.env.QUENCHING_BASELINE_MANIFEST = previousBaselineManifest;
  await fs.remove(root);
}
