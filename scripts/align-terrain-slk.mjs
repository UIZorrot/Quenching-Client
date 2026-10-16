/**
 * Refresh client/full-package SLKs from read-only native Warcraft tables.
 * Default: show the candidate changes. --write backs up every replaced file.
 * node scripts/align-terrain-slk.mjs --game-root GAME --full-package QMF --write
 * T30's partial texture routes are maintained by prepare-decisive-terrain.mjs.
 */
import fs from 'fs-extra';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readSlkTable, patchSlkCells } from './terrain-slk-utils.mjs';

const require = createRequire(import.meta.url);
const { Storage } = require('@jamiephan/casclib');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
if (!option('--game-root')) throw new Error('Pass --game-root with a Warcraft installation containing .build.info');
const gameRoot = path.resolve(option('--game-root'));
const fullRoot = option('--full-package') ? path.resolve(option('--full-package')) : null;
if (!(await fs.pathExists(path.join(gameRoot, '.build.info')))) throw new Error('Game build metadata is missing');
if (fullRoot && !(await fs.pathExists(path.join(fullRoot, '_patch', 'keep.que')))) throw new Error('Full-package marker is missing');
const assetRoot = path.join(repo, 'assets', 'quenching', 'tile');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const native = {};
const storage = new Storage();
try {
    storage.open(`${gameRoot}*w3`);
    for (const name of ['clifftypes', 'terrain', 'water']) {
        const file = storage.openFile(`war3.w3mod:terrainart\\${name}.slk`);
        try { native[name] = file.readAll(); } finally { file.close(); }
    }
} finally { storage.close(); }

const plans = [];
const candidates = new Map();
for (const name of ['clifftypes', 'terrain']) {
    const content = native[name].toString('latin1');
    const original = readSlkTable(content);
    const managed = name === 'terrain' ? ['dir'] : ['texDir', 'texFile'];
    for (const version of ['00', '16', '18', '20']) {
        const relative = `${name}${version}.slk`;
        const custom = readSlkTable(await fs.readFile(path.join(assetRoot, relative), 'latin1'));
        const updates = new Map();
        for (const [id, row] of custom.rows) {
            const base = original.rows.get(id);
            if (!base) throw new Error(`${relative}: custom record ${id} has no native baseline`);
            // Preserve existing MOD paths; reject unrelated changes rather than
            // silently resetting them while updating the official baseline.
            for (const [field, value] of row) {
                if (!managed.includes(field) && value !== undefined && value !== base.get(field)) {
                    throw new Error(`${relative}: unmanaged change at ${id}.${field}`);
                }
            }
            updates.set(id, new Map(managed.map(field => [field, row.get(field)])));
        }
        const bytes = Buffer.from(patchSlkCells(content, updates), 'latin1');
        candidates.set(relative, bytes);
        plans.push({ kind: 'client', relative, target: path.join(assetRoot, relative), bytes });
    }
}

// Match the existing transparent-water behavior: black RGB, native alpha,
// animation, height, movement, shore and all other values, including uSha.
const waterText = native.water.toString('latin1');
const waterTable = readSlkTable(waterText);
const colors = [...waterTable.headers.values()].filter(field => /^mm(?:Red|Green|Blue)$|^[SD](?:min|max)_[RGB]$/.test(field));
if (colors.length !== 15) throw new Error('Unexpected native water RGB schema');
const waterUpdates = new Map([...waterTable.rows.keys()].map(id => [id, new Map(colors.map(field => [field, 0]))]));
const transparentWater = Buffer.from(patchSlkCells(waterText, waterUpdates), 'latin1');
for (const relative of ['water.slk', 'water-trans.slk']) {
    candidates.set(relative, transparentWater);
    plans.push({ kind: 'client', relative, target: path.join(assetRoot, relative), bytes: transparentWater });
}

if (fullRoot) {
    const mappings = [
        ['terrainart/terrain.slk', 'terrain20.slk'],
        ['terrainart/clifftypes.slk', 'clifftypes20.slk'],
        ['terrainart/_setting/terrain.slk', 'terrain20.slk'],
        ['terrainart/_setting/clifftypes.slk', 'clifftypes20.slk'],
        ['terrainart/_setting/water.slk', 'water-trans.slk'],
        ...['00', '16', '18'].map(version => [`t${version}/clifftypes.slk`, `clifftypes${version}.slk`]),
        ...['16', '18'].flatMap(version => [
            [`t${version}/terrain-que/terrain.slk`, `terrain${version}.slk`],
            [`t${version}/terrain-que/clifftypes.slk`, `clifftypes${version}.slk`],
            [`t${version}/terrain-que/water.slk`, 'water-trans.slk'],
        ]),
    ];
    for (const [relative, source] of mappings) {
        const target = path.join(fullRoot, relative);
        // Never introduce active SLKs into a package already configured for DE.
        if (await fs.pathExists(target)) plans.push({ kind: 'full-package', relative, target, bytes: candidates.get(source) });
    }
}

for (const plan of plans) {
    const before = await fs.readFile(plan.target);
    plan.beforeSha256 = sha(before);
    plan.sha256 = sha(plan.bytes);
    plan.changed = plan.beforeSha256 !== plan.sha256;
}
const changed = plans.filter(plan => plan.changed);
console.log(`Native records: cliffs=${readSlkTable(native.clifftypes.toString('latin1')).rows.size}, terrain=${readSlkTable(native.terrain.toString('latin1')).rows.size}, water=${waterTable.rows.size}`);
console.log(`Candidates: ${plans.length}; changed: ${changed.length}`);
for (const plan of changed) console.log(`${plan.kind}: ${plan.relative}`);

if (args.includes('--write') && changed.length) {
    const backupParent = path.join(repo, '_backup');
    await fs.ensureDir(backupParent);
    const backup = await fs.mkdtemp(path.join(backupParent, 'terrain-slk-alignment-'));
    // Back up every original before any asset or full-package file is replaced.
    for (const plan of changed) await fs.copy(plan.target, path.join(backup, plan.kind, plan.relative), { overwrite: false, errorOnExist: true });
    for (const [name, bytes] of Object.entries(native)) await fs.outputFile(path.join(backup, 'native', `${name}.slk`), bytes);
    await fs.outputJson(path.join(backup, 'report.json'), {
        gameRoot, fullRoot,
        buildInfo: await fs.readFile(path.join(gameRoot, '.build.info'), 'utf8'),
        files: plans.map(({ kind, relative, beforeSha256, sha256, changed }) => ({ kind, relative, beforeSha256, sha256, changed })),
    }, { spaces: 2 });
    for (const plan of changed) await fs.writeFile(plan.target, plan.bytes);
    console.log(`Updated ${changed.length} files; originals and native baseline: ${backup}`);
}
