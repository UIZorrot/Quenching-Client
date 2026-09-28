import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { cloneBranchPackage } from '../src/Main/services/branch-package-copy';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-copy-'));
const retail = path.join(root, '_retail_');
const ptr = path.join(root, '_ptr_');
try {
  await fs.ensureDir(ptr);
  await fs.outputFile(path.join(retail, 't00', 'mod.txt'), 'owned mod');
  await fs.outputFile(path.join(retail, 't00', 'player.txt'), 'player customization');
  await fs.outputFile(path.join(retail, 'QMoff', 'textures', 'parked.txt'), 'parked mod');
  await fs.outputFile(path.join(retail, '_patch', 'keep.que'), '-v3.5-\n');
  const file = (relative: string, value: string) => ({
    path: relative, size: Buffer.byteLength(value), sha256: crypto.createHash('sha256').update(value).digest('hex'),
  });
  const records = [file('t00/mod.txt', 'owned mod'), file('textures/parked.txt', 'parked mod')];
  const filesDigest = crypto.createHash('sha256').update(records
    .map((record) => `${record.path}\0${record.size}\0${record.sha256}\n`).join('')).digest('hex');
  await fs.outputFile(path.join(retail, '_patch', 'qmf-3.5.files.json.gz'), zlib.gzipSync(JSON.stringify({
    schema: 1, product: 'quenching-mod', version: '3.5', sequence: 35, filesDigest, files: records,
  })));
  await fs.outputFile(path.join(ptr, 't00', 'mod.txt'), 'player file');
  await assert.rejects(cloneBranchPackage(retail, ptr), /already contains/);
  assert.equal(await fs.readFile(path.join(ptr, 't00', 'mod.txt'), 'utf8'), 'player file');
  await fs.unlink(path.join(ptr, 't00', 'mod.txt'));
  assert.equal(await cloneBranchPackage(retail, ptr), 5);
  assert.equal(await fs.readFile(path.join(ptr, 't00', 'mod.txt'), 'utf8'), 'owned mod');
  assert.equal(await fs.readFile(path.join(ptr, 'QMoff', 'textures', 'parked.txt'), 'utf8'), 'parked mod');
  assert.equal(await fs.pathExists(path.join(ptr, 't00', 'player.txt')), false);
  assert.equal((await fs.readJson(path.join(ptr, '.quenching', 'installed-mod.json'))).version, '3.5');
  assert.equal(await fs.readFile(path.join(retail, 't00', 'player.txt'), 'utf8'), 'player customization');
  const disposableStage = path.join(root, '.quenching-zip-stage-test');
  const zipTarget = path.join(root, '_zip_target_');
  await fs.copy(retail, disposableStage);
  await fs.ensureDir(zipTarget);
  await fs.outputFile(path.join(zipTarget, 't00', 'mod.txt'), 'different player file');
  const progress: number[] = [];
  assert.equal(await cloneBranchPackage(disposableStage, zipTarget, {
    linkDisposableSource: true, onProgress: (percent) => progress.push(percent),
  }), 5);
  assert.ok(progress.length > 0 && progress.at(-1) === 100);
  const backups = (await fs.readdir(path.join(zipTarget, '.quenching'))).filter(name => name.startsWith('preinstall-backup-'));
  assert.equal(backups.length, 1);
  assert.equal(await fs.readFile(path.join(zipTarget, '.quenching', backups[0], 't00', 'mod.txt'), 'utf8'), 'different player file');
  await fs.remove(disposableStage);
  assert.equal(await fs.readFile(path.join(zipTarget, 't00', 'mod.txt'), 'utf8'), 'owned mod');
  assert.equal(await fs.readFile(path.join(zipTarget, 'QMoff', 'textures', 'parked.txt'), 'utf8'), 'parked mod');
  assert.equal((await fs.readJson(path.join(zipTarget, '.quenching', 'installed-mod.json'))).version, '3.5');
  const duplicateSource = path.join(root, '.quenching-zip-stage-duplicate');
  const duplicateTarget = path.join(root, '_duplicate_target_');
  await fs.copy(retail, duplicateSource);
  await fs.ensureDir(duplicateTarget);
  const duplicateRecords = [...records, records[0]];
  const duplicateDigest = crypto.createHash('sha256').update([...duplicateRecords]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(record => `${record.path}\0${record.size}\0${record.sha256}\n`).join('')).digest('hex');
  await fs.outputFile(path.join(duplicateSource, '_patch', 'qmf-3.5.files.json.gz'), zlib.gzipSync(JSON.stringify({
    schema: 1, product: 'quenching-mod', version: '3.5', sequence: 35,
    filesDigest: duplicateDigest, files: duplicateRecords,
  })));
  assert.equal(await cloneBranchPackage(duplicateSource, duplicateTarget, { linkDisposableSource: true }), 5);
  assert.equal(await fs.readFile(path.join(duplicateTarget, 't00', 'mod.txt'), 'utf8'), 'owned mod');
  const another = path.join(root, '_ptr_second_');
  await fs.ensureDir(another);
  await fs.writeFile(path.join(retail, 't00', 'mod.txt'), 'modified after install');
  assert.equal(await fs.readFile(path.join(ptr, 't00', 'mod.txt'), 'utf8'), 'owned mod');
  await assert.rejects(cloneBranchPackage(retail, another), /modified package file/);
  assert.deepEqual(await fs.readdir(another), []);
  console.log('Branch package copy, conflict protection, and custom-file preservation passed');
} finally {
  await fs.remove(root);
}
