import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

export function normalizeCascRoot(gamePath: string): string {
    const directory = path.resolve(gamePath);
    return ['_retail_', '_ptr_'].includes(path.basename(directory).toLowerCase())
        ? path.dirname(directory) : directory;
}

/** CascLib's Windows binding cannot open UTF-8 filesystem paths. A temporary
 * ASCII junction changes only the path passed to native code, not game files. */
async function cascPath(root: string): Promise<{ directory: string; release: () => void }> {
    if (process.platform !== 'win32' || /^[\x00-\x7f]+$/.test(root)) {
        return { directory: root, release() {} };
    }
    const bases = [os.tmpdir(),
        process.env.PUBLIC && path.join(process.env.PUBLIC, 'QuenchingModClient', 'Temp'),
        process.env.ProgramData && path.join(process.env.ProgramData, 'QuenchingModClient', 'Temp'),
    ].filter((base): base is string => !!base && /^[\x00-\x7f]+$/.test(base));
    for (const base of [...new Set(bases)]) {
        let work: string | undefined;
        try {
            await fs.ensureDir(base);
            work = await fs.mkdtemp(path.join(base, 'quenching-casc-'));
            const directory = path.join(work, 'storage');
            await fs.symlink(root, directory, 'junction');
            return { directory, release() {
                // Unlink the junction itself. Never recurse into its game target.
                fs.unlinkSync(directory);
                fs.rmdirSync(work!);
            } };
        } catch {
            if (work) await fs.rmdir(work).catch(() => undefined);
        }
    }
    throw new Error(`无法为中文或非英文魔兽路径创建临时 CASC 读取路径：${root}`);
}

export async function openGameCascStorage(storage: { open: (directory: string) => unknown; close: () => unknown }, gamePath: string) {
    const root = normalizeCascRoot(gamePath);
    const access = await cascPath(root);
    const openedAt = access.directory + '*w3';
    try {
        storage.open(openedAt);
        return { root, openedAt, release: access.release };
    } catch (error) {
        try { storage.close(); } catch {}
        access.release();
        throw new Error(`无法读取魔兽 CASC 资源：${root}\n${error instanceof Error ? error.message : String(error)}`);
    }
}
