import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { removeActiveWaterOverrides, syncGraphicsLayout } from '../src/Main/services/graphics-layout-service';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-graphics-layout-'));
const retail = root;
const waterDir = path.join(retail, 'replaceabletextures', 'water');
const waterSlk = path.join(retail, 'terrainart', 'water.slk');

try {
  await fs.ensureDir(waterDir);
  await fs.outputFile(path.join(waterDir, 'water.blp'), 'existing water');
  await fs.outputFile(waterSlk, 'existing water data');
  await fs.outputFile(path.join(retail, 'shaders', 'ps', 'hd.bls'), 'selected shader');

  assert.deepEqual(await syncGraphicsLayout(root, 'sd'), { waterNeedsReapply: false });
  assert.equal(await fs.pathExists(path.join(retail, 'shaders')), false);
  assert.equal(await fs.pathExists(waterDir), false);
  assert.equal(await fs.readFile(path.join(retail, 'QMoff', 'shaders', 'ps', 'hd.bls'), 'utf8'), 'selected shader');

  assert.deepEqual(await syncGraphicsLayout(root, 'hd'), { waterNeedsReapply: false });
  assert.equal(await fs.readFile(path.join(retail, 'shaders', 'ps', 'hd.bls'), 'utf8'), 'selected shader');
  assert.equal(await fs.readFile(path.join(waterDir, 'water.blp'), 'utf8'), 'existing water');

  assert.deepEqual(await syncGraphicsLayout(root, 'hd'), { waterNeedsReapply: false });
  assert.deepEqual(await syncGraphicsLayout(root, 'hd'), { waterNeedsReapply: false });

  assert.deepEqual(await syncGraphicsLayout(root, 'de'), { waterNeedsReapply: false });
  assert.equal(await fs.pathExists(waterDir), false);
  assert.equal(await fs.pathExists(waterSlk), false);
  assert.equal(await fs.pathExists(path.join(retail, 'QMoff', 'water-history')), false);

  assert.deepEqual(await syncGraphicsLayout(root, 'hd', { waterMode: 'transparent' }), { waterNeedsReapply: true });
  assert.equal(await fs.pathExists(waterDir), false);
  assert.equal(await fs.pathExists(waterSlk), false);
  assert.deepEqual(await syncGraphicsLayout(root, 'hd', { waterMode: 'off' }), { waterNeedsReapply: false });

  const shoreline = path.join(retail, 'textures', 'shoreline1.dds');
  await fs.outputFile(shoreline, 'existing shoreline');
  assert.deepEqual(await syncGraphicsLayout(root, 'de'), { waterNeedsReapply: false });
  assert.equal(await fs.pathExists(shoreline), false);
  assert.deepEqual(await syncGraphicsLayout(root, 'hd', { waterMode: 'off' }), { waterNeedsReapply: false });

  await fs.outputFile(path.join(waterDir, 'water.blp'), 'existing water');
  await fs.outputFile(waterSlk, 'existing water data');
  await fs.outputFile(shoreline, 'existing shoreline');
  await fs.outputFile(path.join(retail, 'QMoff', 'water-history', 'old', 'terrainart', 'water.slk'), 'legacy parked water');
  await removeActiveWaterOverrides(root);
  assert.equal(await fs.pathExists(waterDir), false);
  assert.equal(await fs.pathExists(waterSlk), false);
  assert.equal(await fs.pathExists(shoreline), false);
  assert.equal(await fs.pathExists(path.join(retail, 'QMoff', 'water-history')), false);
  assert.deepEqual(await syncGraphicsLayout(root, 'hd', { waterMode: 'off' }), { waterNeedsReapply: false });

  const vanillaRoot = path.join(root, 'vanilla');
  await fs.ensureDir(vanillaRoot);
  assert.deepEqual(await syncGraphicsLayout(vanillaRoot, 'hd', { waterMode: 'off' }), { waterNeedsReapply: false });
  assert.equal(await fs.pathExists(path.join(vanillaRoot, 'replaceabletextures', 'water')), false);

  const waterAssets = { waterRoot: path.join(root, 'client-assets', 'water'), tileRoot: path.join(root, 'client-assets', 'tile') };
  const managedRoot = path.join(root, 'managed-water');
  await fs.outputFile(path.join(waterAssets.waterRoot, 'water-trans', 'water.blp'), 'bundled water');
  await fs.outputFile(path.join(waterAssets.waterRoot, 'shoreline', 'shoreline1.dds'), 'bundled shoreline');
  await fs.outputFile(path.join(waterAssets.tileRoot, 'water-trans.slk'), 'bundled water table');
  await fs.copy(path.join(waterAssets.waterRoot, 'water-trans'), path.join(managedRoot, 'replaceabletextures', 'water'));
  await fs.copy(path.join(waterAssets.waterRoot, 'shoreline', 'shoreline1.dds'), path.join(managedRoot, 'textures', 'shoreline1.dds'));
  await fs.copy(path.join(waterAssets.tileRoot, 'water-trans.slk'), path.join(managedRoot, 'terrainart', 'water.slk'));
  assert.deepEqual(await syncGraphicsLayout(managedRoot, 'de', { waterAssets }), { waterNeedsReapply: false });
  assert.equal(await fs.pathExists(path.join(managedRoot, 'replaceabletextures', 'water')), false);
  assert.equal(await fs.readFile(path.join(waterAssets.waterRoot, 'water-trans', 'water.blp'), 'utf8'), 'bundled water');
  assert.equal(await fs.readFile(path.join(waterAssets.tileRoot, 'water-trans.slk'), 'utf8'), 'bundled water table');
  assert.deepEqual(await syncGraphicsLayout(managedRoot, 'hd', { waterMode: 'transparent', waterAssets }), { waterNeedsReapply: true });

  const activeTextures = path.join(retail, 'textures');
  const parkedTextures = path.join(retail, 'QMoff', 'textures');
  await fs.outputFile(path.join(activeTextures, 'conflict.txt'), 'player-owned active file');
  await fs.outputFile(path.join(activeTextures, 'active-only.txt'), 'active-only');
  await fs.outputFile(path.join(parkedTextures, 'conflict.txt'), 'player-owned parked file');
  await fs.outputFile(path.join(parkedTextures, 'parked-only.txt'), 'parked-only');
  await syncGraphicsLayout(root, 'sd');
  assert.equal(await fs.pathExists(path.join(activeTextures, 'conflict.txt')), false);
  assert.equal(await fs.readFile(path.join(parkedTextures, 'conflict.txt'), 'utf8'), 'player-owned parked file');
  assert.equal(await fs.readFile(path.join(parkedTextures, 'active-only.txt'), 'utf8'), 'active-only');
  await syncGraphicsLayout(root, 'hd');
  assert.equal(await fs.readFile(path.join(activeTextures, 'conflict.txt'), 'utf8'), 'player-owned parked file');
  assert.equal(await fs.pathExists(path.join(parkedTextures, 'conflict.txt')), false);
  assert.equal(await fs.readFile(path.join(activeTextures, 'parked-only.txt'), 'utf8'), 'parked-only');
  console.log('Graphics layout startup checks passed');
} finally {
  await fs.remove(root);
}
