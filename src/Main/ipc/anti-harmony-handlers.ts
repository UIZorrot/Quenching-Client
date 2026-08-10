import { ipcMain } from 'electron';
import { configManager } from '../services/config-manager';
import { isAntiHarmonyEnabled, setAntiHarmonyEnabled } from '../services/anti-harmony-service';

export function registerAntiHarmonyHandlers() {
    console.log('[AntiHarmony] Handlers registered.');

    ipcMain.handle('anti-harmony:get-status', async (_event, war3Path?: string) => {
        const path = war3Path || (configManager.get('war3Path') as string | undefined);
        return await isAntiHarmonyEnabled(path);
    });

    ipcMain.handle('anti-harmony:set-enabled', async (event, war3Path: string | undefined, enabled: boolean) => {
        const path = war3Path || (configManager.get('war3Path') as string | undefined);
        if (!path) {
            throw new Error('δ����ħ������III·��');
        }

        const sender = event.sender;
        const result = await setAntiHarmonyEnabled(path, enabled, (progress) => {
            try {
                sender.send('anti-harmony:progress', progress);
            } catch {
                // window may be closed
            }
        });

        return result;
    });

    // Back-compat with earlier install-only API
    ipcMain.handle('anti-harmony:install', async (event, war3Path?: string) => {
        const path = war3Path || (configManager.get('war3Path') as string | undefined);
        if (!path) {
            throw new Error('δ����ħ������III·��');
        }
        const sender = event.sender;
        return await setAntiHarmonyEnabled(path, true, (progress) => {
            try {
                sender.send('anti-harmony:progress', progress);
            } catch {
                // ignore
            }
        });
    });
}
