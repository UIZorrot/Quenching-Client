import { app } from 'electron';
import { configManager } from './services/config-manager';
import { AssetSyncService } from './services/asset-sync';
import { cleanupShadersOnStartup } from './ipc/shader-handlers';
import { cleanupScriptsOnStartup } from './ipc/script-handlers';
import { cleanupFoliageOnStartup } from './ipc/foliage-handlers';

console.log('[AssetSync Init] Module loaded');

app.whenReady().then(async () => {
    console.log('\n==================== [AssetSync] Startup Check Begin ====================');

    try {
        const war3Path = configManager.get('war3Path');
        console.log(`[AssetSync Init] Current War3Path from config: ${war3Path}`);

        if (war3Path) {
            console.log('[AssetSync Init] War3Path detected, starting asset synchronization...');
            await AssetSyncService.syncAssetsBeforeLaunch(war3Path);
            console.log('[AssetSync Init] Asset synchronization completed.');

            // 启动时清理已禁用的着色器文件
            const modSettings = configManager.get('modSettings');
            if (modSettings) {
                await cleanupShadersOnStartup(war3Path, modSettings);
                await cleanupScriptsOnStartup(war3Path, modSettings);
                await cleanupFoliageOnStartup(war3Path, modSettings);
            }
        } else {
            console.warn('[AssetSync Init] War3Path not configured. Skipping asset synchronization.');
            console.warn('[AssetSync Init] Please configure the Warcraft III path in settings to enable asset sync.');
        }
    } catch (error) {
        console.error('[AssetSync Init] Failed to sync core assets on startup:', error);
    }

    console.log('==================== [AssetSync] Startup Check Complete ====================\n');
});
