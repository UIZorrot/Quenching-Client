import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';

export function registerGlowHandlers() {
    console.log('[Glow] Glow handlers registered.');

    ipcMain.handle('glow:update-settings', async (event, war3Path: string, enabled: boolean) => {
        console.log(`\n>>> [Glow] Updating hero glow: ${enabled ? 'REDUCED (ON)' : 'DEFAULT (OFF)'}`);
        try {
            if (!war3Path) throw new Error('未提供魔兽路径');

            const retailPath = path.join(war3Path, '_retail_');
            const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;

            const glowFile = path.join(baseDir, 'textures', 'fx', 'flare', 'heroglow_bw.dds');
            const glowDisFile = path.join(baseDir, 'textures', 'fx', 'flare', 'heroglow_bw-dis.dds');

            if (enabled) {
                // 减小光晕：启用该文件
                if (await fs.pathExists(glowDisFile)) {
                    // 如果存在备份文件，则重命名回正式文件
                    if (await fs.pathExists(glowFile)) {
                        await fs.remove(glowFile);
                    }
                    await fs.move(glowDisFile, glowFile);
                    console.log('[Glow] Enabled reduced glow by moving -dis file.');
                } else {
                    console.log('[Glow] Reduced glow file already active or missing backup.');
                }
            } else {
                // 还原光晕：禁用该文件（重命名为 -dis）
                if (await fs.pathExists(glowFile)) {
                    if (await fs.pathExists(glowDisFile)) {
                        await fs.remove(glowDisFile);
                    }
                    await fs.move(glowFile, glowDisFile);
                    console.log('[Glow] Disabled reduced glow by moving to -dis.');
                } else {
                    console.log('[Glow] Glow file already disabled or not found.');
                }
            }

            return true;
        } catch (error) {
            console.error('[Glow] Failed to update glow settings:', error);
            throw error;
        }
    });
}
