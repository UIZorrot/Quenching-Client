import { ipcMain, app } from 'electron';
import fs from 'fs-extra';
import path from 'path';

type TerrainVersion = 'retro' | 'v16' | 'v18' | 'latest';

const TERRAIN_VERSIONS: Record<TerrainVersion, { folder: string; meta: string; cliffFile: string }> = {
    retro: { folder: 't00', meta: '00', cliffFile: 'clifftypes00.slk' },
    v16: { folder: 't16', meta: '16', cliffFile: 'clifftypes16.slk' },
    v18: { folder: 't18', meta: '18', cliffFile: 'clifftypes18.slk' },
    latest: { folder: 't20', meta: '20', cliffFile: 'clifftypes20.slk' },
};

async function getAssetsDir(): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
        return path.join(app.getAppPath(), 'assets');
    }
    return path.join(process.resourcesPath, 'assets');
}

/** 将旧版 Electron 的 QMoff/terrainart 迁移到 t20，便于后续轮换 */
async function migrateQmoffTerrain(baseDir: string) {
    const qmoffPath = path.join(baseDir, 'QMoff', 'terrainart');
    const t20Path = path.join(baseDir, 't20');

    if (!(await fs.pathExists(qmoffPath)) || (await fs.pathExists(t20Path))) {
        return;
    }

    console.log('[Terrain] Migrating QMoff/terrainart -> t20');
    await fs.move(qmoffPath, t20Path, { overwrite: true });
    await fs.writeFile(path.join(t20Path, 'meta.que'), '20', 'utf-8');
}

/** 对应旧版 set_tile_by_meta：按 meta.que 将当前 terrainart 归档到 t00/t16/t18/t20 */
async function archiveTerrainByMeta(baseDir: string) {
    const terrainPath = path.join(baseDir, 'terrainart');
    if (!(await fs.pathExists(terrainPath))) {
        return;
    }

    let meta = '20';
    const metaPath = path.join(terrainPath, 'meta.que');
    if (await fs.pathExists(metaPath)) {
        meta = (await fs.readFile(metaPath, 'utf-8')).trim();
    }

    const archivePath = path.join(baseDir, `t${meta}`);
    console.log(`[Terrain] Archiving terrainart -> t${meta}`);

    if (await fs.pathExists(archivePath)) {
        await fs.remove(archivePath);
    }
    await fs.move(terrainPath, archivePath, { overwrite: true });
}

async function applyCliffTypes(baseDir: string, terrainPath: string, cliffFile: string) {
    const assetsDir = await getAssetsDir();
    const cliffSrc = path.join(assetsDir, 'quenching', cliffFile);
    const cliffDest = path.join(terrainPath, 'clifftypes.slk');

    if (!(await fs.pathExists(cliffSrc))) {
        throw new Error(`悬崖类型文件不存在: ${cliffSrc}`);
    }

    await fs.copy(cliffSrc, cliffDest, { overwrite: true });
    console.log(`[Terrain] Applied ${cliffFile} -> clifftypes.slk`);
}

/** 对应旧版 setbtn_tile 中 water.slk 的处理逻辑 */
async function syncWaterSlk(terrainPath: string, waterMode?: string) {
    const waterSlk = path.join(terrainPath, 'water.slk');

    if (waterMode === 'transparent') {
        const assetsDir = await getAssetsDir();
        const waterSrc = path.join(assetsDir, 'quenching', 'water.slk');
        if (await fs.pathExists(waterSrc)) {
            await fs.copy(waterSrc, waterSlk, { overwrite: true });
            console.log('[Terrain] Copied water.slk for transparent water mode');
        }
    } else {
        await fs.remove(waterSlk);
        console.log('[Terrain] Removed water.slk (non-transparent water mode)');
    }
}

async function activateTerrainVersion(baseDir: string, mode: TerrainVersion, waterMode?: string) {
    await migrateQmoffTerrain(baseDir);
    await archiveTerrainByMeta(baseDir);

    const { folder, meta, cliffFile } = TERRAIN_VERSIONS[mode];
    const sourcePath = path.join(baseDir, folder);
    const terrainPath = path.join(baseDir, 'terrainart');

    if (!(await fs.pathExists(sourcePath))) {
        throw new Error(`地形资源目录不存在: ${folder}，请先安装完整 MOD 资源包`);
    }

    console.log(`[Terrain] Activating ${mode}: ${folder} -> terrainart`);
    await fs.move(sourcePath, terrainPath, { overwrite: true });
    await fs.writeFile(path.join(terrainPath, 'meta.que'), meta, 'utf-8');
    await applyCliffTypes(baseDir, terrainPath, cliffFile);
    await syncWaterSlk(terrainPath, waterMode);
}

async function switchToOriginalTerrain(baseDir: string) {
    await migrateQmoffTerrain(baseDir);
    await archiveTerrainByMeta(baseDir);
    console.log('[Terrain] Switched to original (terrainart archived/disabled)');
}

export function registerTerrainHandlers() {
    /**
     * 更新地形设置
     * @param terrainMode 'original' | 'retro' | 'v16' | 'v18' | 'latest'
     * @param waterMode 可选，用于同步 terrainart/water.slk
     */
    ipcMain.handle('terrain:update-settings', async (event, war3Path: string, terrainMode: string, waterMode?: string) => {
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
                await activateTerrainVersion(baseDir, terrainMode as TerrainVersion, waterMode);
            } else {
                console.warn(`[Terrain] Unsupported terrain mode: ${terrainMode}, skipping switch.`);
                return true;
            }

            console.log(`[Terrain] Successfully updated terrain to ${terrainMode}`);
            return true;
        } catch (error) {
            console.error('Failed to update terrain settings:', error);
            throw error;
        }
    });
}
