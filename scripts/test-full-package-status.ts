import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { getMissingFullPackageResources, isFullPackageInstalled } from '../src/Main/services/full-package-service';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-full-package-status-'));

try {
  await fs.outputFile(path.join(root, '_patch', 'keep.que'), '-v3.5-\n');
  for (const name of ['t00', 't16', 't18', 't20', 'cos', 'RUnits', 'Rbuildings']) {
    await fs.outputFile(path.join(root, name, 'resource.dat'), 'resource');
  }
  for (const name of ['d00', 'd16', 'd18', 'd20']) {
    await fs.outputFile(path.join(root, 'QMoff', 'doodads', 'que', name, 'resource.dat'), 'resource');
  }
  for (const name of ['t00', 't16', 't18', 't20', 'tc']) {
    await fs.outputFile(path.join(root, 'QMoff', 'replaceabletextures', 'tree', name, 'resource.dat'), 'resource');
  }

  assert.deepEqual(await getMissingFullPackageResources(root), []);
  assert.equal(await isFullPackageInstalled(root), true);

  await fs.remove(path.join(root, 'QMoff', 'doodads', 'que', 'd20'));
  assert.deepEqual(await getMissingFullPackageResources(root), ['d20']);
  assert.equal(await isFullPackageInstalled(root), false);
  console.log('Full package status checks passed');
} finally {
  await fs.remove(root);
}
