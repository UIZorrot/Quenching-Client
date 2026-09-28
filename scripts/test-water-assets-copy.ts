import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { copyWaterModeFromAssets, verifyWaterModeAssets } from '../src/Main/services/water-assets-service';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-water-assets-copy-'));
const assets = path.join(root, 'client-assets');
const templates = path.join(assets, 'quenching');
try {
  await fs.outputFile(path.join(templates, 'water', 'water-trans', 'texture.dds'), 'transparent source');
  await fs.outputFile(path.join(templates, 'water', 'water-rel', 'texture.dds'), 'realistic source');
  await fs.outputFile(path.join(templates, 'water', 'shoreline', 'shoreline1.dds'), 'shoreline 1 source');
  await fs.outputFile(path.join(templates, 'water', 'shoreline', 'shorelineparticlexy.dds'), 'shoreline 2 source');
  await fs.outputFile(path.join(templates, 'tile', 'water-trans.slk'), 'transparent table source');
  await fs.outputFile(path.join(templates, 'tile', 'water-rel.slk'), 'realistic table source');

  const transparent = path.join(root, 'game-transparent');
  await copyWaterModeFromAssets(transparent, assets, 'transparent');
  assert.equal(await fs.readFile(path.join(transparent, 'replaceabletextures', 'water', 'texture.dds'), 'utf8'), 'transparent source');
  assert.equal(await fs.readFile(path.join(transparent, 'textures', 'shoreline1.dds'), 'utf8'), 'shoreline 1 source');
  assert.equal(await fs.readFile(path.join(transparent, 'terrainart', 'water.slk'), 'utf8'), 'transparent table source');

  const realistic = path.join(root, 'game-realistic');
  await copyWaterModeFromAssets(realistic, assets, 'realistic');
  assert.equal(await fs.readFile(path.join(realistic, 'replaceabletextures', 'water', 'texture.dds'), 'utf8'), 'realistic source');
  assert.equal(await fs.pathExists(path.join(realistic, 'textures', 'shoreline1.dds')), false);
  assert.equal(await fs.readFile(path.join(realistic, 'terrainart', 'water.slk'), 'utf8'), 'realistic table source');

  // Sources must still be usable for a second installation and later switches.
  await verifyWaterModeAssets(assets, 'transparent');
  await verifyWaterModeAssets(assets, 'realistic');
  assert.equal(await fs.readFile(path.join(templates, 'water', 'water-trans', 'texture.dds'), 'utf8'), 'transparent source');
  assert.equal(await fs.readFile(path.join(templates, 'water', 'water-rel', 'texture.dds'), 'utf8'), 'realistic source');
  console.log('Water assets copy-only checks passed');
} finally {
  await fs.remove(root);
}
