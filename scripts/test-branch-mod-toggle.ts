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
  const basicFiles = [
    'PostProcessingConfig.txt', 'units/unitskin.txt', 'units/destructableskin.txt',
    'environment/dnc/dncashenvale/dncashenvaleterrain/dncashenvaleterrain.mdl',
    'shaders/ps/client-extra.bls', 'shaders/.quenching-shader-pack',
    'ui/console/client-extra.mdx', 'ui/.quenching-ui-style',
    'webui/index.html', 'webui/QuenchingOn.png', 'webui/Webms/mainmenu.webm',
    'terrainart/terrain.slk', 'textures/fx/flare/heroglow_bw.dds',
    'cos/custom/hd/heroes/Hamg/example/model.mdx',
    'ReplaceableTextures/CommandButtons/BTNQCustom_0123456789abcdef01234567.blp',
    'ReplaceableTextures/CommandButtonsDisabled/DISBTNQCustom_0123456789abcdef01234567.blp',
  ];
  for (const file of basicFiles) await fs.outputFile(path.join(ptr, file), `basic:${file}`);
  await fs.outputFile(path.join(ptr, 'ui', 'unrelated-user.txt'), 'unrelated UI');
  await fs.outputFile(path.join(ptr, 'textures', 'player-custom.blp'), 'player texture');
  await fs.outputFile(path.join(retail, 't00', 'player-custom.txt'), 'leave me active');
  // Enabling a valid branch is a logical switch and must never require a full
  // package, version marker, sentinel folders, or ownership manifest.
  await setBranchModEnabledOnDisk(ptr, true);
  assert.equal(await fs.pathExists(path.join(ptr, '.quenching', 'branch-toggle.json')), false);
  // A branch without a full package can still toggle basic client features.
  // Basic files still switch off without a package ownership manifest.
  await applyBranchModFilesForSwitch(ptr, false);
  for (const file of basicFiles) {
    assert.equal(await fs.pathExists(path.join(ptr, file)), false, `basic resource stays active: ${file}`);
    assert.equal(await fs.readFile(path.join(ptr, 'QMoff', file), 'utf8'), `basic:${file}`);
  }
  assert.equal(await fs.readFile(path.join(ptr, 'textures', 'player-custom.blp'), 'utf8'), 'player texture');
  await applyBranchModFilesForSwitch(ptr, true);
  for (const file of basicFiles) assert.equal(await fs.readFile(path.join(ptr, file), 'utf8'), `basic:${file}`);
  assert.equal(await fs.readFile(path.join(ptr, 't00', 'mod.txt'), 'utf8'), 'ptr mod');
  assert.equal(await fs.pathExists(path.join(ptr, '.quenching', 'branch-toggle.json')), false);
  // Upgrade an old disabled record that omitted the client's UI, DNC and post-processing.
  await fs.outputJson(path.join(ptr, '.quenching', 'branch-toggle.json'), { schema: 1, phase: 'disabled', moves: [] });
  assert.equal(await recoverBranchModToggle(ptr), false);
  for (const file of basicFiles) assert.equal(await fs.pathExists(path.join(ptr, file)), false);
  // A newly generated override while already off is parked too, keeping the original for rollback.
  await fs.outputFile(path.join(ptr, 'PostProcessingConfig.txt'), 'updated while off');
  await setBranchModEnabledOnDisk(ptr, false);
  assert.equal(await fs.pathExists(path.join(ptr, 'PostProcessingConfig.txt')), false);
  await setBranchModEnabledOnDisk(ptr, true);
  assert.equal(await fs.readFile(path.join(ptr, 'PostProcessingConfig.txt'), 'utf8'), 'updated while off');
  for (const file of basicFiles.filter(file => file !== 'PostProcessingConfig.txt'))
    assert.equal(await fs.readFile(path.join(ptr, file), 'utf8'), `basic:${file}`);
  // An interrupted repair of an already-off branch rolls back only the newly moved files.
  await setBranchModEnabledOnDisk(ptr, false);
  const previous = await fs.readJson(path.join(ptr, '.quenching', 'branch-toggle.json'));
  const addition = { active: 'webui/QuenchingOn.png', parked: 'QMoff/branch-residuals/crash/webui/QuenchingOn.png' };
  await fs.outputFile(path.join(ptr, addition.parked), 'interrupted new icon');
  await fs.outputJson(path.join(ptr, '.quenching', 'branch-toggle.json'), {
    schema: 1, phase: 'disabling', moves: previous.moves, previousMoves: previous.moves, pendingMoves: [addition],
  });
  assert.equal(await recoverBranchModToggle(ptr), false);
  assert.equal(await fs.readFile(path.join(ptr, addition.active), 'utf8'), 'interrupted new icon');
  assert.equal(await fs.pathExists(path.join(ptr, 'PostProcessingConfig.txt')), false);
  await setBranchModEnabledOnDisk(ptr, true);
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

  // A previous profile or package update can remove a parked DNC after disable.
  // Missing optional resources must not block restoring remaining files.
  await setBranchModEnabledOnDisk(retail, false);
  const staleMove = { active: 'environment/dnc/dncashenvale/dncashenvaleterrain/dncashenvaleterrain.mdl', parked: 'QMoff/environment/dnc/dncashenvale/dncashenvaleterrain/dncashenvaleterrain.mdl' };
  const journal = await fs.readJson(path.join(retail, '.quenching', 'branch-toggle.json'));
  journal.moves.push(staleMove);
  await fs.outputJson(path.join(retail, '.quenching', 'branch-toggle.json'), journal);
  await setBranchModEnabledOnDisk(retail, true);
  assert.equal(await isBranchModDisabled(retail), false);
  assert.equal(await fs.readFile(path.join(retail, 't00', 'mod.txt'), 'utf8'), 'retail mod');
  assert.equal(await fs.readFile(path.join(retail, 't00', 'player-custom.txt'), 'utf8'), 'leave me active');
  await fs.outputJson(path.join(retail, '.quenching', 'branch-toggle.json'), { schema: 1, phase: 'enabling', moves: [staleMove] });
  assert.equal(await recoverBranchModToggle(retail), false);
  await setBranchModEnabledOnDisk(retail, true);
  assert.equal(await isBranchModDisabled(retail), false);

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
