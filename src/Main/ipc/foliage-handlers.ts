import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import yauzl from 'yauzl';

async function getAssetsDir(): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
        return path.join(app.getAppPath(), 'assets');
    }
    return path.join(process.resourcesPath, 'assets');
}

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
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                reject(err);
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

export function registerFoliageHandlers() {
    console.log('[Foliage] Foliage handlers registered.');

    ipcMain.handle('foliage:update-settings', async (event, war3Path: string, enabled: boolean) => {
        console.log(`\n>>> [Foliage] Updating foliage: ${enabled ? 'ON' : 'OFF'}`);
        try {
            if (!war3Path) throw new Error('未提供魔兽路径');

            const retailPath = path.join(war3Path, '_retail_');
            const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;

            const environmentDir = path.join(baseDir, 'environment');
            const foliageDir = path.join(environmentDir, 'foliage');

            if (enabled) {
                console.log('[Foliage] Enabling... Extracting from zip-environment.zip');
                const assetsDir = await getAssetsDir();
                const zipPath = path.join(assetsDir, 'quenching', 'zip-environment.zip');

                if (!(await fs.pathExists(zipPath))) {
                    console.error(`[Foliage] Zip file not found: ${zipPath}`);
                    throw new Error(`环境资源包不存在: ${zipPath}`);
                }

                // 解压到 environment 目录
                // 注意：假设 zip 内部根目录就是 foliage 文件夹或者其内容
                // 根据用户描述，解压还原出来即可，通常 zip 包含 foliage/ 结构
                await fs.ensureDir(environmentDir);
                await extractZip(zipPath, environmentDir);
                console.log('[Foliage] Extraction complete.');
            } else {
                console.log('[Foliage] Disabling... Removing foliage directory');
                if (await fs.pathExists(foliageDir)) {
                    await fs.remove(foliageDir);
                    console.log('[Foliage] Foliage directory removed.');
                } else {
                    console.log('[Foliage] Foliage directory already gone.');
                }
            }

            console.log(`[Foliage] SUCCESSFULLY updated foliage to ${enabled}`);
            return true;

        } catch (error) {
            console.error('[Foliage] Failed to update foliage settings:', error);
            throw error;
        }
    });
}
