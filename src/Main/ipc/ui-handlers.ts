import { ipcMain } from 'electron';
import { UIService } from '../services/ui-service';

export function registerUIHandlers() {
    ipcMain.handle('ui:sync-settings', async (_event, war3Path: string) => UIService.syncConfiguredUI(war3Path));
    /**
     * 更新 UI 风格设置
     * @param uiMode 'classic' | 'quenching' | 'carnival'
     */
    ipcMain.handle('ui:update-settings', async (event, war3Path: string, uiMode: string) => {
        try {
            return await UIService.applyUISettings(war3Path, uiMode);
        } catch (error) {
            console.error('Failed to update UI settings:', error);
            throw error;
        }
    });
}

