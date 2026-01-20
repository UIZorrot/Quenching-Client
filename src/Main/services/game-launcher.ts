import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { configManager } from './config-manager';
import { AssetSyncService } from './asset-sync';

export class GameLauncher {

    /**
     * Launch Warcraft III with arguments
     */
    static async launchGame(executablePath?: string): Promise<boolean> {
        let exePath = executablePath;

        if (!exePath) {
            let gamePath = configManager.get('war3Path');

            if (!gamePath || !fs.existsSync(gamePath)) {
                throw new Error("Warcraft III path is not configured or does not exist.");
            }

            // Logic from C# MainWindow.xaml.cs (Line 2811)
            // Check for _retail_ or x86_64 or Launcher
            // We assume gamePath points to the root folder of WC3

            exePath = path.join(gamePath, '_retail_', 'x86_64', 'Warcraft III.exe');
            if (!fs.existsSync(exePath)) {
                exePath = path.join(gamePath, 'x86_64', 'Warcraft III.exe');
            }
            if (!fs.existsSync(exePath)) {
                exePath = path.join(gamePath, 'Warcraft III Launcher.exe');
            }

            // Final fallback to just "Warcraft III.exe" in root
            if (!fs.existsSync(exePath)) {
                exePath = path.join(gamePath, 'Warcraft III.exe');
            }
        }

        if (!exePath || !fs.existsSync(exePath)) {
            throw new Error(`Could not find Warcraft III executable in ${exePath || 'configured path'}`);
        }

        // Ensure we have a valid game path for asset sync
        const gameDir = path.dirname(exePath);
        // Try to find root game dir by going up from x86_64 or _retail_
        // This is a simple heuristic; might need refinement
        let rootGameDir = gameDir;
        if (gameDir.endsWith('x86_64')) rootGameDir = path.dirname(gameDir);
        if (rootGameDir.endsWith('_retail_')) rootGameDir = path.dirname(rootGameDir);

        await AssetSyncService.syncAssetsBeforeLaunch(rootGameDir);
        console.log(`Launching game from: ${exePath}`);

        try {
            const child = spawn(exePath, ['-launch', '-uid', 'w3'], {
                detached: true,
                cwd: path.dirname(exePath),
                stdio: 'ignore'
            });
            child.unref();
            return true;
        } catch (e) {
            console.error("Failed to launch game process", e);
            throw e;
        }
    }
}
