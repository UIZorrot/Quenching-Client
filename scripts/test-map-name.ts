import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { Archive } from '@jamiephan/stormlib';
import { readMapName, writeMapName } from '../src/Main/services/map-name';

// Minimal w3i (format 31): header ints, 4 game-version ints, then name/author/description/players strings.
function buildW3i(name: string): Buffer {
    const ints = Buffer.alloc(28);
    ints.writeInt32LE(31, 0);
    const strings = Buffer.from(`${name}\0author\0description\0players\0`, 'utf8');
    return Buffer.concat([ints, strings, Buffer.from([1, 2, 3, 4])]);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-map-name-'));
try {
    const mapPath = path.join(workDir, 'unlock.w3x');
    const w3iPath = path.join(workDir, 'war3map.w3i');
    fs.writeFileSync(w3iPath, buildW3i(''));
    const archive = new Archive();
    archive.create(mapPath, { maxFileCount: 16, flags: 0 });
    assert.ok(archive.addFile(w3iPath, 'war3map.w3i'));
    archive.close();

    assert.equal(readMapName(mapPath), '');
    await writeMapName(mapPath, 'Quenching: Odblokuj kampanię');
    assert.equal(readMapName(mapPath), 'Quenching: Odblokuj kampanię');

    // Everything after the name is kept byte for byte.
    const check = new Archive();
    check.open(mapPath);
    const file = check.openFile('war3map.w3i');
    const w3i = file.readAll();
    file.close();
    check.close();
    assert.deepEqual(w3i.subarray(w3i.indexOf(0, 28)), buildW3i('').subarray(28));
    assert.equal(fs.readdirSync(workDir).filter((name) => name.endsWith('.tmp')).length, 0);
} finally {
    fs.removeSync(workDir);
}

console.log('Map name test passed');
