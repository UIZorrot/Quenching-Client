import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { AssetSyncService } from '../services/asset-sync';

const GLOW_RELATIVE = path.join('textures', 'fx', 'flare', 'heroglow_bw.dds');
const ASSET_GLOW_NAME = 'heroglow_bw.dds';

async function resolveBaseDir(war3Path: string): Promise<string> {
    const retailPath = path.join(war3Path, '_retail_');
    return (await fs.pathExists(retailPath)) ? retailPath : war3Path;
}

function glowTargetPath(baseDir: string): string {
    return path.join(baseDir, GLOW_RELATIVE);
}

export function registerGlowHandlers() {
    console.log('[Glow] Glow handlers registered.');

    ipcMain.handle('glow:update-settings', async (_event, war3Path: string, enabled: boolean) => {
        // enabled=true → weak (install client asset); enabled=false → strong (remove local override)
        console.log(`\n>>> [Glow] Updating hero glow: ${enabled ? 'WEAK' : 'STRONG'}`);
        try {
            if (!war3Path) throw new Error('未提供魔兽路径');

            const baseDir = await resolveBaseDir(war3Path);
            const glowFile = glowTargetPath(baseDir);
            // Clean up legacy rename-based backup if present
            const legacyDis = path.join(baseDir, 'textures', 'fx', 'flare', 'heroglow_bw-dis.dds');

            if (enabled) {
                const assetsDir = await AssetSyncService.getAssetsDir();
                const source = path.join(assetsDir, 'quenching', ASSET_GLOW_NAME);
                if (!(await fs.pathExists(source))) {
                    throw new Error(`光晕资源不存在: ${source}`);
                }
                await fs.ensureDir(path.dirname(glowFile));
                await fs.copy(source, glowFile, { overwrite: true });
                if (await fs.pathExists(legacyDis)) {
                    await fs.remove(legacyDis);
                }
                console.log(`[Glow] Installed WEAK glow from assets → ${glowFile}`);
            } else {
                if (await fs.pathExists(glowFile)) {
                    await fs.remove(glowFile);
                    console.log(`[Glow] Removed local glow override → STRONG (CASC default): ${glowFile}`);
                } else {
                    console.log('[Glow] Strong glow already active (no local override).');
                }
                if (await fs.pathExists(legacyDis)) {
                    await fs.remove(legacyDis);
                }
            }

            return true;
        } catch (error) {
            console.error('[Glow] Failed to update glow settings:', error);
            throw error;
        }
    });
}
