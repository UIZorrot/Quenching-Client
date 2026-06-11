import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { configManager } from './config-manager';
import { AssetSyncService } from './asset-sync';

export class GameLauncher {

    /**
     * Custom .w3n campaigns keep war3campImported / music / sound next to the archive;
     * Reforged resolves them from _retail_. Mirrors legacy client copy step after per-map merge.
     */
    private static async syncCampaignAssetFoldersToRetail(campaignRoot: string, gamePath: string): Promise<void> {
        const retailPath = path.join(gamePath, '_retail_');
        if (!(await fs.pathExists(retailPath))) {
            console.warn('[GameLauncher] _retail_ not found; skip campaign folder sync');
            return;
        }
        for (const folderName of ['war3campImported', 'music', 'sound'] as const) {
            const src = path.join(campaignRoot, folderName);
            const dest = path.join(retailPath, folderName);
            if (await fs.pathExists(src)) {
                await fs.remove(dest).catch(() => { });
                await fs.copy(src, dest, { overwrite: true });
            }
        }
    }

    /**
     * Launch Warcraft III with arguments
     */
    static async launchGame(executablePath?: string): Promise<boolean> {
        const isMac = process.platform === 'darwin';
        let exePath = executablePath;

        if (!exePath) {
            let gamePath = configManager.get('war3Path');

            if (!gamePath || !fs.existsSync(gamePath)) {
                throw new Error("Warcraft III path is not configured or does not exist.");
            }

            if (isMac) {
                // macOS logic
                const possibleMacExes = [
                    path.join(gamePath, 'Warcraft III.app'),
                    path.join(gamePath, '_retail_', 'Warcraft III.app'),
                ];
                for (const p of possibleMacExes) {
                    if (fs.existsSync(p)) {
                        exePath = p;
                        break;
                    }
                }
            } else {
                // Windows logic
                const possibleWinExes = [
                    path.join(gamePath, '_retail_', 'x86_64', 'Warcraft III.exe'),
                    path.join(gamePath, 'x86_64', 'Warcraft III.exe'),
                    path.join(gamePath, 'Warcraft III Launcher.exe'),
                    path.join(gamePath, 'Warcraft III.exe')
                ];
                for (const p of possibleWinExes) {
                    if (fs.existsSync(p)) {
                        exePath = p;
                        break;
                    }
                }
            }
        }

        if (!exePath || !fs.existsSync(exePath)) {
            if (isMac && gamePath && fs.existsSync(path.join(gamePath, '_retail_'))) {
                const retailApp = path.join(gamePath, '_retail_', 'Warcraft III.app');
                if (fs.existsSync(retailApp)) {
                    exePath = retailApp;
                }
            }
        }

        if (!exePath || !fs.existsSync(exePath)) {
            throw new Error(`Could not find Warcraft III executable at: ${exePath || 'configured path'}`);
        }

        // Determine root game directory for asset sync
        let rootGameDir = path.dirname(exePath);
        if (isMac) {
            // If user selected .app, the root is one level up
            if (exePath.endsWith('.app')) {
                rootGameDir = path.dirname(exePath);
            }
            // If in _retail_, go up
            if (rootGameDir.endsWith('_retail_')) {
                rootGameDir = path.dirname(rootGameDir);
            }
        } else {
            if (rootGameDir.endsWith('x86_64')) rootGameDir = path.dirname(rootGameDir);
            if (rootGameDir.endsWith('_retail_')) rootGameDir = path.dirname(rootGameDir);
        }

        await AssetSyncService.syncAssetsBeforeLaunch(rootGameDir);
        console.log(`Launching game from: ${exePath}`);

        try {
            if (isMac) {
                // Use 'open' on macOS to launch the app bundle
                const child = spawn('open', [exePath, '--args', '-launch', '-uid', 'w3'], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
            } else {
                const child = spawn(exePath, ['-launch', '-uid', 'w3'], {
                    detached: true,
                    cwd: path.dirname(exePath),
                    stdio: 'ignore'
                });
                child.unref();
            }
            return true;
        } catch (e) {
            console.error("Failed to launch game process", e);
            throw e;
        }
    }

    /**
     * Launch Warcraft III with a specific map and difficulty
     */
    static async launchMap(mapPath: string, difficulty: number): Promise<boolean> {
        const isMac = process.platform === 'darwin';
        let gamePath = configManager.get('war3Path');

        if (!gamePath || !fs.existsSync(gamePath)) {
            throw new Error("Warcraft III path is not configured or does not exist.");
        }

        let exePath = '';
        if (isMac) {
            const possibleMacExes = [
                path.join(gamePath, 'Warcraft III.app'),
                path.join(gamePath, '_retail_', 'Warcraft III.app'),
            ];
            for (const p of possibleMacExes) {
                if (fs.existsSync(p)) {
                    exePath = p;
                    break;
                }
            }
        } else {
            const possibleWinExes = [
                path.join(gamePath, '_retail_', 'x86_64', 'Warcraft III.exe'),
                path.join(gamePath, 'x86_64', 'Warcraft III.exe'),
                path.join(gamePath, 'Warcraft III.exe')
            ];
            for (const p of possibleWinExes) {
                if (fs.existsSync(p)) {
                    exePath = p;
                    break;
                }
            }
        }

        if (!exePath || !fs.existsSync(exePath)) {
            throw new Error(`Could not find Warcraft III executable in: ${gamePath}`);
        }

        // Determine root game directory for asset sync
        let rootGameDir = gamePath;

        await AssetSyncService.syncAssetsBeforeLaunch(rootGameDir);
        console.log(`Launching map from: ${exePath} with map: ${mapPath}`);

        const mapDir = path.dirname(mapPath);
        if (path.basename(mapDir) === '_merged') {
            const campaignRoot = path.dirname(mapDir);
            const w3f = path.join(campaignRoot, 'war3campaign.w3f');
            if (await fs.pathExists(w3f)) {
                await GameLauncher.syncCampaignAssetFoldersToRetail(campaignRoot, gamePath);
            }
        }

        try {
            const args = [
                '-launch',
                '-loadfile', mapPath,
                '-mapdiff', difficulty.toString(),
                '-testmapprofile', 'WorldEdit'
            ];

            if (isMac) {
                const child = spawn('open', [exePath, '--args', ...args], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
            } else {
                const child = spawn(exePath, args, {
                    detached: true,
                    cwd: path.dirname(exePath),
                    stdio: 'ignore'
                });
                child.unref();
            }
            return true;
        } catch (e) {
            console.error("Failed to launch game process", e);
            throw e;
        }
    }
}
