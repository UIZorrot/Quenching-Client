import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { syncDecisiveTerrainTreeTextures } from '../src/Main/services/decisive-terrain-tree-textures';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-de-tree-textures-'));
const assets = path.resolve('assets', 'quenching');
const textures = path.join(root, 'replaceabletextures');
const expected = [
  'lordaerontree/lordaeronvillagetree_diffuse.dds',
  'lordaerontree/lordaeronwintertree_diffuse.dds',
  'ashenvaletree/ashencanopytree_diffuse.dds',
  'ashenvaletree/ashentree_diffuse.dds',
  'ashenvaletree/ashentree_orm.dds',
  'ashenvaletree/felwoodtree_diffuse.dds',
];

try {
  await fs.outputFile(path.join(textures, 'lordaerontree', 'lordaeronvillagetree_diffuse.dds'), 'old file');
  await fs.outputFile(path.join(textures, 'ashenvaletree', 'extra.txt'), 'existing extra');
  await fs.outputFile(path.join(textures, 'other', 'keep.txt'), 'unrelated');
  await syncDecisiveTerrainTreeTextures(root, assets, true);
  for (const file of expected) {
    assert.equal((await fs.stat(path.join(textures, file))).size, 2796368, file);
  }
  assert.equal(await fs.readFile(path.join(textures, 'ashenvaletree', 'extra.txt'), 'utf8'), 'existing extra');
  await syncDecisiveTerrainTreeTextures(root, assets, false);
  assert.equal(await fs.pathExists(path.join(textures, 'lordaerontree')), false);
  assert.equal(await fs.pathExists(path.join(textures, 'ashenvaletree')), false);
  assert.equal(await fs.readFile(path.join(textures, 'other', 'keep.txt'), 'utf8'), 'unrelated');
  await syncDecisiveTerrainTreeTextures(root, assets, true);
  assert.equal((await fs.stat(path.join(textures, expected[0]))).size, 2796368);
  console.log('Decisive terrain tree textures enable, overwrite, disable, and re-enable passed');
} finally {
  await fs.remove(root);
}
