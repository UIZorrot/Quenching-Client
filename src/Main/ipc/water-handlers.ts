import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs-extra';

async function getAssetsDir(): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
        return path.join(app.getAppPath(), 'assets');
    }
    return path.join(process.resourcesPath, 'assets');
}

export function registerWaterHandlers() {
    console.log('[Water] Water handlers registered.');

    ipcMain.handle('water:update-settings', async (event, war3Path: string, waterMode: string) => {
        console.log(`\n>>> [Water] Updating water to mode: ${waterMode}`);
        try {
            if (!war3Path) throw new Error('未提供魔兽路径');

            const retailPath = path.join(war3Path, '_retail_');
            const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;

            const waterDir = path.join(baseDir, 'replaceabletextures', 'water');
            const waterRelDir = path.join(baseDir, 'replaceabletextures', 'water-rel');
            const waterTransDir = path.join(baseDir, 'replaceabletextures', 'water-trans');

            const shoreline1 = path.join(baseDir, 'textures', 'shoreline1.dds');
            const shoreline2 = path.join(baseDir, 'textures', 'shorelineparticlexy.dds');
            const waterSlk = path.join(baseDir, 'terrainart', 'water.slk');

            const shoreline1Src = path.join(baseDir, 'textures', 'fx', 'shoreline1.dds');
            const shoreline2Src = path.join(baseDir, 'textures', 'fx', 'shorelineparticlexy.dds');

            const assetsDir = await getAssetsDir();
            const waterTransSlkSrc = path.join(assetsDir, 'quenching', 'water-trans.slk');
            const waterRelSlkSrc = path.join(assetsDir, 'quenching', 'water-rel.slk');

            console.log(`[Water] Paths Debug:\n  - BaseDir: ${baseDir}\n  - AssetsDir: ${assetsDir}\n  - waterTransSlkSrc Exists: ${await fs.pathExists(waterTransSlkSrc)}\n  - waterRelSlkSrc Exists: ${await fs.pathExists(waterRelSlkSrc)}`);

            if (waterMode === 'transparent') { // 清澈水面
                console.log('[Water] Mode: Transparent execution...');

                // 1. 目录交换
                console.log(`[Water] Checking waterTransDir: ${waterTransDir}`);
                if (await fs.pathExists(waterTransDir)) {
                    if (await fs.pathExists(waterDir)) {
                        console.log(`[Water] Backup water to water-rel`);
                        await fs.move(waterDir, waterRelDir, { overwrite: true });
                    }
                    console.log(`[Water] Restore water-trans as water`);
                    await fs.move(waterTransDir, waterDir, { overwrite: true });
                } else {
                    console.log('[Water] water-trans directory not found, skipping move.');
                }

                // 2. 拷贝 DDS
                console.log(`[Water] Copying DDS from fx/ to textures/`);
                if (await fs.pathExists(shoreline1Src)) {
                    await fs.copy(shoreline1Src, shoreline1, { overwrite: true });
                    console.log(`[Water] Copied: ${shoreline1}`);
                }
                if (await fs.pathExists(shoreline2Src)) {
                    await fs.copy(shoreline2Src, shoreline2, { overwrite: true });
                    console.log(`[Water] Copied: ${shoreline2}`);
                }

                // 3. 拷贝 SLK
                console.log(`[Water] Updating SLK (Transparent) from: ${waterTransSlkSrc}`);
                if (await fs.pathExists(waterTransSlkSrc)) {
                    await fs.ensureDir(path.dirname(waterSlk));
                    await fs.copy(waterTransSlkSrc, waterSlk, { overwrite: true });
                    console.log(`[Water] SUCCESS: Copied to ${waterSlk}`);
                } else {
                    console.error(`[Water] ERROR: Source SLK NOT FOUND: ${waterTransSlkSrc}`);
                }

            } else if (waterMode === 'realistic') { // 反射水面
                console.log('[Water] Mode: Realistic execution...');

                // 1. 目录交换
                console.log(`[Water] Checking waterRelDir: ${waterRelDir}`);
                if (await fs.pathExists(waterRelDir)) {
                    if (await fs.pathExists(waterDir)) {
                        console.log(`[Water] Backup water to water-trans`);
                        await fs.move(waterDir, waterTransDir, { overwrite: true });
                    }
                    console.log(`[Water] Restore water-rel as water`);
                    await fs.move(waterRelDir, waterDir, { overwrite: true });
                } else {
                    console.log('[Water] water-rel directory not found, skipping move.');
                }

                // 2. 删除清澈模式的 DDS 文件
                console.log(`[Water] Removing transparent mode DDS files...`);
                await fs.remove(shoreline1);
                await fs.remove(shoreline2);
                console.log(`[Water] Removed if existed: ${shoreline1}, ${shoreline2}`);

                // 3. 删除 SLK (其他水面不需要 water.slk)
                console.log(`[Water] Removing SLK for non-transparent mode...`);
                if (await fs.pathExists(waterSlk)) {
                    await fs.remove(waterSlk);
                    console.log(`[Water] SUCCESS: Removed ${waterSlk}`);
                }
            }

            console.log(`[Water] ALL OPERATIONS COMPLETED for mode: ${waterMode}`);
            return true;

        } catch (error) {
            console.error('[Water] Failed to update water settings:', error);
            throw error;
        }
    });
}
