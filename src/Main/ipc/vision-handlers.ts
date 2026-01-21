import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { promisify } from 'util';

/**
 * 扫描 VisionMod 目录获取模型文件列表
 */
async function scanVisionMod(visionModPath: string) {
    const retailPath = path.join(visionModPath, '_retail_');
    console.log(`[Vision] Scanning VisionMod at: ${retailPath}`);

    if (!(await fs.pathExists(retailPath))) {
        throw new Error(`VisionMod 路径不正确，未找到 _retail_ 目录: ${retailPath}`);
    }

    // 扫描 buildings, doodads, units 目录下的 mdx/mdl
    // 使用大括号扩展语法以兼容旧版 glob
    const pattern = '{buildings,doodads,units}/**/*.{mdx,mdl}';

    console.log(`[Vision] Using glob pattern: ${pattern}`);

    // 这里由于 glob 版本差异，我们统一处理
    let allFiles: string[] = [];
    try {
        let globFn: any;
        // @ts-ignore
        if (typeof glob === 'function') {
            // @ts-ignore
            globFn = glob;
        } else if (typeof (glob as any).glob === 'function') {
            globFn = (glob as any).glob;
        }

        if (!globFn) {
            throw new Error('无法找到可用的 glob 函数');
        }

        // 检测是否已经是 Promise (glob v9+)
        const result = globFn(pattern, { cwd: retailPath, posix: true });
        if (result && typeof result.then === 'function') {
            allFiles = await result;
        } else {
            // 如果不是 Promise，说明是旧版 glob (v7/v8)，使用 promisify 包装
            allFiles = await promisify(globFn)(pattern, { cwd: retailPath, posix: true }) as string[];
        }
    } catch (e) {
        console.error('[Vision] Glob scan failed:', e);
        throw e;
    }

    console.log(`[Vision] Found ${allFiles.length} files in VisionMod`);

    const portraits = allFiles.filter(f => f.toLowerCase().endsWith('_portrait.mdx') || f.toLowerCase().endsWith('_portrait.mdl'));
    const enhancements = allFiles.filter(f => !f.toLowerCase().endsWith('_portrait.mdx') && !f.toLowerCase().endsWith('_portrait.mdl'));

    return { portraits, enhancements };
}

export function registerVisionHandlers() {
    console.log('[Vision] Vision handlers registered.');

    // 处理半身头像
    ipcMain.handle('vision:update-half-portrait', async (event, war3Path: string, visionModPath: string, enabled: boolean) => {
        console.log(`[Vision] Updating half portrait: ${enabled}`);
        try {
            if (!visionModPath || !(await fs.pathExists(visionModPath))) {
                throw new Error('未设置或无效的 VisionMod 路径');
            }

            const { portraits } = await scanVisionMod(visionModPath);
            const war3Retail = path.join(war3Path, '_retail_');
            const visionRetail = path.join(visionModPath, '_retail_');

            for (const relPath of portraits) {
                const targetPath = path.join(war3Retail, relPath);
                if (enabled) {
                    const sourcePath = path.join(visionRetail, relPath);
                    await fs.ensureDir(path.dirname(targetPath));
                    await fs.copy(sourcePath, targetPath);
                } else {
                    if (await fs.pathExists(targetPath)) {
                        await fs.remove(targetPath);
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('[Vision] Failed to update half portrait:', error);
            throw error;
        }
    });

    // 处理模型增强
    ipcMain.handle('vision:update-model-enhance', async (event, war3Path: string, visionModPath: string, enabled: boolean) => {
        console.log(`[Vision] Updating model enhance: ${enabled}`);
        try {
            if (!visionModPath || !(await fs.pathExists(visionModPath))) {
                throw new Error('未设置或无效的 VisionMod 路径');
            }

            const { enhancements } = await scanVisionMod(visionModPath);
            const war3Retail = path.join(war3Path, '_retail_');
            const visionRetail = path.join(visionModPath, '_retail_');

            for (const relPath of enhancements) {
                const targetPath = path.join(war3Retail, relPath);
                if (enabled) {
                    const sourcePath = path.join(visionRetail, relPath);
                    await fs.ensureDir(path.dirname(targetPath));
                    await fs.copy(sourcePath, targetPath);
                } else {
                    if (await fs.pathExists(targetPath)) {
                        await fs.remove(targetPath);
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('[Vision] Failed to update model enhance:', error);
            throw error;
        }
    });
}
