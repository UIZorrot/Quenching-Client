import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import yauzl from 'yauzl';
import { AssetSyncService } from '../services/asset-sync';

/**
 * 通用解压函数
 */
async function extractZip(zipPath: string, extractPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
                reject(err);
                return;
            }

            zipfile.readEntry();
            zipfile.on('entry', (entry) => {
                const outputPath = path.join(extractPath, entry.fileName);
                if (/\/$/.test(entry.fileName)) {
                    // 目录
                    fs.ensureDir(outputPath).then(() => {
                        zipfile.readEntry();
                    }).catch(reject);
                } else {
                    // 文件
                    fs.ensureDir(path.dirname(outputPath)).then(() => {
                        zipfile.openReadStream(entry, (err2, readStream) => {
                            if (err2 || !readStream) {
                                reject(err2);
                                return;
                            }
                            const writeStream = fs.createWriteStream(outputPath);
                            readStream.pipe(writeStream);
                            writeStream.on('close', () => {
                                zipfile.readEntry();
                            });
                            readStream.on('error', reject);
                            writeStream.on('error', reject);
                        });
                    }).catch(reject);
                }
            });

            zipfile.on('end', () => {
                resolve(true);
            });

            zipfile.on('error', (err) => {
                reject(err);
            });
        });
    });
}

export function registerScriptHandlers() {
    console.log('[Script] Script handlers registered.');

    ipcMain.handle('script:update-env-render', async (event, war3Path: string, enabled: boolean) => {
        console.log(`\n>>> [Script] Updating environment rendering (envRender): ${enabled ? 'ON' : 'OFF'}`);
        try {
            if (!war3Path) throw new Error('未提供魔兽路径');

            const retailPath = path.join(war3Path, '_retail_');
            const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
            const scriptsDir = path.join(baseDir, 'scripts');

            if (enabled) {
                console.log('[Script] Enabling envRender... Extracting from zip-scripts.zip');
                const assetsDir = await AssetSyncService.getAssetsDir();
                const zipPath = path.join(assetsDir, 'quenching', 'zip-scripts.zip');

                if (!(await fs.pathExists(zipPath))) {
                    console.error(`[Script] Zip file not found: ${zipPath}`);
                    throw new Error(`脚本资源包不存在: ${zipPath}`);
                }

                // 解压到 scripts 目录
                // zip内部通常包含直接的脚本文件 (如 blizzard.j) 或 scripts/ 目录
                // 我们直接解压到 scriptsDir (已包含 baseDir/scripts)
                await fs.ensureDir(scriptsDir);
                await extractZip(zipPath, scriptsDir);
                console.log('[Script] Extraction complete.');
            } else {
                console.log('[Script] Disabling envRender... Removing scripts directory');
                if (await fs.pathExists(scriptsDir)) {
                    await fs.remove(scriptsDir);
                    console.log('[Script] Scripts directory removed.');
                }
            }

            return true;
        } catch (error) {
            console.error('[Script] Failed to update envRender settings:', error);
            throw error;
        }
    });
}

/**
 * 启动时根据设置清理环境渲染脚本
 */
export async function cleanupScriptsOnStartup(war3Path: string, modSettings: any) {
    // 默认关闭：未显式开启时清掉本地 scripts，避免旧默认开启残留
    if (modSettings.envRender !== true) {
        console.log('[Script] Cleaning up environment rendering scripts on startup');
        const retailPath = path.join(war3Path, '_retail_');
        const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
        const scriptsDir = path.join(baseDir, 'scripts');

        if (await fs.pathExists(scriptsDir)) {
            await fs.remove(scriptsDir).catch(e => console.error('[Script] Cleanup failed:', e));
        }
    }
}
