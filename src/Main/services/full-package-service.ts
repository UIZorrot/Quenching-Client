import fs from 'fs-extra';
import path from 'path';

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
    path.join('replaceabletextures', 'water'),
    'cos',
    'RUnits',
    'Rbuildings',
] as const;

/** Files supplied by the full package rather than by the client assets. */
export const REQUIRED_FULL_PACKAGE_FILES = [
    path.join('textures', 'fx', 'shoreline1.dds'),
    path.join('textures', 'fx', 'shorelineparticlexy.dds'),
] as const;

export const REQUIRED_FULL_PACKAGE_FOLDERS = [
    ...REQUIRED_TERRAIN_FOLDERS,
    ...REQUIRED_DOODAD_FOLDERS,
    ...REQUIRED_TREE_TEXTURE_FOLDERS,
    ...REQUIRED_EXTRA_FULL_PACKAGE_FOLDERS,
] as const;

/** Water mode switching moves one backup folder into the active slot, so either backup is valid. */
const ALTERNATIVE_FULL_PACKAGE_FOLDERS = [
    {
        label: 'replaceabletextures/water-rel or water-trans',
        candidates: [
            path.join('replaceabletextures', 'water-rel'),
            path.join('replaceabletextures', 'water-trans'),
        ],
    },
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
};

const TREE_MODE_FOLDER: Record<string, string> = {
    tall: 't20',
    short: 't20',
    v18: 't18',
    v16: 't16',
    retro: 't00',
};

export async function resolveRetailDir(war3Path: string): Promise<string> {
    const retailPath = path.join(war3Path, '_retail_');
    if (await fs.pathExists(retailPath)) {
        return retailPath;
    }
    return war3Path;
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
    } catch {
        return false;
    }
}

async function isFilePresent(filePath: string): Promise<boolean> {
    try {
        return (await fs.stat(filePath)).isFile();
    } catch {
        return false;
    }
}

/** Check either the native root folder or the extracted doodad layout. */
export async function isFullPackageFolderPresent(war3Path: string, folder: string): Promise<boolean> {
    const baseDir = await resolveRetailDir(war3Path);
    const candidates = FULL_PACKAGE_FOLDER_CANDIDATES[folder] ?? [folder];

    for (const candidate of candidates) {
        if (await hasDirectoryContent(path.join(baseDir, candidate))) {
            return true;
        }
    }

    return false;
}

/** Kept as a compatibility alias for callers that used the old helper name. */
export const isTerrainFolderPresent = isFullPackageFolderPresent;

export async function isFullPackageFilePresent(war3Path: string, fileName: string): Promise<boolean> {
    const baseDir = await resolveRetailDir(war3Path);
    return isFilePresent(path.join(baseDir, fileName));
}

export async function getMissingFullPackageResources(war3Path: string): Promise<string[]> {
    const missing: string[] = [];

    for (const folder of REQUIRED_FULL_PACKAGE_FOLDERS) {
        if (!(await isFullPackageFolderPresent(war3Path, folder))) {
            missing.push(folder);
        }
    }

    for (const group of ALTERNATIVE_FULL_PACKAGE_FOLDERS) {
        const present = await Promise.all(group.candidates.map((folder) => isFullPackageFolderPresent(war3Path, folder)));
        if (!present.some(Boolean)) {
            missing.push(group.label);
        }
    }

    for (const fileName of REQUIRED_FULL_PACKAGE_FILES) {
        if (!(await isFullPackageFilePresent(war3Path, fileName))) {
            missing.push(fileName);
        }
    }

    return missing;
}

/** Compatibility name retained for existing callers. */
export async function getMissingTerrainFolders(war3Path: string): Promise<string[]> {
    return getMissingFullPackageResources(war3Path);
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

/**
 * Remove terrain overrides that cannot be resolved safely without the full
 * texture package. This prevents a stale partial installation from crashing
 * the game during terrain loading.
 */
export async function removeTerrainSlkIfFullPackageMissing(war3Path: string): Promise<boolean> {
    if (await isFullPackageInstalled(war3Path)) {
        return false;
    }

    const baseDir = await resolveRetailDir(war3Path);
    const unsafeOverridePaths = [
        path.join(baseDir, 'terrainart', 'terrain.slk'),
        path.join(baseDir, 'terrainart', 'clifftypes.slk'),
        path.join(baseDir, 'terrainart', 'meta.que'),
        path.join(baseDir, 'terrainart', 'water.slk'),
        path.join(baseDir, 'terrainart', 'terrain-que', 'terrain.slk'),
        path.join(baseDir, 'terrainart', 'terrain-que', 'clifftypes.slk'),
        path.join(baseDir, 'textures', 'shoreline1.dds'),
        path.join(baseDir, 'textures', 'shorelineparticlexy.dds'),
    ];

    let removed = false;
    for (const unsafeOverridePath of unsafeOverridePaths) {
        if (await fs.pathExists(unsafeOverridePath)) {
            await fs.remove(unsafeOverridePath);
            removed = true;
            console.warn(`[FullPackage] Removed unsafe full-package override: ${unsafeOverridePath}`);
        }
    }

    return removed;
}