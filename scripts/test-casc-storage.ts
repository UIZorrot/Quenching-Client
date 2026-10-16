import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { Storage } from '@jamiephan/casclib';
import { openGameCascStorage, normalizeCascRoot } from '../src/Main/services/casc-storage';

const work = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-casc-test-'));
const game = path.join(work, '魔兽争霸');
await fs.outputFile(path.join(game, 'sentinel.txt'), 'same game');
try {
    assert.equal(normalizeCascRoot(path.join(game, '_retail_')), game);
    assert.equal(normalizeCascRoot(path.join(game, '_ptr_')), game);
    let opened = '';
    const storage = { open(directory: string) { opened = directory; }, close() {} };
    const access = await openGameCascStorage(storage, path.join(game, '_retail_'));
    const nativeDirectory = opened.slice(0, -3);
    assert.equal(opened.endsWith('*w3'), true);
    if (process.platform === 'win32') assert.match(opened, /^[\x00-\x7f]+$/);
    assert.equal(await fs.readFile(path.join(nativeDirectory, 'sentinel.txt'), 'utf8'), 'same game');
    access.release();
    if (process.platform === 'win32') assert.equal(await fs.pathExists(nativeDirectory), false);
    assert.equal(await fs.readFile(path.join(game, 'sentinel.txt'), 'utf8'), 'same game', 'cleanup must preserve the real game');
    let closed = 0;
    await assert.rejects(openGameCascStorage({
        open(directory) { opened = directory; throw new Error('fixture native open failed'); },
        close() { closed++; },
    }, game), error => error instanceof Error && error.message.includes(game) && error.message.includes('fixture native open failed'));
    assert.equal(closed, 1);
    if (process.platform === 'win32') assert.equal(await fs.pathExists(opened.slice(0, -3)), false, 'failed open must release its junction');

    const realRoot = process.argv[2];
    if (realRoot) {
        const alias = path.join(work, '中文真实游戏');
        await fs.symlink(path.resolve(realRoot), alias, process.platform === 'win32' ? 'junction' : 'dir');
        for (const root of [realRoot, alias, path.join(alias, '_retail_')]) {
            const native = new Storage();
            const opened = await openGameCascStorage(native, root);
            try {
                const file = native.openFile('war3.w3mod:units\\unitskin.txt');
                try { assert(file.readAll().length > 1000); } finally { file.close(); }
                for (const layer of ['_hd.w3mod:', '_de.w3mod:']) {
                    const name = `war3.w3mod:${layer}units\\human\\footman\\footman.mdx`;
                    assert(native.fileExists(name));
                    const model = native.openFile(name);
                    try { assert(model.readAll().length > 1000); } finally { model.close(); }
                }
            } finally { native.close(); opened.release(); }
        }
        await fs.unlink(alias);
        console.log('PASS: real CASC skin + HD/DE models through original, Chinese and branch paths');
    }
    console.log('PASS: ASCII native paths, branch normalization, failure cleanup and original game preservation');
} finally {
    assert(path.basename(work).startsWith('quenching-casc-test-'));
    await fs.remove(work);
}
