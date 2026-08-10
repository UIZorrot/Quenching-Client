import { ipcMain } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { syncFoliageForTerrainIfEnabled } from '../services/foliage-service';
import { syncBlightForTerrain } from '../services/blight-service';
import { AssetSyncService } from '../services/asset-sync';
import { assertTerrainModeAvailable } from '../services/full-package-service';

type TerrainVersion = 'retro' | 'v16' | 'v18' | 'latest';

const TERRAIN_VERSIONS: Record<TerrainVersion, { meta: string; cliffFile: string; terrainFile: string }> = {
    retro: { meta: '00', cliffFile: 'clifftypes00.slk', terrainFile: 'terrain00.slk' },
    v16: { meta: '16', cliffFile: 'clifftypes16.slk', terrainFile: 'terrain16.slk' },
    v18: { meta: '18', cliffFile: 'clifftypes18.slk', terrainFile: 'terrain18.slk' },
    latest: { meta: '20', cliffFile: 'clifftypes20.slk', terrainFile: 'terrain20.slk' },
};

const TERRAINART_SLK_NAMES = {
    cliff: 'clifftypes.slk',
    terrain: 'terrain.slk',
} as const;

async function copySlkFromAssets(terrainArtPath: string, fileName: string, destName: string) {
    const assetsDir = await AssetSyncService.getAssetsDir();
    const src = path.join(assetsDir, 'quenching', fileName);
    const dest = path.join(terrainArtPath, destName);

    if (!(await fs.pathExists(src))) {
        throw new Error(`地形配置文件不存在: ${src}`);
    }

    await fs.copy(src, dest, { overwrite: true });
    const size = (await fs.stat(src)).size;
    console.log(`[Terrain] Copied ${fileName} -> terrainart/${destName} (${size} bytes)`);
}

/** 旧版可能把 terrain.slk 放在 terrain-que 子目录，需清理避免游戏读到错误文件 */
async function removeLegacyTerrainSlkPaths(terrainArtPath: string) {
    const legacyTerrainSlk = path.join(terrainArtPath, 'terrain-que', TERRAINART_SLK_NAMES.terrain);
    if (await fs.pathExists(legacyTerrainSlk)) {
        await fs.remove(legacyTerrainSlk);
        console.log('[Terrain] Removed legacy terrainart/terrain-que/terrain.slk');
    }
}

async function syncWaterSlk(terrainArtPath: string, waterMode?: string) {
    const waterSlk = path.join(terrainArtPath, 'water.slk');

    if (waterMode === 'transparent') {
        const assetsDir = await AssetSyncService.getAssetsDir();
        const waterSrc = path.join(assetsDir, 'quenching', 'water.slk');
        if (await fs.pathExists(waterSrc)) {
            await fs.copy(waterSrc, waterSlk, { overwrite: true });
            console.log('[Terrain] Copied water.slk for transparent water mode');
        }
    } else if (await fs.pathExists(waterSlk)) {
        await fs.remove(waterSlk);
        console.log('[Terrain] Removed water.slk (non-transparent water mode)');
    }
}

async function applyTerrainVersion(baseDir: string, mode: TerrainVersion, waterMode?: string) {
    const { meta, cliffFile, terrainFile } = TERRAIN_VERSIONS[mode];
    const terrainArtPath = path.join(baseDir, 'terrainart');

    await fs.ensureDir(terrainArtPath);
    await removeLegacyTerrainSlkPaths(terrainArtPath);
    await copySlkFromAssets(terrainArtPath, cliffFile, TERRAINART_SLK_NAMES.cliff);
    await copySlkFromAssets(terrainArtPath, terrainFile, TERRAINART_SLK_NAMES.terrain);
    await fs.writeFile(path.join(terrainArtPath, 'meta.que'), meta, 'utf-8');
    await syncWaterSlk(terrainArtPath, waterMode);

    console.log(
        `[Terrain] Applied ${mode} -> terrainart/${TERRAINART_SLK_NAMES.cliff}, terrainart/${TERRAINART_SLK_NAMES.terrain}, meta.que=${meta}`
    );
}

async function switchToOriginalTerrain(baseDir: string) {
    const terrainArtPath = path.join(baseDir, 'terrainart');
    const terrainSlk = path.join(terrainArtPath, TERRAINART_SLK_NAMES.terrain);
    const legacyTerrainSlk = path.join(terrainArtPath, 'terrain-que', TERRAINART_SLK_NAMES.terrain);

    if (await fs.pathExists(terrainSlk)) {
        await fs.remove(terrainSlk);
        console.log('[Terrain] Removed terrainart/terrain.slk (original mode)');
    }

    if (await fs.pathExists(legacyTerrainSlk)) {
        await fs.remove(legacyTerrainSlk);
        console.log('[Terrain] Removed legacy terrainart/terrain-que/terrain.slk (original mode)');
    }
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

            const retailPath = path.join(war3Path, '_retail_');
            if (!(await fs.pathExists(retailPath))) {
                throw new Error('_retail_ 目录不存在');
            }
            const baseDir = retailPath;

            if (terrainMode === 'classic' || terrainMode === 'original') {
                await switchToOriginalTerrain(baseDir);
            } else if (terrainMode in TERRAIN_VERSIONS) {
                await assertTerrainModeAvailable(war3Path, terrainMode);
                await applyTerrainVersion(baseDir, terrainMode as TerrainVersion, waterMode);
            } else {
                console.warn(`[Terrain] Unsupported terrain mode: ${terrainMode}, skipping switch.`);
                return true;
            }

            await syncFoliageForTerrainIfEnabled(war3Path, terrainMode, previousTerrainMode);
            await syncBlightForTerrain(war3Path, terrainMode);

            console.log(`[Terrain] Successfully updated terrain to ${terrainMode}`);
            return true;
        } catch (error) {
            console.error('Failed to update terrain settings:', error);
            throw error;
        }
    }
    );
}
