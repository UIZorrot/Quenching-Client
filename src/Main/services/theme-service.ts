import { app } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { configManager } from './config-manager';

const BUILTIN_THEME_FILES: Record<string, string> = {
    quenching: 'mainmenu2.mp4',
    warcraft2: 'mainmenu3.mp4',
    city: 'mainmenu4.mp4',
    roc: 'mainmenu1.mp4',
    tft: 'mainmenu0.mp4',
    plaguelands: 'mainmenu5.mp4',
    original: 'mainmenu0.mp4'
};

const GAME_MAIN_MENU_TARGETS = [
    'mainmenu.webm',
    'mainmenu_1.webm',
    'mainmenu_sd.webm',
    'mainmenu_tft.webm',
    'mainmenu_tft_sd.webm'
];

export class ThemeService {
    private async findBuiltinThemeAsset(fileName: string): Promise<string> {
        const appPath = app.getAppPath();
        const appDir = path.dirname(appPath);
        const candidates = [
            path.join(process.cwd(), 'assets', 'quenching', fileName),
            path.join(process.cwd(), 'public', 'assets', 'quenching', fileName),
            path.join(process.cwd(), 'dist', 'renderer', 'assets', 'quenching', fileName),
            path.join(appPath, 'assets', 'quenching', fileName),
            path.join(appPath, 'public', 'assets', 'quenching', fileName),
            path.join(appPath, 'dist', 'renderer', 'assets', 'quenching', fileName),
            path.join(appDir, 'assets', 'quenching', fileName),
            path.join(appDir, 'app.asar.unpacked', 'dist', 'renderer', 'assets', 'quenching', fileName)
        ];

        for (const candidate of candidates) {
            if (await fs.pathExists(candidate)) {
                return candidate;
            }
        }

        return '';
    }

    private async resolveThemeSource(themeId: string): Promise<string> {
        const builtinFile = BUILTIN_THEME_FILES[themeId];
        if (builtinFile) {
            return await this.findBuiltinThemeAsset(builtinFile);
        }

        if (themeId.startsWith('custom-')) {
            const customThemes = configManager.get('customThemes') as any[];
            const theme = customThemes?.find((item: any) => item.id === themeId);
            if (theme?.videoPath && await fs.pathExists(theme.videoPath)) {
                return theme.videoPath;
            }
        }

        return '';
    }

    async applyThemeToGame(themeId: string): Promise<boolean> {
        console.log(`[ThemeService] Applying theme: ${themeId}`);

        const war3Path = configManager.get('war3Path');
        if (!war3Path) {
            console.warn('[ThemeService] Warcraft III path not set, skipping file copy');
            return false;
        }

        const retailPath = path.join(war3Path, '_retail_');
        const gameDataDir = await fs.pathExists(retailPath) ? retailPath : war3Path;
        const webmsDir = path.join(gameDataDir, 'webui', 'Webms');
        const sourceFile = await this.resolveThemeSource(themeId);

        console.log(`[ThemeService] Target directory: ${webmsDir}`);
        console.log(`[ThemeService] Source file: ${sourceFile || '(not found)'}`);

        try {
            await fs.ensureDir(webmsDir);

            if (!sourceFile) {
                for (const target of GAME_MAIN_MENU_TARGETS) {
                    const targetPath = path.join(webmsDir, target);
                    if (await fs.pathExists(targetPath)) {
                        await fs.remove(targetPath);
                    }
                }
                return true;
            }

            for (const target of GAME_MAIN_MENU_TARGETS) {
                const targetPath = path.join(webmsDir, target);
                await fs.copy(sourceFile, targetPath, { overwrite: true });
            }

            return true;
        } catch (error) {
            console.error('[ThemeService] Failed to apply theme to game:', error);
            return false;
        }
    }
}

export const themeService = new ThemeService();
