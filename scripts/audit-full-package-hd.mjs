import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yauzl from 'yauzl';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.argv[2] || 'D:/Quenching/QM/3.5/QMF3.5');
const assets = path.join(repo, 'assets', 'quenching');
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function exists(file) {
  try { await fs.stat(file); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
async function same(a, b) {
  assert.equal(sha(await fs.readFile(a)), sha(await fs.readFile(b)), `${a} differs from ${b}`);
}
async function filesUnder(dir) {
  const files = [];
  async function walk(folder, relative = '') {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const next = path.join(relative, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symbolic link in audit: ${next}`);
      if (entry.isDirectory()) await walk(path.join(folder, entry.name), next);
      else if (entry.isFile()) files.push(next);
    }
  }
  await walk(dir);
  return files.sort();
}
async function sameTree(a, b) {
  const left = await filesUnder(a);
  const right = await filesUnder(b);
  assert.deepEqual(left, right, `Different file lists: ${a} and ${b}`);
  for (const relative of left) await same(path.join(a, relative), path.join(b, relative));
  return left.length;
}
async function verifyPublicEnvironment(zipPath, environmentDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openError, zip) => {
      if (openError) return reject(openError);
      let checked = 0;
      zip.on('error', reject);
      zip.on('end', () => resolve(checked));
      zip.on('entry', (entry) => {
        if (entry.fileName.endsWith('/')) return zip.readEntry();
        const relative = entry.fileName.replaceAll('\\', '/');
        if (relative.split('/').some((part) => part === '..' || part === '') || !/^(environmentmap|foliage|sky)\//i.test(relative)) {
          return reject(new Error(`Unexpected environment ZIP entry: ${relative}`));
        }
        zip.openReadStream(entry, async (streamError, stream) => {
          if (streamError) return reject(streamError);
          const chunks = [];
          try {
            for await (const chunk of stream) chunks.push(chunk);
            const payload = Buffer.concat(chunks);
            assert.equal(payload.length, entry.uncompressedSize, relative);
            assert.equal(sha(payload), sha(await fs.readFile(path.join(environmentDir, ...relative.split('/')))), relative);
            checked += 1;
            zip.readEntry();
          } catch (error) { reject(error); }
        });
      });
      zip.readEntry();
    });
  });
}

for (const relative of [
  'replaceabletextures/water', 'terrainart/water.slk',
  'textures/shoreline1.dds', 'textures/shorelineparticlexy.dds',
  'shaders',
]) assert.equal(await exists(path.join(root, relative)), false, `Unexpected active override: ${relative}`);
for (const relative of [
  'replaceabletextures/water-rel', 'replaceabletextures/water-trans',
  'textures/_setting/shoreline1.dds', 'textures/_setting/shorelineparticlexy.dds',
  'textures/fx/shoreline1.dds', 'textures/fx/shorelineparticlexy.dds',
]) assert.equal(await exists(path.join(root, relative)), true, `Missing optional water asset: ${relative}`);
for (const name of ['water-rel', 'water-trans']) {
  await sameTree(path.join(root, 'replaceabletextures', name), path.join(assets, 'water', name));
}
for (const name of ['shoreline1.dds', 'shorelineparticlexy.dds']) {
  await same(path.join(root, 'textures', 'fx', name), path.join(assets, 'water', 'shoreline', name));
}

await same(path.join(root, 'units/unitskin.txt'), path.join(root, 'units/unitskin2.txt'));
await same(path.join(root, 'units/unitskin.txt'), path.join(assets, 'skin/unitskin-new.txt'));
const treeSkin = (await fs.readFile(path.join(root, 'units/destructableskin.txt'), 'utf8')).replaceAll('\\', '/').toLowerCase();
assert.match(treeSkin, /replaceabletextures\/tree\/t20\//);
assert.match(treeSkin, /doodads\/que\/d20\//);
for (const relative of ['doodads/que/d20', 'replaceabletextures/tree/t20']) {
  assert.equal(await exists(path.join(root, relative)), true, `Missing HD tree resource: ${relative}`);
}

await same(path.join(root, 'terrainart/terrain.slk'), path.join(assets, 'tile/terrain20.slk'));
await same(path.join(root, 'terrainart/clifftypes.slk'), path.join(assets, 'tile/clifftypes20.slk'));
assert.equal((await fs.readFile(path.join(root, 'terrainart/meta.que'), 'utf8')).trim(), '20');
for (const name of ['ashenvale', 'cityscape', 'cityscaperuins', 'felwood', 'lordaeronfall', 'lordaeronsummer', 'lordaeronwinter', 'village', 'villagefall']) {
  assert.equal(await exists(path.join(root, 'terrainart', name)), false, `t30 terrain still active: ${name}`);
  assert.equal(await exists(path.join(root, 't30', name)), true, `t30 backup missing: ${name}`);
}

const dnc = await sameTree(path.join(root, 'environment/dnc'), path.join(assets, 'dnc/dnc30-hd'));
const manualHdShaders = await sameTree(path.join(root, '_manual/_30/shaders-hd'), path.join(assets, 'shaders/shaders-300-hd'));
const manualDeShaders = await sameTree(path.join(root, '_manual/_30/shaders-de'), path.join(assets, 'shaders/shaders-300-de'));
const publicEnvironment = await verifyPublicEnvironment(path.join(assets, 'env-20-30-public.zip'), path.join(root, 'environment'));

console.log(JSON.stringify({ result: 'HD full-package audit passed', dncFiles: dnc, hdShaderFiles: manualHdShaders, deShaderFiles: manualDeShaders, publicEnvironmentFiles: publicEnvironment, water: 'Warcraft default', terrain: 't20/HD', units: 'unitskin2/HD', t30: 'parked' }, null, 2));
