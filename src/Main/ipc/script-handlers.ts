import { getSelectedGameFolder } from '../services/game-channel';
import { ipcMain } from 'electron';
import path from 'path';
import { rm } from 'node:fs/promises';
import fs from 'fs-extra';
import { AssetSyncService } from '../services/asset-sync';
import { syncBundledResourceFiles } from '../services/managed-resource-files';

const SCRIPT_MARKER = '.quenching-managed-scripts.json';

/**
 * 通用解压函数
 */
export function registerScriptHandlers() {
    console.log('[Script] Script handlers registered.');

    ipcMain.handle('script:update-env-render', async (event, war3Path: string, enabled: boolean) => {
        console.log(`\n>>> [Script] Updating environment rendering (envRender): ${enabled ? 'ON' : 'OFF'}`);
        try {
            await syncEnvironmentScripts(war3Path, enabled);
            return true;
        } catch (error) {
            console.error('[Script] Failed to update envRender settings:', error);
            throw error;
        }
    });
}

export async function syncEnvironmentScripts(war3Path: string, enabled: boolean): Promise<void> {
    if (!war3Path) throw new Error('未提供魔兽路径');
    const retailPath = path.join(war3Path, getSelectedGameFolder());
    const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
    const scriptsDir = path.join(baseDir, 'scripts');
    const assetsDir = await AssetSyncService.getAssetsDir();
    const zipPath = path.join(assetsDir, 'quenching', 'scripts', 'zip-scripts.zip');
    if (enabled && !(await fs.pathExists(zipPath))) throw new Error(`脚本资源包不存在: ${zipPath}`);

    const staging = await fs.mkdtemp(path.join(baseDir, '.quenching-scripts-'));
    try {
        if (await fs.pathExists(zipPath)) await AssetSyncService.extractZip(zipPath, staging);
        const known = await fs.readdir(staging);
        await syncBundledResourceFiles(
            scriptsDir,
            enabled ? [{ source: staging }] : [],
            known.length ? [{ source: staging }] : [],
            SCRIPT_MARKER,
        );
    } finally {
        await rm(staging, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
    }
}

/**
 * 启动时根据设置清理环境渲染脚本
 */
export async function cleanupScriptsOnStartup(war3Path: string, modSettings: any) {
    // 默认关闭：只移除与客户端资产或上次安装指纹一致的脚本。
    if (modSettings.envRender !== true) {
        console.log('[Script] Cleaning up owned environment rendering scripts on startup');
        await syncEnvironmentScripts(war3Path, false).catch(e => console.error('[Script] Cleanup failed:', e));
    }
}
