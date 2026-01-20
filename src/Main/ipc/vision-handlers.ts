import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';

/**
 * 扫描 VisionMod 目录获取模型文件列表
 */
async function scanVisionMod(visionModPath: string) {
    const retailPath = path.join(visionModPath, '_retail_');
    if (!(await fs.pathExists(retailPath))) {
        throw new Error('VisionMod 路径不正确，未找到 _retail_ 目录');
    }

    // 扫描 buildings, doodads, units 目录下的 mdx/mdl
    const patterns = [
        'buildings/**/*.{mdx,mdl}',
        'doodads/**/*.{mdx,mdl}',
        'units/**/*.{mdx,mdl}'
    ];

    const allFiles = await glob(patterns, { cwd: retailPath, posix: true });

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
