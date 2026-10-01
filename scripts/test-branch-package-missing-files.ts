import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { cloneBranchPackage } from '../src/Main/services/branch-package-copy';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-package-missing-'));
const source = path.join(root, 'source');
const missing = 'environment/environmentmap/portraits/portraitdefault_ibl.dds';
try {
  await fs.outputFile(path.join(source, '_patch', 'keep.que'), '-v3.5-\n');
  await fs.outputFile(path.join(source, 'units', 'unitskin.txt'), 'updated resource');
  await fs.outputFile(path.join(source, 'QMoff', 'textures', 'parked.txt'), 'parked resource');
  await fs.outputFile(path.join(source, 'units', 'player-custom.txt'), 'source custom file');
  await fs.outputFile(path.join(source, '_patch', 'qmf-3.5.files.json.gz'), zlib.gzipSync(JSON.stringify({
    schema: 1, product: 'quenching-mod', version: '3.5', sequence: 35,
    files: [
      { path: missing, size: 2097460 },
      // The installed file may differ from the original release record.
      { path: 'units/unitskin.txt', size: 1, sha256: '0'.repeat(64) },
      { path: 'textures/parked.txt', size: 1 },
    ],
  })));
  for (const linkDisposableSource of [false, true]) {
    const target = path.join(root, linkDisposableSource ? 'zip-target' : 'branch-target');
    await fs.outputFile(path.join(target, 'units', 'my-custom.txt'), 'target custom file');
    const progress: number[] = [];
    assert.equal(await cloneBranchPackage(source, target, {
      linkDisposableSource, onProgress: (percent) => progress.push(percent),
    }), 5);
    assert.equal(await fs.pathExists(path.join(target, ...missing.split('/'))), false);
    assert.equal(await fs.readFile(path.join(target, 'units', 'unitskin.txt'), 'utf8'), 'updated resource');
    assert.equal(await fs.readFile(path.join(target, 'QMoff', 'textures', 'parked.txt'), 'utf8'), 'parked resource');
    assert.equal(await fs.readFile(path.join(target, 'units', 'my-custom.txt'), 'utf8'), 'target custom file');
    assert.equal(await fs.pathExists(path.join(target, 'units', 'player-custom.txt')), false);
    const installed = await fs.readJson(path.join(target, '.quenching', 'installed-mod.json'));
    assert.deepEqual(installed.files, ['units/unitskin.txt', 'textures/parked.txt']);
    assert.equal(progress.at(-1), 100);
  }
  assert.equal(await fs.pathExists(path.join(source, ...missing.split('/'))), false);
  console.log('ZIP installation and branch copy skip absent files and preserve unrelated custom files.');
} finally {
  await fs.remove(root);
}
