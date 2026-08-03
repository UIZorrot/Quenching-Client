import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { assertFullPackageInstalled } from '../services/full-package-service';

export function registerGlowHandlers() {
    console.log('[Glow] Glow handlers registered.');

    ipcMain.handle('glow:update-settings', async (_event, war3Path: string, enabled: boolean) => {
        console.log(`\n>>> [Glow] Updating hero glow: ${enabled ? 'WEAK' : 'STRONG'}`);
        try {
            if (!war3Path) throw new Error('未提供魔兽路径');

            await assertFullPackageInstalled(war3Path);

            const retailPath = path.join(war3Path, '_retail_');
            const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;

            const glowFile = path.join(baseDir, 'textures', 'fx', 'flare', 'heroglow_bw.dds');
            const glowDisFile = path.join(baseDir, 'textures', 'fx', 'flare', 'heroglow_bw-dis.dds');

            if (enabled) {
                // 弱：启用精简贴图 heroglow_bw.dds
                if (await fs.pathExists(glowDisFile)) {
                    if (await fs.pathExists(glowFile)) {
                        await fs.remove(glowFile);
                    }
                    await fs.move(glowDisFile, glowFile);
                    console.log('[Glow] Switched to WEAK glow (heroglow_bw.dds).');
                } else {
                    console.log('[Glow] Weak glow file already active or missing backup.');
                }
            } else {
                // 强：移除本地精简贴图，回退游戏默认强光晕
                if (await fs.pathExists(glowFile)) {
                    if (await fs.pathExists(glowDisFile)) {
                        await fs.remove(glowDisFile);
                    }
                    await fs.move(glowFile, glowDisFile);
                    console.log('[Glow] Switched to STRONG glow (default).');
                } else {
                    console.log('[Glow] Strong glow already active or file not found.');
                }
            }

            return true;
        } catch (error) {
            console.error('[Glow] Failed to update glow settings:', error);
            throw error;
        }
    });
}
