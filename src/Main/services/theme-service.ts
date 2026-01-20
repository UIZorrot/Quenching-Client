import { app } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { configManager } from './config-manager';

export class ThemeService {
    /**
     * 应用主题到游戏目录
     * 主要是拷贝对应的视频文件到 webui/webms 目录
     */
    async applyThemeToGame(themeId: string): Promise<boolean> {
        console.log(`[ThemeService] Applying theme: ${themeId}`);
        const war3Path = configManager.get('war3Path');
        if (!war3Path) {
            console.warn('[ThemeService] Warcraft III path not set, skipping file copy');
            return false;
        }

        const webmsDir = path.join(war3Path, 'webui', 'webms');
        console.log(`[ThemeService] Target directory: ${webmsDir}`);

        try {
            // 确保目录存在
            await fs.ensureDir(webmsDir);

            // 定义目标文件
            const targets = ['mainmenu.webm', 'mainmenu_1.webm', 'mainmenu_tft.webm'];

            // 获取源文件路径
            const appPath = app.getAppPath();
            // 更加鲁棒的 assets 目录检测
            let assetsDir = '';

            if (process.env.NODE_ENV === 'development') {
                // 开发环境下，尝试几个可能的路径
                const possiblePaths = [
                    path.join(process.cwd(), 'assets'),
                    path.join(process.cwd(), 'projects', 'QuenChing-Mod-Client', 'assets'),
                    path.join(appPath, 'assets'),
                    path.join(appPath, 'projects', 'QuenChing-Mod-Client', 'assets')
                ];

                for (const p of possiblePaths) {
                    if (await fs.pathExists(p)) {
                        assetsDir = p;
                        break;
                    }
                }
            } else {
                // 打包环境下，通常在 resources 目录
                assetsDir = path.join(path.dirname(appPath), 'assets');
            }

            if (!assetsDir) {
                console.error('[ThemeService] Could not find assets directory');
                return false;
            }

            console.log(`[ThemeService] Found assets directory at: ${assetsDir}`);

            let sourceFile = '';

            switch (themeId) {
                case 'quenching':
                    sourceFile = path.join(assetsDir, 'quenching', 'mainmenu2.mp4');
                    break;
                case 'warcraft2':
                    sourceFile = path.join(assetsDir, 'quenching', 'mainmenu3.mp4');
                    break;
                case 'city':
                    sourceFile = path.join(assetsDir, 'quenching', 'mainmenu4.mp4');
                    break;
                case 'roc':
                    sourceFile = path.join(assetsDir, 'quenching', 'mainmenu1.mp4');
                    break;
                case 'tft':
                    sourceFile = path.join(assetsDir, 'quenching', 'mainmenu0.mp4');
                    break;
                case 'original': // 兼容旧版本 ID
                    sourceFile = path.join(assetsDir, 'quenching', 'mainmenu0.mp4');
                    break;
                default:
                    // 如果是自定义主题，尝试从配置中获取视频路径
                    if (themeId.startsWith('custom-')) {
                        const customThemes = configManager.get('customThemes') as any[];
                        const theme = customThemes?.find((t: any) => t.id === themeId);
                        if (theme && theme.videoPath) {
                            sourceFile = theme.videoPath;
                        }
                    }

                    if (!sourceFile) {
                        // 默认逻辑：删除自定义的 webm 文件，让游戏回退到内置资源
                        for (const target of targets) {
                            const targetPath = path.join(webmsDir, target);
                            if (await fs.pathExists(targetPath)) {
                                await fs.remove(targetPath);
                            }
                        }
                        return true;
                    }
                    break;
            }

            // 执行拷贝
            if (sourceFile && await fs.pathExists(sourceFile)) {
                for (const target of targets) {
                    const targetPath = path.join(webmsDir, target);
                    await fs.copy(sourceFile, targetPath, { overwrite: true });
                }
                return true;
            } else {
                console.warn(`Source theme file not found: ${sourceFile}`);
                return false;
            }
        } catch (error) {
            console.error('Failed to apply theme to game:', error);
            return false;
        }
    }
}

export const themeService = new ThemeService();
