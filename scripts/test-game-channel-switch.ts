import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { configManager } from '../src/Main/services/config-manager';
import { switchGameChannel } from '../src/Main/services/game-channel-switch';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-channel-switch-'));
const retail = path.join(root, '_retail_');
const ptr = path.join(root, '_ptr_');
const previousChannel = configManager.get('gameChannel');

try {
  await fs.outputFile(path.join(retail, 'x86_64', 'Warcraft III.exe'), 'retail exe');
  await fs.outputFile(path.join(ptr, 'x86_64', 'Warcraft III.exe'), 'ptr exe');
  await fs.outputFile(path.join(retail, 'units', 'destructableskin.txt'), 'skin');
  await fs.outputFile(path.join(retail, 'QMoff', 'shaders', 'ps', 'hd.bls'), 'parked shader');
  await fs.outputFile(path.join(retail, '_patch', 'keep.que'), '-v3.5-\n');
  await fs.outputJson(path.join(retail, '_QMThirdParty.json'), {
    activeSlotId: 1,
    slots: [
      { id: 1, imported: true, enabled: true, files: ['sound/custom.wav', 'x86_64/evil.dll'] },
      { id: 2, imported: true, enabled: false, files: ['abilities/off.txt'] },
    ],
  });
  await fs.outputFile(path.join(retail, 'sound', 'custom.wav'), 'third party');
  await fs.outputFile(path.join(retail, 'abilities', 'off.txt'), 'not enabled');
  await fs.outputFile(path.join(ptr, 'units', 'old.txt'), 'stale ptr copy');

  configManager.set('gameChannel', 'retail');
  await switchGameChannel(root, 'ptr');
  assert.equal(configManager.get('gameChannel'), 'ptr');
  assert.equal(await fs.readFile(path.join(ptr, 'units', 'destructableskin.txt'), 'utf8'), 'skin');
  assert.equal(await fs.pathExists(path.join(ptr, 'units', 'old.txt')), false);
  assert.equal(await fs.readFile(path.join(ptr, 'QMoff', 'shaders', 'ps', 'hd.bls'), 'utf8'), 'parked shader');
  assert.equal(await fs.pathExists(path.join(ptr, '_patch', 'keep.que')), true);
  assert.equal(await fs.pathExists(path.join(ptr, '_QMThirdParty.json')), true);
  for (const name of ['units', 'QMoff', '_patch', '_QMThirdParty.json', 'sound']) {
    assert.equal(await fs.pathExists(path.join(retail, name)), false, `${name} left in _retail_`);
  }
  assert.equal(await fs.readFile(path.join(ptr, 'sound', 'custom.wav'), 'utf8'), 'third party');
  assert.equal(await fs.pathExists(path.join(retail, 'abilities', 'off.txt')), true, 'disabled slots are not moved');
  assert.equal(await fs.readFile(path.join(retail, 'x86_64', 'Warcraft III.exe'), 'utf8'), 'retail exe');
  assert.equal(await fs.readFile(path.join(ptr, 'x86_64', 'Warcraft III.exe'), 'utf8'), 'ptr exe');

  await switchGameChannel(root, 'retail');
  assert.equal(await fs.readFile(path.join(retail, 'units', 'destructableskin.txt'), 'utf8'), 'skin');
  assert.equal(await fs.pathExists(path.join(ptr, 'units')), false);
  console.log('Game channel switch checks passed');
} finally {
  configManager.set('gameChannel', previousChannel);
  await fs.remove(root);
  process.exit(process.exitCode ?? 0);
}
