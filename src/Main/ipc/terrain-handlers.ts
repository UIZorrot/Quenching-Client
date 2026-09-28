import { getSelectedGameFolder } from '../services/game-channel';
import { ipcMain } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { syncFoliageForTerrainIfEnabled } from '../services/foliage-service';
import { AssetSyncService } from '../services/asset-sync';
import { assertTerrainModeAvailable } from '../services/full-package-service';
import { BundledResourceRoot, createResourceSourceCache, ResourceSourceCache, installBundledResourceFile, removeBundledResourceFile, syncBundledResourceFiles } from '../services/managed-resource-files';
import { resolveModProfile } from '../services/mod-profile';

type TerrainVersion = 'retro' | 'v16' | 'v18' | 'latest' | 'decisive';

const TERRAIN_VERSIONS: Record<Exclude<TerrainVersion, 'decisive'>, { meta: string; cliffFile: string; terrainFile: string }> = {
    retro: { meta: '00', cliffFile: 'clifftypes00.slk', terrainFile: 'terrain00.slk' },
    v16: { meta: '16', cliffFile: 'clifftypes16.slk', terrainFile: 'terrain16.slk' },
    v18: { meta: '18', cliffFile: 'clifftypes18.slk', terrainFile: 'terrain18.slk' },
    latest: { meta: '20', cliffFile: 'clifftypes20.slk', terrainFile: 'terrain20.slk' },
};

const TERRAINART_SLK_NAMES = {
    cliff: 'clifftypes.slk',
    terrain: 'terrain.slk',
} as const;

const T30_ROOT_SLK_FILES = [
    TERRAINART_SLK_NAMES.cliff,
    TERRAINART_SLK_NAMES.terrain,
    'water.slk',
] as const;

const T30_RESERVED_NAMES = new Set([
    'keep.txt',
    'keep.que',
    '_setting',
    '.quenching-t30-manifest',
]);
const TERRAIN_SLK_MARKER = '.quenching-terrain-slk';
const TERRAIN_TILES_MARKER = '.quenching-terrain-tiles';

async function bundledSlkVariants(name: 'cliff' | 'terrain' | 'water'): Promise<string[]> {
    const assetsDir = await AssetSyncService.getAssetsDir();
    const tile = path.join(assetsDir, 'quenching', 'tile');
    if (name === 'water') return ['water-trans.slk', 'water-rel.slk'].map(file => path.join(tile, file));
    const prefix = name === 'cliff' ? 'clifftypes' : 'terrain';
    return ['00', '16', '18', '20'].map(version => path.join(tile, `${prefix}${version}.slk`));
}

async function removeOwnedSlk(terrainArtPath: string, relative: string, variants: string[]): Promise<void> {
    const target = path.join(terrainArtPath, relative);
    if (!(await fs.pathExists(target))) return;
    await removeBundledResourceFile(terrainArtPath, relative, variants, TERRAIN_SLK_MARKER);
}

async function writeTerrainMeta(terrainArtPath: string, value: string): Promise<void> {
    const target = path.join(terrainArtPath, 'meta.que');
    await fs.writeFile(target, value, 'utf8');
}

async function copySlkFromAssets(terrainArtPath: string, fileName: string, destName: string) {
    const assetsDir = await AssetSyncService.getAssetsDir();
    const src = path.join(assetsDir, 'quenching', 'tile', fileName);

    if (!(await fs.pathExists(src))) {
        throw new Error(`地形配置文件不存在: ${src}`);
    }

    await installBundledResourceFile(terrainArtPath, destName, src,
        await bundledSlkVariants(destName === TERRAINART_SLK_NAMES.cliff ? 'cliff' : 'terrain'), TERRAIN_SLK_MARKER);
    const size = (await fs.stat(src)).size;
    console.log(`[Terrain] Copied ${fileName} -> terrainart/${destName} (${size} bytes)`);
}

/** 旧版可能把 terrain.slk 放在 terrain-que 子目录，需清理避免游戏读到错误文件 */
async function removeLegacyTerrainSlkPaths(terrainArtPath: string) {
    const legacyTerrainSlk = path.join(terrainArtPath, 'terrain-que', TERRAINART_SLK_NAMES.terrain);
    if (await fs.pathExists(legacyTerrainSlk)) {
        await removeOwnedSlk(terrainArtPath, 'terrain-que/terrain.slk', await bundledSlkVariants('terrain'));
        console.log('[Terrain] Removed legacy terrainart/terrain-que/terrain.slk');
    }
}

async function syncWaterSlk(terrainArtPath: string, waterMode?: string) {
    const waterSlk = path.join(terrainArtPath, 'water.slk');

    if (waterMode === 'transparent' || waterMode === 'realistic') {
        const assetsDir = await AssetSyncService.getAssetsDir();
        const sourceName = waterMode === 'transparent' ? 'water-trans.slk' : 'water-rel.slk';
        const waterSrc = path.join(assetsDir, 'quenching', 'tile', sourceName);
        if (await fs.pathExists(waterSrc)) {
            await installBundledResourceFile(terrainArtPath, 'water.slk', waterSrc,
                await bundledSlkVariants('water'), TERRAIN_SLK_MARKER);
            console.log(`[Terrain] Copied ${sourceName} for ${waterMode} water mode`);
        }
    } else if (await fs.pathExists(waterSlk)) {
        await removeOwnedSlk(terrainArtPath, 'water.slk', await bundledSlkVariants('water'));
        console.log('[Terrain] Removed water.slk (non-transparent water mode)');
    }
}

async function listMeaningfulT30Entries(t30Dir: string): Promise<string[]> {
    if (!(await fs.pathExists(t30Dir))) return [];
    const entries = await fs.readdir(t30Dir);
    const result: string[] = [];
    for (const name of entries) {
        if (T30_RESERVED_NAMES.has(name.toLowerCase()) || T30_RESERVED_NAMES.has(name)) continue;
        if (name.toLowerCase() === 'keep.txt') continue;
        result.push(name);
    }
    return result;
}

async function ensureT30Source(baseDir: string, sourceCache: ResourceSourceCache): Promise<string[]> {
    const t30Dir = path.join(baseDir, 't30');
    const keepPath = path.join(t30Dir, 'keep.txt');
    // Only QMF3.5's explicit t30 marker may seed this cache. Creating t30 on
    // an ordinary installation would make "original" terrain delete itself.
    if (!(await fs.pathExists(keepPath))) {
        return [];
    }

    const entries: string[] = [];
    for (const name of await listMeaningfulT30Entries(t30Dir)) {
        if ((await fs.stat(path.join(t30Dir, name))).isDirectory()) entries.push(name);
    }
    return entries;
}

function t30Roots(baseDir: string, t30Entries: string[]): BundledResourceRoot[] {
    return t30Entries.map(name => ({ source: path.join(baseDir, 't30', name), targetPrefix: name }));
}

async function removeT30FromTerrainArt(baseDir: string, terrainArtPath: string, t30Entries: string[], sourceCache: ResourceSourceCache) {
    const roots = t30Roots(baseDir, t30Entries);
    await syncBundledResourceFiles(terrainArtPath, [], roots, TERRAIN_TILES_MARKER, { sourceCache });
}

async function applyDecisiveTerrain(baseDir: string) {
    const terrainArtPath = path.join(baseDir, 'terrainart');
    await fs.ensureDir(terrainArtPath);

    const sourceCache = createResourceSourceCache();
    const entries = await ensureT30Source(baseDir, sourceCache);
    if (entries.length === 0) {
        throw new Error('t30 地形资源为空，无法应用淬火决定版地形');
    }

    const roots = t30Roots(baseDir, entries);
    await syncBundledResourceFiles(terrainArtPath, roots, roots, TERRAIN_TILES_MARKER, { sourceCache });

    await removeLegacyTerrainSlkPaths(terrainArtPath);
    for (const slk of T30_ROOT_SLK_FILES) {
        const slkPath = path.join(terrainArtPath, slk);
        if (await fs.pathExists(slkPath)) {
            const variants = await bundledSlkVariants(slk === 'water.slk' ? 'water' : slk === 'clifftypes.slk' ? 'cliff' : 'terrain');
            await removeOwnedSlk(terrainArtPath, slk, variants);
            console.log(`[Terrain] Removed terrainart/${slk} (decisive / t30)`);
        }
    }

    await writeTerrainMeta(terrainArtPath, '30');
    console.log('[Terrain] Applied decisive (t30) terrain, meta.que=30');
}

async function applyTerrainVersion(baseDir: string, mode: Exclude<TerrainVersion, 'decisive'>, waterMode?: string) {
    const { meta, cliffFile, terrainFile } = TERRAIN_VERSIONS[mode];
    const terrainArtPath = path.join(baseDir, 'terrainart');

    await fs.ensureDir(terrainArtPath);

    // T00/T16/T18/T20 select their terrain tables only. DE tilesets stay
    // parked in t30; do not copy or delete those directories on these modes.
    await removeLegacyTerrainSlkPaths(terrainArtPath);
    await copySlkFromAssets(terrainArtPath, cliffFile, TERRAINART_SLK_NAMES.cliff);
    await copySlkFromAssets(terrainArtPath, terrainFile, TERRAINART_SLK_NAMES.terrain);
    await writeTerrainMeta(terrainArtPath, meta);
    await syncWaterSlk(terrainArtPath, waterMode);

    console.log(
        `[Terrain] Applied ${mode} -> terrainart/${TERRAINART_SLK_NAMES.cliff}, terrainart/${TERRAINART_SLK_NAMES.terrain}, meta.que=${meta}`
    );
}

async function switchToOriginalTerrain(baseDir: string) {
    const terrainArtPath = path.join(baseDir, 'terrainart');
    const terrainSlk = path.join(terrainArtPath, TERRAINART_SLK_NAMES.terrain);
    const cliffSlk = path.join(terrainArtPath, TERRAINART_SLK_NAMES.cliff);
    const legacyTerrainSlk = path.join(terrainArtPath, 'terrain-que', TERRAINART_SLK_NAMES.terrain);

    // Original also clears decisive tilesets so vanilla terrain loads.
    const sourceCache = createResourceSourceCache();
    const t30Entries = await ensureT30Source(baseDir, sourceCache);
    await removeT30FromTerrainArt(baseDir, terrainArtPath, t30Entries, sourceCache);

    if (await fs.pathExists(terrainSlk)) {
        await removeOwnedSlk(terrainArtPath, TERRAINART_SLK_NAMES.terrain, await bundledSlkVariants('terrain'));
        console.log('[Terrain] Removed terrainart/terrain.slk (original mode)');
    }
    if (await fs.pathExists(cliffSlk)) {
        await removeOwnedSlk(terrainArtPath, TERRAINART_SLK_NAMES.cliff, await bundledSlkVariants('cliff'));
        console.log('[Terrain] Removed terrainart/clifftypes.slk (original mode)');
    }

    if (await fs.pathExists(legacyTerrainSlk)) {
        await removeOwnedSlk(terrainArtPath, 'terrain-que/terrain.slk', await bundledSlkVariants('terrain'));
        console.log('[Terrain] Removed legacy terrainart/terrain-que/terrain.slk (original mode)');
    }

    const metaPath = path.join(terrainArtPath, 'meta.que');
    // Keep an explicit client marker: QMF3.5 retains t30/keep.txt as a backup,
    // so absence of terrain.slk alone cannot distinguish original from t30.
    await writeTerrainMeta(terrainArtPath, 'original');
}

export function registerTerrainHandlers() {
    ipcMain.handle(
        'terrain:update-settings',
        async (_event, war3Path: string, terrainMode: string, waterMode?: string, previousTerrainMode?: string) => {
        try {
            console.log(`[Terrain] Updating terrain to mode: ${terrainMode}, water: ${waterMode ?? 'default'}`);
            if (!war3Path) {
                throw new Error('未提供魔兽争霸III路径');
            }

            war3Path = path.normalize(war3Path);

            const retailPath = path.join(war3Path, getSelectedGameFolder());
            if (!(await fs.pathExists(retailPath))) {
                throw new Error('_retail_ 目录不存在');
            }
            const baseDir = retailPath;

            // DE forbids water overrides — never write water.slk while on decisive graphics.
            const modSettings = (await import('../services/config-manager')).configManager.get('modSettings') || {};
            const profile = await resolveModProfile(war3Path, modSettings);
            if (profile.graphics === 'de' && !['original', 'classic', 'decisive', 'v30', 't30'].includes(terrainMode)) {
                throw new Error('决定版画质仅支持原版地形和淬火决定版地形');
            }
            const resolvedGraphics = modSettings.resolvedGraphics as string | undefined;
            const effectiveWater =
                resolvedGraphics === 'de' || modSettings.graphicsSelection === 'de'
                    ? undefined
                    : waterMode;

            if (terrainMode === 'classic' || terrainMode === 'original') {
                await switchToOriginalTerrain(baseDir);
            } else if (terrainMode === 'decisive' || terrainMode === 'v30' || terrainMode === 't30') {
                await assertTerrainModeAvailable(war3Path, 'decisive');
                await applyDecisiveTerrain(baseDir);
            } else if (terrainMode in TERRAIN_VERSIONS) {
                await assertTerrainModeAvailable(war3Path, terrainMode);
                await applyTerrainVersion(baseDir, terrainMode as Exclude<TerrainVersion, 'decisive'>, effectiveWater);
            } else {
                throw new Error(`不支持的地形模式: ${terrainMode}`);
            }

            await syncFoliageForTerrainIfEnabled(war3Path, terrainMode, previousTerrainMode);

            console.log(`[Terrain] Successfully updated terrain to ${terrainMode}`);
            return true;
        } catch (error) {
            console.error('Failed to update terrain settings:', error);
            throw error;
        }
    }
    );
}
