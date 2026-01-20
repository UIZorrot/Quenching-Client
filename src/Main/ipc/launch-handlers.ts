import { ipcMain, dialog } from 'electron';
import { GameLauncher } from '../services/game-launcher';
import { configManager } from '../services/config-manager';
import { themeService } from '../services/theme-service';
import { AssetSyncService } from '../services/asset-sync';
import fs from 'fs-extra';
import path from 'path';

export function registerLaunchHandlers() {
    const isFullPackageInstalled = async (war3Path: string | undefined): Promise<boolean> => {
        if (!war3Path) {
            return false;
        }

        const patchDir = path.join(war3Path, '_retail_', 'patch');
        const qmoffPatchDir = path.join(war3Path, '_retail_', 'QMoff', 'patch');
        const patchKeep = path.join(patchDir, 'keep.que');
        const qmoffKeep = path.join(qmoffPatchDir, 'keep.que');

        if (await fs.pathExists(patchKeep) || await fs.pathExists(qmoffKeep)) {
            return true;
        }

        const patchExists = (await fs.pathExists(patchDir)) && (await fs.readdir(patchDir)).length > 0;
        const qmoffPatchExists = (await fs.pathExists(qmoffPatchDir)) && (await fs.readdir(qmoffPatchDir)).length > 0;

        if (patchExists || qmoffPatchExists) {
            return true;
        }

        return false;
    };
    ipcMain.handle('game:launch', async (event, executablePath?: string) => {
        try {
            return await GameLauncher.launchGame(executablePath);
        } catch (e: any) {
            console.error(e);
            if (e.message && (e.message.includes('not found') || e.message.includes('不存在'))) {
                configManager.delete('war3Path');
            }
            throw e;
        }
    });

    ipcMain.handle('game:select-path', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: '请选择魔兽争霸III安装目录 (包含 Warcraft III.exe)'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];

            const possibleExes = [
                path.join(selectedPath, 'Warcraft III.exe'),
                path.join(selectedPath, '_retail_', 'x86_64', 'Warcraft III.exe'),
                path.join(selectedPath, 'x86_64', 'Warcraft III.exe')
            ];

            let isValid = false;
            for (const exe of possibleExes) {
                if (await fs.pathExists(exe)) {
                    isValid = true;
                    break;
                }
            }

            if (isValid) {
                configManager.set('war3Path', selectedPath);
                return selectedPath;
            } else {
                dialog.showErrorBox('路径无效', '所选目录中未找到 Warcraft III.exe，请重新选择正确的游戏安装目录。');
                return null;
            }
        }
        return null;
    });

    ipcMain.handle('config:get', (event, key) => {
        return configManager.get(key);
    });

    ipcMain.handle('config:set', (event, key, value) => {
        return configManager.set(key, value);
    });

    ipcMain.handle('theme:apply', async (event, themeId: string) => {
        return await themeService.applyThemeToGame(themeId);
    });
    ipcMain.handle('mod:get-full-package-status', async (event, explicitPath?: string) => {
        const war3Path = (explicitPath || (configManager.get('war3Path') as string | undefined));
        return await isFullPackageInstalled(war3Path);
    });

    ipcMain.handle('mod:install-full-package', async (event, zipPath: string) => {
        const war3Path = configManager.get('war3Path') as string | undefined;

        if (!war3Path) {
            return {
                success: false,
                error: 'noWar3Path'
            };
        }

        if (await isFullPackageInstalled(war3Path)) {
            return {
                success: true,
                skipped: true
            };
        }

        if (!zipPath || !(await fs.pathExists(zipPath))) {
            return {
                success: false,
                error: 'noZip'
            };
        }

        try {
            await AssetSyncService.extractZip(zipPath, war3Path);
            return {
                success: true,
                skipped: false
            };
        } catch (e: any) {
            return {
                success: false,
                error: e && e.message ? e.message : String(e)
            };
        }
    });
}
