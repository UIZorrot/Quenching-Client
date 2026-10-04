import { getSelectedGameChannel, getSelectedGameFolder, hasGameChannelDirectory } from './game-channel';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { configManager } from './config-manager';
import { AssetSyncService } from './asset-sync';
import { syncBundledResourceFiles } from './managed-resource-files';
import { app } from 'electron';
import { launchViaBattleNet, resolveBattleNetExe } from './battle-net-launcher';
import { writeMapName } from './map-name';

async function assertSelectedGameBuild(gamePath: string): Promise<void> {
    if (!(await hasGameChannelDirectory(gamePath, getSelectedGameChannel()))) {
        throw new Error(`${getSelectedGameFolder()} is not installed in the selected Warcraft III folder`);
    }
}

export class GameLauncher {

    /**
     * Custom .w3n campaigns keep war3campImported / music / sound next to the archive;
     * Reforged resolves them from _retail_. Mirrors legacy client copy step after per-map merge.
     */
    private static async syncCampaignAssetFoldersToRetail(campaignRoot: string, gamePath: string): Promise<void> {
        const retailPath = path.join(gamePath, getSelectedGameFolder());
        if (!(await fs.pathExists(retailPath))) {
            console.warn('[GameLauncher] _retail_ not found; skip campaign folder sync');
            return;
        }
        for (const folderName of ['war3campImported', 'music', 'sound'] as const) {
            const src = path.join(campaignRoot, folderName);
            const dest = path.join(retailPath, folderName);
            if (await fs.pathExists(src)) {
                await syncBundledResourceFiles(dest, [{ source: src }], [{ source: src }], '.quenching-campaign-files');
            }
        }
    }

    /**
     * Launch Warcraft III with arguments
     */
    static async launchGame(executablePath?: string): Promise<boolean> {
        const isMac = process.platform === 'darwin';
        let exePath = executablePath;
        const gamePath = configManager.get('war3Path');

        if (!gamePath || !fs.existsSync(gamePath)) {
            throw new Error("Warcraft III path is not configured or does not exist.");
        }
        await assertSelectedGameBuild(gamePath);

        if (!exePath && getSelectedGameChannel() === 'retail' && await launchViaBattleNet(gamePath)) {
            return true;
        }

        if (!exePath) {
            if (isMac) {
                // macOS logic
                const possibleMacExes = [
                    path.join(gamePath, getSelectedGameFolder(), 'Warcraft III.app'),
                    ...(getSelectedGameChannel() === 'retail' ? [path.join(gamePath, 'Warcraft III.app')] : []),
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
                    path.join(gamePath, getSelectedGameFolder(), 'x86_64', 'Warcraft III.exe'),
                    ...(getSelectedGameChannel() === 'retail' ? [
                        path.join(gamePath, 'x86_64', 'Warcraft III.exe'),
                        path.join(gamePath, 'Warcraft III Launcher.exe'),
                        path.join(gamePath, 'Warcraft III.exe'),
                    ] : []),
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
            if (isMac && gamePath && fs.existsSync(path.join(gamePath, getSelectedGameFolder()))) {
                const retailApp = path.join(gamePath, getSelectedGameFolder(), 'Warcraft III.app');
                if (fs.existsSync(retailApp)) {
                    exePath = retailApp;
                }
            }
        }

        if (!exePath || !fs.existsSync(exePath)) {
            throw new Error(`Could not find Warcraft III executable at: ${exePath || 'configured path'}`);
        }


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
        await assertSelectedGameBuild(gamePath);

        let exePath = '';
        if (isMac) {
            const possibleMacExes = [
                path.join(gamePath, getSelectedGameFolder(), 'Warcraft III.app'),
                ...(getSelectedGameChannel() === 'retail' ? [path.join(gamePath, 'Warcraft III.app')] : []),
            ];
            for (const p of possibleMacExes) {
                if (fs.existsSync(p)) {
                    exePath = p;
                    break;
                }
            }
        } else {
            const possibleWinExes = [
                path.join(gamePath, getSelectedGameFolder(), 'x86_64', 'Warcraft III.exe'),
                ...(getSelectedGameChannel() === 'retail' ? [
                    path.join(gamePath, 'x86_64', 'Warcraft III.exe'),
                    path.join(gamePath, 'Warcraft III.exe'),
                ] : []),
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

    /** 'battlenet' when the unlock map is started by the player from Custom Game, 'direct' for `-loadfile`. */
    static async getCampaignUnlockMode(): Promise<'battlenet' | 'direct'> {
        const gamePath = configManager.get('war3Path');
        if (!gamePath || getSelectedGameChannel() !== 'retail') return 'direct';
        return (await resolveBattleNetExe(gamePath)) ? 'battlenet' : 'direct';
    }

    /**
     * Unlock official campaign progress by launching the built-in cfix.w3x map
     * (same flow as the legacy client: mapdiff 1 + WorldEdit profile + fixedseed).
     */
    static async unlockCampaign(mapName?: string): Promise<boolean> {
        const isMac = process.platform === 'darwin';
        const gamePath = configManager.get('war3Path');

        if (!gamePath || !fs.existsSync(gamePath)) {
            throw new Error("Warcraft III path is not configured or does not exist.");
        }
        await assertSelectedGameBuild(gamePath);

        let exePath = '';
        if (isMac) {
            const possibleMacExes = [
                path.join(gamePath, getSelectedGameFolder(), 'Warcraft III.app'),
                ...(getSelectedGameChannel() === 'retail' ? [path.join(gamePath, 'Warcraft III.app')] : []),
            ];
            for (const p of possibleMacExes) {
                if (fs.existsSync(p)) {
                    exePath = p;
                    break;
                }
            }
        } else {
            const possibleWinExes = [
                path.join(gamePath, getSelectedGameFolder(), 'x86_64', 'Warcraft III.exe'),
                ...(getSelectedGameChannel() === 'retail' ? [
                    path.join(gamePath, 'x86_64', 'Warcraft III.exe'),
                    path.join(gamePath, 'Warcraft III.exe'),
                ] : []),
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


        const assetsDir = await AssetSyncService.getAssetsDir();
        const sourceMap = path.join(assetsDir, 'quenching', 'camp', 'cfix.w3x');
        if (!(await fs.pathExists(sourceMap))) {
            throw new Error(`Campaign unlock map not found: ${sourceMap}`);
        }

        // `-loadfile` cannot go through Battle.net, and a direct start loses the map behind the in-game login.
        // Put the map in the user maps folder instead; the player starts it from Custom Game.
        const battleNetExe = getSelectedGameChannel() === 'retail' ? await resolveBattleNetExe(gamePath) : null;
        if (battleNetExe) {
            const userMap = path.join(app.getPath('documents'), 'Warcraft III', 'Maps', 'Quenching', 'cfix.w3x');
            await fs.copy(sourceMap, userMap, { overwrite: true });
            if (mapName) await writeMapName(userMap, mapName);
            console.log(`Campaign unlock map copied to ${userMap}; launching via Battle.net`);
            return launchViaBattleNet(gamePath);
        }

        const exeDir = path.dirname(exePath);
        const targetMap = path.join(exeDir, 'cfix.w3x');
        await fs.copy(sourceMap, targetMap, { overwrite: true });

        console.log(`Launching campaign unlock map from: ${exePath} -> ${targetMap}`);

        const loadFile = isMac ? targetMap : './cfix.w3x';
        const args = [
            '-launch',
            '-loadfile', loadFile,
            '-mapdiff', '1',
            '-testmapprofile', 'WorldEdit',
            '-fixedseed', '1'
        ];

        try {
            if (isMac) {
                const child = spawn('open', [exePath, '--args', ...args], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
            } else {
                const child = spawn(exePath, args, {
                    detached: true,
                    cwd: exeDir,
                    stdio: 'ignore'
                });
                child.unref();
            }
            return true;
        } catch (e) {
            console.error("Failed to launch campaign unlock map", e);
            throw e;
        }
    }
}
