import { ipcMain, app } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import { configManager } from '../services/config-manager';

/** 亮度等级 1–5 对应强度系数（仅乘在 Intensity，不含 AmbIntensity） */
const LIGHTING_BRIGHTNESS_MULTIPLIERS: readonly number[] = [0.7, 0.9, 1.1, 1.3, 1.5];

function normalizeBrightnessLevel(level: unknown): number {
    const n = typeof level === 'number' ? level : parseInt(String(level), 10);
    if (n >= 1 && n <= 5) return n;
    return 3;
}

export function registerMdlHandlers() {
    /**
     * 更新光照设置
     * @param lightingMode 'standard' | 'battle' | 'rpg'
     * @param lightingBrightness 亮度等级 1–5，缺省为 3
     */
    ipcMain.handle(
        'mdl:update-lighting',
        async (event, war3Path: string, lightingMode: string, lightingBrightness?: number) => {
            try {
                if (!war3Path) {
                    war3Path = configManager.get('war3Path');
                }

                if (!war3Path) {
                    throw new Error('未设置魔兽争霸III路径');
                }

                const brightnessLevel = normalizeBrightnessLevel(lightingBrightness);
                const brightnessMul = LIGHTING_BRIGHTNESS_MULTIPLIERS[brightnessLevel - 1];
                console.log(`[MDL] Updating lighting mode: ${lightingMode}, brightness level: ${brightnessLevel} (×${brightnessMul})`);
                console.log(`[MDL] War3 Path: ${war3Path}`);

                const dncPath = path.join(war3Path, '_retail_', 'environment', 'dnc');

                await restoreDncFiles(war3Path);

                if (await fs.pathExists(dncPath)) {
                    console.log(`[MDL] Modifying DNC files in: ${dncPath}`);
                    await traverseAndModify(dncPath, lightingMode, brightnessLevel);
                    console.log('[MDL] Modification complete.');
                } else {
                    console.warn(`[MDL] DNC path not found after restore: ${dncPath}`);
                }

                return true;
            } catch (error) {
                console.error('Failed to update MDL lighting:', error);
                throw error;
            }
        }
    );
}

async function getAssetsDir(): Promise<string> {
    const possiblePaths = [];

    // 1. 开发环境 / 标准 App 路径
    possiblePaths.push(path.join(app.getAppPath(), 'assets'));

    // 2. 生产环境 resources 目录
    possiblePaths.push(path.join(process.resourcesPath, 'assets'));

    // 3. 向上查找 (应对某些特殊打包结构)
    possiblePaths.push(path.join(app.getAppPath(), '..', 'assets'));

    for (const p of possiblePaths) {
        if (await fs.pathExists(p)) {
            console.log(`[MDL] Found assets dir at: ${p}`);
            return p;
        }
    }

    console.warn('[MDL] Assets directory not found in standard locations, defaulting to appPath/assets');
    return path.join(app.getAppPath(), 'assets');
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
    const zipPath = path.join(assetsDir, 'quenching', 'zip-environment.zip');

    if (await fs.pathExists(zipPath)) {
        console.log(`[MDL] Found environment zip at: ${zipPath}`);
        // 解压到 _retail_/environment
        const targetDir = envPath;
        console.log(`[MDL] Extracting to: ${targetDir}`);

        try {
            await extractZip(zipPath, targetDir);

            // 验证解压结果
            if (await fs.pathExists(dncPath)) {
                console.log('[MDL] DNC directory restored successfully.');
            } else {
                console.error('[MDL] CRITICAL: DNC directory not found after extraction!');
                // 尝试列出 targetDir 内容以帮助调试
                try {
                    const files = await fs.readdir(targetDir);
                    console.log(`[MDL] Files in ${targetDir}:`, files);
                } catch (err) {
                    console.error('[MDL] Failed to list target dir:', err);
                }
                throw new Error('DNC directory restoration failed');
            }
        } catch (extractError) {
            console.error('[MDL] Zip extraction error:', extractError);
            throw extractError;
        }
    } else {
        const msg = `[MDL] Environment zip not found at: ${zipPath}, skipping restore.`;
        console.warn(msg);
        throw new Error(msg);
    }
}

async function extractZip(zipPath: string, extractPath: string): Promise<void> {
    await fs.ensureDir(extractPath);
    return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) {
                reject(err || new Error('Failed to open zip file'));
                return;
            }

            zipfile.readEntry();

            zipfile.on('entry', (entry) => {
                if (/\/$/.test(entry.fileName)) {
                    zipfile.readEntry();
                } else {
                    zipfile.openReadStream(entry, (err2, readStream) => {
                        if (err2 || !readStream) {
                            reject(err2 || new Error('Failed to read zip entry stream'));
                            return;
                        }

                        const out = path.join(extractPath, entry.fileName);

                        fs.ensureDir(path.dirname(out))
                            .then(() => {
                                const ws = fs.createWriteStream(out);
                                readStream.pipe(ws);
                                ws.on('close', () => zipfile.readEntry());
                                ws.on('error', (wsErr) => {
                                    console.error(`[MDL] Write stream error for ${out}:`, wsErr);
                                    reject(wsErr);
                                });
                            })
                            .catch((dirErr) => {
                                console.error(`[MDL] Directory creation error for ${out}:`, dirErr);
                                reject(dirErr);
                            });
                    });
                }
            });

            zipfile.on('end', () => resolve());

            zipfile.on('error', (e) => {
                console.error('[MDL] Yauzl error:', e);
                reject(e);
            });
        });
    });
}

async function traverseAndModify(dir: string, mode: string, brightnessLevel: number) {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await traverseAndModify(fullPath, mode, brightnessLevel);
        } else if (file.toLowerCase().endsWith('.mdl')) {
            await processMdlFile(fullPath, file, mode, brightnessLevel);
        }
    }
}

async function processMdlFile(filePath: string, fileName: string, mode: string, brightnessLevel: number) {
    let content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let modified = false;

    const lowerName = fileName.toLowerCase();
    const isUnderground = lowerName.includes('underground') || lowerName.includes('dungeon');
    const isUnit = lowerName.includes('unit');

    // --- 亮度逻辑配置 ---
    // Surface Standard: Amb -0.05, Int x1.0
    // Dungeon Standard: Amb -0.05, Int 5.5 (Unit) / 5.0 (Terrain) [Fixed]

    let targetAmb = -0.05;
    let targetIntMode: 'multiply' | 'fixed' = 'multiply';
    let targetIntVal = 1.0;

    if (isUnderground) {
        // --- 地牢环境 (Dungeon) ---
        targetIntMode = 'fixed';
        if (isUnit) {
            targetIntVal = 4.5; // 地牢单位固定值 (已提升)
        } else {
            targetIntVal = 4.0; // 地牢地形固定值 (保持0.5的层次差)
        }

        // 模式修正 (基于固定值)
        if (mode === 'rpg') {
            targetAmb = -0.2;
            targetIntVal = targetIntVal * 1.25;
        } else if (mode === 'battle') {
            targetAmb = 0.02;
            targetIntVal = targetIntVal * 1.1;
        }
    } else {
        // --- 地面环境 (Surface) ---
        targetIntMode = 'multiply';
        targetIntVal = 1.0; // 标准模式保持原值

        // 模式修正 (基于乘数)
        if (mode === 'rpg') {
            targetAmb = -0.12;
            if (isUnit) targetIntVal = 1.1;
            else targetIntVal = 1;
        } else if (mode === 'battle') {
            targetAmb = 0;
            targetIntVal = 1.4;
        }
    }

    // 亮度等级：在模式算出的直射光强度上乘系数，不改动 AmbIntensity
    const bl = Math.min(5, Math.max(1, brightnessLevel));
    targetIntVal = targetIntVal * LIGHTING_BRIGHTNESS_MULTIPLIERS[bl - 1];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        // 1. 修改 AmbIntensity
        if (lowerLine.startsWith('static ambintensity')) {
            const newVal = `\tstatic AmbIntensity ${targetAmb.toFixed(2)},`;
            if (lines[i] !== newVal) {
                lines[i] = newVal;
                modified = true;
            }
        }

        // 2. 修改 Intensity (支持 Static 和 Keyframes)
        if (lowerLine.startsWith('static intensity')) {
            // 处理静态 Intensity
            if (targetIntMode === 'fixed') {
                const newVal = `\tstatic Intensity ${targetIntVal.toFixed(2)},`;
                if (lines[i] !== newVal) {
                    lines[i] = newVal;
                    modified = true;
                }
            } else {
                // Multiply mode
                const match = line.match(/static Intensity\s+([\d.-]+)/i);
                if (match) {
                    const val = parseFloat(match[1]);
                    const newVal = `\tstatic Intensity ${(val * targetIntVal).toFixed(2)},`;
                    if (lines[i] !== newVal) {
                        lines[i] = newVal;
                        modified = true;
                    }
                }
            }
        } else {
            // 处理 Intensity 动画关键帧 (e.g., "0: 3.33,")
            // 简单判定：如果在 Intensity 块内 (需要上下文，这里简化为行匹配且上一行可能是Intensity相关)
            // 更严谨的方法是向上查找最近的 "Intensity"
            const intensityMatch = line.match(/^(\d+):\s*([\d.-]+),?$/);
            if (intensityMatch) {
                // 回溯查找是否在 Intensity 块中
                let isInsideIntensity = false;
                for (let j = i - 1; j >= 0; j--) {
                    const prev = lines[j].trim();
                    const prevLower = prev.toLowerCase();
                    // 找到 Intensity 头
                    if (prevLower.startsWith('intensity')) {
                        isInsideIntensity = true;
                        break;
                    }
                    // 遇到括号闭合或开启主要块，停止
                    if (prev.includes('}') || (prev.includes('{') && !prevLower.includes('intensity'))) {
                        break;
                    }
                }

                if (isInsideIntensity) {
                    const time = intensityMatch[1];
                    let newValStr = '';

                    if (targetIntMode === 'fixed') {
                        newValStr = `${targetIntVal.toFixed(2)}`;
                    } else {
                        const val = parseFloat(intensityMatch[2]);
                        newValStr = `${(val * targetIntVal).toFixed(2)}`;
                    }

                    const newVal = `\t\t${time}: ${newValStr},`;
                    if (lines[i].trim() !== newVal.trim()) {
                        lines[i] = newVal;
                        modified = true;
                    }
                }
            }
        }

        // 3. 修改 Rotation (Light Direction)
        const rotationMatch = line.match(/^(\d+):\s*\{\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\s*\},?$/);
        if (rotationMatch) {
            // 回溯查找是否在 Rotation 块中
            let isInsideRotation = false;
            for (let j = i - 1; j >= 0; j--) {
                const prev = lines[j].trim();
                const prevLower = prev.toLowerCase();
                if (prevLower.startsWith('rotation')) {
                    isInsideRotation = true;
                    break;
                }
                if (prev.includes('}') || (prev.includes('{') && !prevLower.includes('rotation'))) {
                    break;
                }
            }

            if (isInsideRotation) {
                const time = rotationMatch[1];
                // 修改光照方向 (X, Y, Z, W)
                // 新方向: { 0.25, 0.25, 0.8, 0 }
                // 解释：让光线更倾斜一些，增加立体感
                const newVal = `\t\t${time}: { -0.25, 0.25, 0.8, 0 },`;
                if (lines[i].trim() !== newVal.trim()) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
        }
    }

    if (modified) {
        await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    }
}
