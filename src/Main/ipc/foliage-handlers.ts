import { ipcMain } from 'electron';
import { applyFoliageSettings } from '../services/foliage-service';

export function registerFoliageHandlers() {
    console.log('[Foliage] Foliage handlers registered.');

    ipcMain.handle(
        'foliage:update-settings',
        async (_event, war3Path: string, enabled: boolean, terrainMode?: string) => {
            console.log(`\n>>> [Foliage] Updating foliage: ${enabled ? 'ON' : 'OFF'}`);
            try {
                if (!war3Path) throw new Error('未提供魔兽路径');

                await applyFoliageSettings(war3Path, enabled, terrainMode);
                console.log(`[Foliage] SUCCESSFULLY updated foliage to ${enabled}`);
                return true;
            } catch (error) {
                console.error('[Foliage] Failed to update foliage settings:', error);
                throw error;
            }
        }
    );
}

export { syncFoliageOnStartup } from '../services/foliage-service';
