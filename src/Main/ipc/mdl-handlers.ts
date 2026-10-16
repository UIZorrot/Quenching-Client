import { ipcMain } from 'electron';
import path from 'path';
import { configManager } from '../services/config-manager';
import { AssetSyncService, syncLightingResources } from '../services/asset-sync';
import { normalizeBrightnessLevel } from '../services/dnc-lighting';

export function registerMdlHandlers() {
    /**
     * 更新光照设置
     * @param lightingMode 'standard' | 'enhanced' | 'battle' | 'rpg'
     */
    ipcMain.handle(
        'mdl:update-lighting',
        async (
            _event,
            war3Path: string,
            lightingMode: string,
            lightingBrightness?: number,
        ) => {
            try {
                if (!war3Path) {
                    war3Path = configManager.get('war3Path');
                }

                if (!war3Path) {
                    throw new Error('未设置魔兽争霸III路径');
                }

                const brightnessLevel = normalizeBrightnessLevel(lightingBrightness);
                console.log(`[MDL] Updating lighting mode: ${lightingMode}, brightness level: ${brightnessLevel}`);

                const modSettings = configManager.get('modSettings') || {};
                const settings = { ...modSettings, lighting: lightingMode, lightingBrightness: brightnessLevel };
                // Shaders and DNC are selected per lighting mode; DNC is restored
                // from the bundle and patched, so brightness never compounds.
                const assetsDir = await AssetSyncService.getAssetsDir();
                await syncLightingResources(war3Path, path.join(assetsDir, 'quenching'), settings);
                return true;
            } catch (error) {
                console.error('Failed to update MDL lighting:', error);
                throw error;
            }
        }
    );
}
