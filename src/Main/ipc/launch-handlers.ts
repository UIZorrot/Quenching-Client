import { ipcMain, dialog } from 'electron';
import { GameLauncher } from '../services/game-launcher';
import { configManager } from '../services/config-manager';
import { themeService } from '../services/theme-service';
import { AssetSyncService } from '../services/asset-sync';
import fs from 'fs-extra';
import path from 'path';
import { extractCampaignW3nMerged } from '../services/campaign-w3n-merge';
import { readInstalledCampaignMetadata, InstalledCampaignMetadata } from '../services/campaign-metadata';
import { isFullPackageInstalled, removeTerrainSlkIfFullPackageMissing } from '../services/full-package-service';

function slugFromW3nBasename(w3nPath: string): string {
    const ext = path.extname(w3nPath);
    let base = path.basename(w3nPath, ext);
    base = base.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (!base) base = 'campaign';
    return base;
}

export function registerLaunchHandlers() {
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

    ipcMain.handle('campaign:extract-w3n', async (event, w3nPath: string) => {
        try {
            if (!w3nPath) {
                throw new Error('w3n path is required');
            }
            if (!(await fs.pathExists(w3nPath))) {
                throw new Error(`w3n not found: ${w3nPath}`);
            }
            const ext = path.extname(w3nPath).toLowerCase();
            if (ext !== '.w3n') {
                throw new Error('only .w3n archive is supported');
            }

            const war3Path = configManager.get('war3Path') as string | undefined;
            if (!war3Path || !(await fs.pathExists(war3Path))) {
                throw new Error('Configure Warcraft III installation path before importing a campaign (needed for _QMCampaign folder).');
            }
            const slug = slugFromW3nBasename(w3nPath);
            const finalOutputDir = path.join(war3Path, '_QMCampaign', slug);

            const { outputDir: out, maps } = await extractCampaignW3nMerged(w3nPath, finalOutputDir, (progress) => {
                event.sender.send('campaign:extract-progress', progress);
            });
            return { success: true, outputDir: out, maps };
        } catch (e: any) {
            console.error('[Campaign] Failed to extract w3n:', e);
            throw e;
        }
    });

    ipcMain.handle('campaign:list-installed', async () => {
        try {
            const war3Path = configManager.get('war3Path') as string | undefined;
            if (!war3Path || !(await fs.pathExists(war3Path))) {
                return { campaigns: [] as Array<{ id: string; path: string; mapCount: number } & InstalledCampaignMetadata> };
            }
            const root = path.join(war3Path, '_QMCampaign');
            if (!(await fs.pathExists(root))) {
                return { campaigns: [] };
            }
            const entries = await fs.readdir(root, { withFileTypes: true });
            const language = configManager.get('language') as string | undefined;
            const campaigns: Array<{ id: string; path: string; mapCount: number } & InstalledCampaignMetadata> = [];
            for (const ent of entries) {
                if (!ent.isDirectory()) continue;
                const campPath = path.join(root, ent.name);
                const w3f = path.join(campPath, 'war3campaign.w3f');
                const merged = path.join(campPath, '_merged');
                if (!(await fs.pathExists(w3f)) || !(await fs.pathExists(merged))) continue;
                const files = await fs.readdir(merged);
                const mapCount = files.filter((f) => /\.w3x$/i.test(f) || /\.w3m$/i.test(f)).length;
                if (mapCount === 0) continue;
                const metadata = await readInstalledCampaignMetadata(campPath, language);
                campaigns.push({ id: ent.name, path: campPath, mapCount, ...metadata });
            }
            campaigns.sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id, undefined, { numeric: true, sensitivity: 'base' }));
            return { campaigns };
        } catch (e) {
            console.error('[Campaign] list-installed failed:', e);
            return { campaigns: [] };
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

            const retailPath = path.join(selectedPath, '_retail_');
            const hasRetailDir = await fs.pathExists(retailPath);

            if (hasRetailDir) {
                configManager.set('war3Path', selectedPath);
                return selectedPath;
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
                configManager.set('war3Path', selectedPath);
                return selectedPath;
            }

            const msg = isMac
                ? '所选目录中未找到 _retail_ 文件夹或 Warcraft III.app'
                : '所选目录中未找到 _retail_ 文件夹或 Warcraft III.exe';
            dialog.showErrorBox('路径无效', `${msg}，请重新选择正确的游戏安装目录。`);
            return null;
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
            // Extraction alone does not prove that the selected archive is a
            // complete package. Do not report success or enable dependent
            // features until all required full-package resources are present.
            const installed = await isFullPackageInstalled(war3Path);
            if (!installed) {
                await removeTerrainSlkIfFullPackageMissing(war3Path);
                return {
                    success: false,
                    error: 'incompletePackage'
                };
            }
            return {
                success: true,
                skipped: false
            };
        } catch (e: any) {
            await removeTerrainSlkIfFullPackageMissing(war3Path).catch(() => undefined);
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
