// Map-name handling adapted from PR #7 by dariuszsikorski; only copied maps are edited.
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { Archive, MPQ_FILE_REPLACEEXISTING } from '@jamiephan/stormlib';

/** Offset of the map name string in war3map.w3i: format >= 28 adds four game-version ints. */
function nameOffset(w3i: Buffer): number {
    return w3i.readInt32LE(0) >= 28 ? 28 : 12;
}

/** Map name as shown in the game's map list (war3map.w3i), or null when it cannot be read. */
export function readMapName(mapPath: string): string | null {
    const archive = new Archive();
    archive.open(mapPath);
    try {
        if (!archive.hasFile('war3map.w3i')) return null;
        const file = archive.openFile('war3map.w3i');
        const w3i = file.readAll();
        file.close();
        const offset = nameOffset(w3i);
        return w3i.toString('utf8', offset, w3i.indexOf(0, offset));
    } finally {
        archive.close();
    }
}

/**
 * Write a map name into war3map.w3i so the map is not listed without a name.
 * Only the name string changes; every other w3i field is kept byte for byte.
 */
export async function writeMapName(mapPath: string, mapName: string): Promise<void> {
    // The native StormLib binding uses narrow filesystem paths. Keep native IO
    // in ASCII temp storage; Node copies to/from Unicode player directories.
    const candidates = [os.tmpdir(), path.join(process.env.PROGRAMDATA || path.parse(process.cwd()).root, 'QuenchingModClient', 'Temp')];
    let work = '';
    for (const base of candidates) {
        if (!/^[\x00-\x7f]+$/.test(base)) continue;
        try {
            await fs.ensureDir(base);
            work = await fs.mkdtemp(path.join(base, 'quenching-map-name-'));
            break;
        } catch { /* Try the next client temp location. */ }
    }
    if (!work) throw new Error('No writable ASCII temporary directory for the unlock map');
    try {
        const safeMap = path.join(work, 'map.w3x');
        await fs.copyFile(mapPath, safeMap);
        await writeAsciiMapName(safeMap, mapName);
        await fs.copyFile(safeMap, mapPath);
    } finally {
        // Only the unique directory allocated above is removed, never its parent.
        if (!path.basename(work).startsWith('quenching-map-name-')) throw new Error('invalid map temp directory');
        await fs.remove(work);
    }
}

async function writeAsciiMapName(mapPath: string, mapName: string): Promise<void> {
    const archive = new Archive();
    archive.open(mapPath);
    const tempFile = path.join(path.dirname(mapPath), `.war3map.w3i.${process.pid}.tmp`);
    try {
        const file = archive.openFile('war3map.w3i');
        const w3i = file.readAll();
        file.close();
        const offset = nameOffset(w3i);
        const nameEnd = w3i.indexOf(0, offset);
        if (nameEnd < 0) throw new Error('war3map.w3i has no map name terminator');
        await fs.writeFile(tempFile, Buffer.concat([w3i.subarray(0, offset), Buffer.from(mapName, 'utf8'), w3i.subarray(nameEnd)]));
        if (!archive.addFile(tempFile, 'war3map.w3i', { flags: MPQ_FILE_REPLACEEXISTING })) {
            throw new Error(`Could not update war3map.w3i in ${mapPath}`);
        }
    } finally {
        archive.close();
        await fs.remove(tempFile);
    }
}
