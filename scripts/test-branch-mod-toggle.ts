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
try {
  await fs.outputFile(path.join(retail, 't00', 'mod.txt'), 'retail mod');
  await fs.outputFile(path.join(retail, 'textures', 'same.txt'), 'retail active custom');
  await fs.outputFile(path.join(retail, 'QMoff', 'textures', 'same.txt'), 'retail SD parked custom');
  await fs.outputFile(path.join(ptr, 't00', 'mod.txt'), 'ptr mod');
  await fs.outputFile(path.join(retail, 't00', 'player-custom.txt'), 'leave me active');
  // A branch without a full package can still toggle basic client features.
  // Its loose files are not package-owned and must not be moved.
  await applyBranchModFilesForSwitch(ptr, false, false);
  await applyBranchModFilesForSwitch(ptr, true, false);
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
  await applyBranchModFilesForSwitch(retail, true, false);
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
  console.log('Branch toggle replaces stale duplicates and recovers interrupted moves');
} finally {
  await fs.remove(root);
}
