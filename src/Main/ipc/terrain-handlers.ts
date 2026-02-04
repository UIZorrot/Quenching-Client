import { ipcMain } from 'electron';
import fs from 'fs-extra';
import path from 'path';

export function registerTerrainHandlers() {
    /**
     * 更新地形设置
     * @param terrainMode 'classic' | 'vintage' | 'custom' | etc.
     */
    ipcMain.handle('terrain:update-settings', async (event, war3Path: string, terrainMode: string) => {
        try {
            console.log(`[Terrain] Updating terrain to mode: ${terrainMode}`);
            if (!war3Path) {
                throw new Error('未提供魔兽争霸III路径');
            }

            // 标准化路径分隔符
            war3Path = path.normalize(war3Path);

            // 检查 _retail_ 目录 (Reforged 结构)
            const retailPath = path.join(war3Path, '_retail_');
            if (!(await fs.pathExists(retailPath))) {
                throw new Error('_retail_ 目录不存在');
            }
            const baseDir = retailPath;

            const terrainPath = path.join(baseDir, 'terrainart');
            const qmOffDir = path.join(baseDir, 'QMoff');
            const offPath = path.join(qmOffDir, 'terrainart');

            console.log(`[Terrain] terrainPath: ${terrainPath}`);
            console.log(`[Terrain] offPath: ${offPath}`);

            const isClassic = terrainMode === 'classic' || terrainMode === 'original';
            const isLatest = terrainMode === 'latest';

            if (!isClassic && !isLatest) {
                console.warn(`[Terrain] Unsupported terrain mode: ${terrainMode}, skipping switch.`);
                return true;
            }

            // 确保 QMoff 目录存在
            await fs.ensureDir(qmOffDir);

            if (isClassic) {
                // 切换到原版（classic/original）：移动 terrainart -> QMoff/terrainart
                console.log('[Terrain] Switching to classic mode: moving terrainart to QMoff/terrainart');

                const terrainExists = await fs.pathExists(terrainPath);
                console.log(`[Terrain] terrainart exists: ${terrainExists}`);

                if (terrainExists) {
                    // 如果目标位置已存在，先删除它（可能是上次未完成的操作留下的）
                    if (await fs.pathExists(offPath)) {
                        console.log(`[Terrain] QMoff/terrainart already exists, removing it first...`);
                        await fs.remove(offPath);
                        console.log(`[Terrain] QMoff/terrainart removed`);
                    }

                    console.log(`[Terrain] Moving ${terrainPath} to ${offPath}...`);
                    await fs.move(terrainPath, offPath, { overwrite: true });
                    console.log(`[Terrain] Move completed`);
                } else {
                    console.log('[Terrain] terrainart not found, assuming already in classic mode');
                }
            } else {
                // 切换到最新模式（latest）：移动 QMoff/terrainart -> terrainart
                console.log('[Terrain] Switching to latest mode: moving QMoff/terrainart to terrainart');

                const offExists = await fs.pathExists(offPath);
                console.log(`[Terrain] QMoff/terrainart exists: ${offExists}`);

                if (offExists) {
                    // 如果目标位置已存在，先删除它
                    if (await fs.pathExists(terrainPath)) {
                        console.log(`[Terrain] terrainart already exists, removing it first...`);
                        await fs.remove(terrainPath);
                        console.log(`[Terrain] terrainart removed`);
                    }

                    console.log(`[Terrain] Moving ${offPath} to ${terrainPath}...`);
                    await fs.move(offPath, terrainPath, { overwrite: true });
                    console.log(`[Terrain] Move completed`);
                } else {
                    console.log('[Terrain] QMoff/terrainart not found, assuming already in latest mode');
                }
            }

            console.log(`[Terrain] Successfully updated terrain to ${terrainMode}`);
            return true;

        } catch (error) {
            console.error('Failed to update terrain settings:', error);
            throw error;
        }
    });
}
