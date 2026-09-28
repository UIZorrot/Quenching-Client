import { getSelectedGameFolder } from './game-channel';
import fs from 'fs-extra';
import path from 'path';
import { GameChannel, gameChannelFolder } from '../../shared/game-channel';
import { normalizeWar3RootPath } from './war3-path';

/** Resource folders referenced by terrainXX.slk. */
export const REQUIRED_TERRAIN_FOLDERS = ['t00', 't16', 't18', 't20'] as const;

/** Doodad model folders referenced by destructableskin.txt. */
export const REQUIRED_DOODAD_FOLDERS = ['d00', 'd16', 'd18', 'd20'] as const;

/** Tree texture folders referenced by destructableskin.txt. */
export const REQUIRED_TREE_TEXTURE_FOLDERS = [
    path.join('replaceabletextures', 'tree', 't00'),
    path.join('replaceabletextures', 'tree', 't16'),
    path.join('replaceabletextures', 'tree', 't18'),
    path.join('replaceabletextures', 'tree', 't20'),
    path.join('replaceabletextures', 'tree', 'tc'),
] as const;

/** Resource folders used by the water, retro-skin, and cos-skin features. */
export const REQUIRED_EXTRA_FULL_PACKAGE_FOLDERS = [
    // Water dirs are optional at install time: DE packages (e.g. QMF3.5) ship without
    // replaceabletextures/water. Water mode switching asserts them when needed.
    'cos',
    'RUnits',
    'Rbuildings',
] as const;

export const REQUIRED_FULL_PACKAGE_FOLDERS = [
    ...REQUIRED_TERRAIN_FOLDERS,
    ...REQUIRED_DOODAD_FOLDERS,
    ...REQUIRED_TREE_TEXTURE_FOLDERS,
    ...REQUIRED_EXTRA_FULL_PACKAGE_FOLDERS,
] as const;

const FULL_PACKAGE_FOLDER_CANDIDATES: Record<string, string[]> = {
    d00: ['d00', path.join('doodads', 'que', 'd00')],
    d16: ['d16', path.join('doodads', 'que', 'd16')],
    d18: ['d18', path.join('doodads', 'que', 'd18')],
    d20: ['d20', path.join('doodads', 'que', 'd20')],
    RUnits: ['RUnits', 'Runits'],
};

const TERRAIN_MODE_FOLDER: Record<string, string> = {
    retro: 't00',
    v16: 't16',
    v18: 't18',
    latest: 't20',
    decisive: 't30',
    v30: 't30',
    t30: 't30',
};

const TREE_MODE_FOLDER: Record<string, string> = {
    tall: 't20',
    short: 't20',
    v18: 't18',
    v16: 't16',
    retro: 't00',
};

async function isDirectory(dir: string): Promise<boolean> {
    return (await fs.stat(dir).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
        throw error;
    }))?.isDirectory() === true;
}

export async function resolveRetailDir(war3Path: string): Promise<string> {
    const root = normalizeWar3RootPath(war3Path);
    const selected = getSelectedGameFolder();
    const selectedPath = path.join(root, selected);
    if (await isDirectory(selectedPath)) return selectedPath;
    const other = selected === '_retail_' ? '_ptr_' : '_retail_';
    if (await isDirectory(path.join(root, other))) {
        throw new Error(`Selected Warcraft branch is missing: ${selectedPath}`);
    }
    return root;
}

async function hasDirectoryContent(dir: string): Promise<boolean> {
    if (!(await fs.pathExists(dir))) {
        return false;
    }

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile()) {
                return true;
            }

            if (entry.isDirectory() && await hasDirectoryContent(path.join(dir, entry.name))) {
                return true;
            }
        }

        return false;
    } catch (error: any) {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false;
        throw error;
    }
}

/** Check either the native root folder or the extracted doodad layout. */
export async function isFullPackageFolderPresent(war3Path: string, folder: string): Promise<boolean> {
    const baseDir = await resolveRetailDir(war3Path);
    return isFullPackageFolderPresentAtDir(baseDir, folder);
}

export async function isFullPackageFolderPresentAtDir(baseDir: string, folder: string): Promise<boolean> {
    const candidates = FULL_PACKAGE_FOLDER_CANDIDATES[folder] ?? [folder];

    for (const candidate of candidates) {
        for (const root of [baseDir, path.join(baseDir, 'QMoff')]) {
            if (await hasDirectoryContent(path.join(root, candidate))) {
                return true;
            }
        }
    }

    return false;
}

/** Inspect one build explicitly; the selected launch branch must not affect the other build. */
export async function isFullPackageInstalledInChannel(war3Path: string, channel: GameChannel): Promise<boolean> {
    const baseDir = path.join(normalizeWar3RootPath(war3Path), gameChannelFolder(channel));
    return isFullPackageInstalledAtDir(baseDir);
}

export async function isFullPackageInstalledAtDir(baseDir: string): Promise<boolean> {
    if (!(await fs.pathExists(baseDir))) return false;
    if (!(await hasFullPackageMarkerAtDir(baseDir))) return false;
    for (const folder of REQUIRED_FULL_PACKAGE_FOLDERS) {
        if (!(await isFullPackageFolderPresentAtDir(baseDir, folder))) return false;
    }
    return true;
}

export async function getMissingFullPackageResources(war3Path: string): Promise<string[]> {
    const missing: string[] = [];
    const root = normalizeWar3RootPath(war3Path);
    const selected = getSelectedGameFolder();
    const other = selected === '_retail_' ? '_ptr_' : '_retail_';
    if (!(await isDirectory(path.join(root, selected))) && await isDirectory(path.join(root, other))) {
        return [`${selected} branch`];
    }
    const baseDir = await resolveRetailDir(war3Path);
    if (!(await hasFullPackageMarkerAtDir(baseDir))) return ['MOD version marker'];

    for (const folder of REQUIRED_FULL_PACKAGE_FOLDERS) {
        if (!(await isFullPackageFolderPresentAtDir(baseDir, folder))) {
            missing.push(folder);
        }
    }

    return missing;
}

async function hasFullPackageMarkerAtDir(baseDir: string): Promise<boolean> {
    for (const relative of ['_patch/keep.que', 'QMoff/_patch/keep.que', 'patch/keep.que', 'QMoff/patch/keep.que']) {
        const file = path.join(baseDir, ...relative.split('/'));
        const stat = await fs.lstat(file).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
            throw error;
        });
        if (!stat?.isFile() || stat.isSymbolicLink()) continue;
        const content = await fs.readFile(file, 'utf8');
        if (/^-v\d+(?:\.\d+){1,2}-\s*$/im.test(content)) return true;
    }
    return false;
}

export async function isFullPackageInstalled(war3Path: string | undefined): Promise<boolean> {
    if (!war3Path) {
        return false;
    }

    const missing = await getMissingFullPackageResources(war3Path);
    return missing.length === 0;
}

export async function assertFullPackageInstalled(war3Path: string): Promise<void> {
    const missing = await getMissingFullPackageResources(war3Path);
    if (missing.length > 0) {
        throw new Error(`Full package is not installed; missing resources: ${missing.join(', ')}`);
    }
}

export async function assertTerrainModeAvailable(war3Path: string, mode: string): Promise<void> {
    if (mode === 'original' || mode === 'classic') {
        return;
    }

    const folder = TERRAIN_MODE_FOLDER[mode];
    if (!folder) {
        return;
    }

    // A terrain table is unsafe without the complete terrain/doodad package.
    await assertFullPackageInstalled(war3Path);

    if (folder === 't30') {
        // QMF3.5 may only ship t30/keep.txt while tiles already live under terrainart.
        const baseDir = await resolveRetailDir(war3Path);
        const t30Dir = path.join(baseDir, 't30');
        const t30Marker = path.join(t30Dir, 'keep.txt');
        const t30Exists = (await hasDirectoryContent(t30Dir)) || (await fs.pathExists(t30Marker));
        if (!t30Exists) {
            throw new Error('Terrain resource folder is missing: t30');
        }
        return;
    }

    if (!(await isFullPackageFolderPresent(war3Path, folder))) {
        throw new Error(`Terrain resource folder is missing: ${folder}`);
    }
}

export async function assertTreeModeAvailable(war3Path: string, mode: string): Promise<void> {
    if (mode === 'original') {
        return;
    }

    const folder = TREE_MODE_FOLDER[mode];
    if (!folder) {
        return;
    }

    // Tree overrides reference both tXX textures and Doodads/que/dXX models.
    await assertFullPackageInstalled(war3Path);

    const baseDir = await resolveRetailDir(war3Path);
    const terrainTexDir = path.join(baseDir, folder);
    const treeTexDir = path.join(baseDir, 'replaceabletextures', 'tree', folder);

    const hasTerrainTex = await hasDirectoryContent(terrainTexDir);
    const hasTreeTex = await hasDirectoryContent(treeTexDir);

    if (!hasTerrainTex || !hasTreeTex) {
        throw new Error(`Tree resource folder is missing: ${folder} or tree/${folder}`);
    }
}
