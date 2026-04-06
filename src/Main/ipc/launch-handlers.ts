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

    ipcMain.handle('game:launch-map', async (event, mapPath: string, difficulty: number) => {
        try {
            return await GameLauncher.launchMap(mapPath, difficulty);
        } catch (e: any) {
            console.error(e);
            throw e;
        }
    });

    ipcMain.handle('game:select-path', async () => {
        const isMac = process.platform === 'darwin';
        const result = await dialog.showOpenDialog({
            properties: isMac ? ['openDirectory', 'openFile'] : ['openDirectory'],
            title: isMac ? '请选择魔兽争霸III安装目录或 Warcraft III.app' : '请选择魔兽争霸III安装目录 (包含 Warcraft III.exe)',
            filters: isMac ? [{ name: 'Applications', extensions: ['app'] }] : []
        });

        if (!result.canceled && result.filePaths.length > 0) {
            let selectedPath = result.filePaths[0];

            // 如果用户直接选择了 .app 文件，我们将路径设为其父目录（root）
            if (isMac && selectedPath.endsWith('.app')) {
                selectedPath = path.dirname(selectedPath);
            }

            const possibleExes = isMac ? [
                path.join(selectedPath, 'Warcraft III.app'),
                path.join(selectedPath, '_retail_', 'Warcraft III.app'),
            ] : [
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
                // Additional validation: Check if _retail_ directory exists
                const retailPath = path.join(selectedPath, '_retail_');
                const hasRetailDir = await fs.pathExists(retailPath);

                if (!hasRetailDir) {
                    dialog.showErrorBox('路径无效', '所选目录中未找到 _retail_ 文件夹，请选择正确的魔兽争霸III安装目录。\n\n有效的目录应包含 _retail_ 子文件夹。');
                    return null;
                }

                configManager.set('war3Path', selectedPath);
                return selectedPath;
            } else {
                const msg = isMac ? '所选目录中未找到 Warcraft III.app' : '所选目录中未找到 Warcraft III.exe';
                dialog.showErrorBox('路径无效', `${msg}，请重新选择正确的游戏安装目录。`);
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

        // 允许覆盖安装，移除已安装检查
        // if (await isFullPackageInstalled(war3Path)) {
        //     return {
        //         success: true,
        //         skipped: true
        //     };
        // }

        if (!zipPath || !(await fs.pathExists(zipPath))) {
            return {
                success: false,
                error: 'noZip'
            };
        }

        try {
            const targetPath = path.join(war3Path, '_retail_');
            await AssetSyncService.extractZip(zipPath, targetPath, (percent, currentFile) => {
                event.sender.send('mod:install-progress', { percent, message: `正在安装: ${currentFile}` });
            });
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

    ipcMain.handle('mod:sync-assets', async (event) => {
        try {
            const war3Path = configManager.get('war3Path');
            if (war3Path) {
                // Ensure we call syncAssetsBeforeLaunch which handles checking mod status and missing files
                await AssetSyncService.syncAssetsBeforeLaunch(war3Path);
            }
        } catch (error) {
            console.error('[LaunchHandlers] Failed to sync assets:', error);
            // Optionally rethrow if you want the renderer to know it failed
            throw error;
        }
    });
}
