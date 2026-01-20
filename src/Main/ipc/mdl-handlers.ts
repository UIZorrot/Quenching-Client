import { ipcMain, app } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import { configManager } from '../services/config-manager';

export function registerMdlHandlers() {
    /**
     * 更新光照设置
     * @param lightingMode 'standard' | 'battle' | 'rpg'
     */
    ipcMain.handle('mdl:update-lighting', async (event, war3Path: string, lightingMode: string) => {
        try {
            if (!war3Path) {
                war3Path = configManager.get('war3Path');
            }

            if (!war3Path) {
                throw new Error('未设置魔兽争霸III路径');
            }

            console.log(`[MDL] Updating lighting to mode: ${lightingMode}`);
            console.log(`[MDL] War3 Path: ${war3Path}`);

            const dncPath = path.join(war3Path, '_retail_', 'environment', 'dnc');

            // 1. 还原 DNC 文件 (从 zip-environment.zip)
            await restoreDncFiles(war3Path);

            // 2. 如果是 'standard' (普通) 模式，还原后即可结束
            if (lightingMode === 'standard') {
                console.log('[MDL] Standard mode selected, restoration complete.');
                return true;
            }

            // 3. 遍历并修改 DNC 文件
            if (await fs.pathExists(dncPath)) {
                console.log(`[MDL] Modifying DNC files in: ${dncPath}`);
                await traverseAndModify(dncPath, lightingMode);
                console.log('[MDL] Modification complete.');
            } else {
                console.warn(`[MDL] DNC path not found after restore: ${dncPath}`);
            }

            return true;
        } catch (error) {
            console.error('Failed to update MDL lighting:', error);
            throw error;
        }
    });
}

async function getAssetsDir(): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
        // 开发环境：使用 app.getAppPath() 获取项目根目录，然后指向 assets
        // app.getAppPath() 在开发模式下通常指向 package.json 所在目录
        return path.join(app.getAppPath(), 'assets');
    }
    // 生产环境
    return path.join(process.resourcesPath, 'assets');
}

async function restoreDncFiles(war3Path: string) {
    const dncPath = path.join(war3Path, '_retail_', 'environment', 'dnc');
    const envPath = path.join(war3Path, '_retail_', 'environment');

    // 删除现有 DNC 目录
    console.log(`[MDL] Removing existing DNC directory: ${dncPath}`);
    try {
        await fs.remove(dncPath);
    } catch (e) {
        console.error(`[MDL] Failed to remove DNC directory: ${e}`);
    }

    // 找到 zip-environment.zip
    const assetsDir = await getAssetsDir();
    console.log(`[MDL] Assets directory: ${assetsDir}`);

    // Core file location: QuenChing-Electron-Client\assets\quenching\zip-environment.zip
    const zipPath = path.join(assetsDir, 'quenching', 'zip-environment.zip');

    if (await fs.pathExists(zipPath)) {
        console.log(`[MDL] Found environment zip at: ${zipPath}`);
        // 解压到 _retail_/environment
        const targetDir = envPath;
        console.log(`[MDL] Extracting to: ${targetDir}`);
        await extractZip(zipPath, targetDir);
    } else {
        console.warn(`[MDL] Environment zip not found at: ${zipPath}, skipping restore.`);
    }
}

async function extractZip(zipPath: string, extractPath: string): Promise<void> {
    await fs.ensureDir(extractPath);
    return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) { reject(err); return; }
            zipfile.readEntry();
            zipfile.on('entry', (entry) => {
                if (/\/$/.test(entry.fileName)) {
                    zipfile.readEntry();
                } else {
                    zipfile.openReadStream(entry, (err2, readStream) => {
                        if (err2 || !readStream) { reject(err2); return; }
                        const out = path.join(extractPath, entry.fileName);
                        fs.ensureDir(path.dirname(out)).then(() => {
                            const ws = fs.createWriteStream(out);
                            readStream.pipe(ws);
                            ws.on('close', () => zipfile.readEntry());
                        }).catch(reject);
                    });
                }
            });
            zipfile.on('end', () => resolve());
            zipfile.on('error', (e) => reject(e));
        });
    });
}

async function traverseAndModify(dir: string, mode: string) {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await traverseAndModify(fullPath, mode);
        } else if (file.toLowerCase().endsWith('.mdl')) {
            await processMdlFile(fullPath, file, mode);
        }
    }
}

async function processMdlFile(filePath: string, fileName: string, mode: string) {
    let content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let modified = false;

    const lowerName = fileName.toLowerCase();
    const isUnderground = lowerName.includes('underground') || lowerName.includes('dungeon');
    const isUnit = lowerName.includes('unit');
    const isTerrain = lowerName.includes('terrain');

    // 确定目标参数
    let targetAmb = 0;
    let targetInt = 0; // 仅用于 underground 固定值
    let intMultiplier = 1; // 用于非 underground 的倍率

    if (isUnderground) {
        // 地下环境默认值
        targetAmb = -0.1;
        if (isUnit) targetInt = 4.0;
        else targetInt = 3.5; // 地形

        // 根据模式微调地下环境
        if (mode === 'rpg') {
            targetAmb = -0.15;
            targetInt = targetInt * 0.9;
        } else if (mode === 'battle') {
            targetAmb = 0.1;
            targetInt = targetInt * 1.25;
        }
    } else {
        if (mode === 'rpg') {
            targetAmb = -0.15;
            if (isUnit) intMultiplier = 0.9;
            else intMultiplier = 0.8;
        } else if (mode === 'battle') {
            targetAmb = 0.1;
            intMultiplier = 1.25;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        // 1. 修改 AmbIntensity
        if (lowerLine.startsWith('static ambintensity')) {
            // 地下环境固定值，其他模式也是直接设置值
            const newVal = `\tstatic AmbIntensity ${targetAmb.toFixed(2)},`;
            if (lines[i] !== newVal) {
                lines[i] = newVal;
                modified = true;
            }
        }

        // 2. 修改 Intensity
        if (lowerLine.startsWith('static intensity')) {
            if (isUnderground) {
                // 地下环境：使用固定值
                const newVal = `\tstatic Intensity ${targetInt.toFixed(2)},`;
                if (lines[i] !== newVal) {
                    lines[i] = newVal;
                    modified = true;
                }
            } else {
                // 其他模式：乘法
                const match = line.match(/static Intensity\s+([\d.-]+)/i);
                if (match) {
                    const val = parseFloat(match[1]);
                    const newVal = `\tstatic Intensity ${(val * intMultiplier).toFixed(2)},`;
                    if (lines[i] !== newVal) {
                        lines[i] = newVal;
                        modified = true;
                    }
                }
            }
        } else {
            // 检查 Intensity 关键帧 (0: 3.33, ...)
            const intensityMatch = line.match(/^(\d+):\s*([\d.-]+),?$/);
            if (intensityMatch) {
                // 确认在 Intensity 块内
                let isInsideIntensity = false;
                for (let j = i - 1; j >= 0; j--) {
                    const prev = lines[j].trim();
                    const prevLower = prev.toLowerCase();
                    if (prevLower.startsWith('intensity')) { isInsideIntensity = true; break; }
                    if (prev.includes('}') || (prev.includes('{') && !prevLower.includes('intensity'))) { break; }
                }

                if (isInsideIntensity) {
                    if (isUnderground) {
                        // 地下环境：固定值 (覆盖所有时间点)
                        const time = intensityMatch[1];
                        const newVal = `\t\t${time}: ${targetInt.toFixed(2)},`;
                        if (lines[i].trim() !== newVal.trim()) {
                            lines[i] = newVal;
                            modified = true;
                        }
                    } else {
                        // 其他模式：乘法
                        const time = intensityMatch[1];
                        const val = parseFloat(intensityMatch[2]);
                        const newVal = `\t\t${time}: ${(val * intMultiplier).toFixed(2)},`;
                        if (lines[i].trim() !== newVal.trim()) {
                            lines[i] = newVal;
                            modified = true;
                        }
                    }
                }
            }
        }
    }

    if (modified) {
        // console.log(`[MDL] Modified file: ${fileName}`);
        await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    }
}
