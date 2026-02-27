import { ipcMain } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { configManager } from '../services/config-manager';
import { AssetSyncService } from '../services/asset-sync';

export function registerModManagementHandlers() {
    // 删除MOD
    ipcMain.handle('mod:delete', async (event, war3Path: string) => {
        console.log('[ModManagement] Deleting all MOD files...');
        const errors: string[] = [];

        // 删除目录
        const dirsToDelete = [
            '_retail_/environment',
            '_retail_/scripts',
            '_retail_/shaders',
            '_retail_/ui',
            '_retail_/webui',
            '_retail_/units',
            '_retail_/textures',
            '_retail_/cos',
            '_retail_/buildings',
            '_retail_/doodads',
            '_retail_/campaign',
            '_retail_/replaceabletextures',
            '_retail_/terrainart',
            '_retail_/splats',
            '_retail_/patch',
            '_retail_/QMoff'
        ];

        for (const dir of dirsToDelete) {
            const fullPath = path.join(war3Path, dir);
            try {
                if (await fs.pathExists(fullPath)) {
                    await fs.remove(fullPath);
                    console.log(`[ModManagement] Deleted: ${dir}`);
                }
            } catch (err) {
                console.error(`[ModManagement] Failed to delete ${dir}:`, err);
                errors.push(`${dir}: ${err.message}`);
            }
        }

        if (errors.length > 0) {
            throw new Error(`删除失败 (可能文件被占用): ${errors.join(', ')}`);
        }

        // 重置设置为默认值
        const defaultSettings = {
            modEnabled: false,
            objectShader: true,
            postProcessing: true,
            volumetricFog: true,
            water: 'transparent',
            foliage: true,
            lighting: 'standard',
            half: false,
            ui: 'quenching',
            cam: false,
            glow: true,
            terrain: 'latest',
            tree: 'tall',
            envRender: true,
            modelEnhance: false,
            visionModPath: ''
        };

        configManager.set('modSettings', defaultSettings);
        console.log('[ModManagement] MOD settings reset to defaults');

        return { success: true };
    });

    // 重置渲染组件
    ipcMain.handle('mod:reset-rendering', async (event, war3Path: string) => {
        console.log('[ModManagement] Resetting rendering components...');
        const errors: string[] = [];

        // 删除4个核心目录
        const coreDirs = ['environment', 'scripts', 'shaders', 'ui'];
        for (const dir of coreDirs) {
            const fullPath = path.join(war3Path, '_retail_', dir);
            try {
                if (await fs.pathExists(fullPath)) {
                    await fs.remove(fullPath);
                    console.log(`[ModManagement] Deleted: ${dir}`);
                }
            } catch (err) {
                console.error(`[ModManagement] Failed to delete ${dir}:`, err);
                errors.push(`${dir}: ${err.message}`);
            }
        }

        if (errors.length > 0) {
            throw new Error(`重置失败 (可能文件被占用): ${errors.join(', ')}`);
        }

        // 重新解压
        console.log('[ModManagement] Re-extracting core assets...');
        await AssetSyncService.syncAssetsBeforeLaunch(war3Path);
        console.log('[ModManagement] Rendering components reset complete');

        return { success: true };
    });

    // 切换经典模式
    ipcMain.handle('mod:toggle-classic-mode', async (event, war3Path: string, enable: boolean) => {
        console.log(`[ModManagement] Toggling classic mode: ${enable ? 'ON' : 'OFF'}`);
        const errors: string[] = [];

        const baseDir = path.join(war3Path, '_retail_');
        const qmoffDir = path.join(baseDir, 'QMoff');

        // 需要移动的文件夹（除了 ui, scripts, webui, cos）
        // cos 文件夹保留，因为它包含自定义皮肤模型
        const foldersToMove = [
            'environment',
            'buildings',
            'campaign',
            'doodads',
            'fonts',
            'patch',
            'replaceabletextures',
            'shaders',
            'splats',
            'terrainart',
            'textures',
            'units'
        ];

        try {
            if (enable) {
                // 开启经典模式：移动文件夹到 QMoff
                console.log('[ClassicMode] Moving folders to QMoff...');

                // 确保 QMoff 目录存在
                await fs.ensureDir(qmoffDir);

                // 移动文件夹
                for (const folder of foldersToMove) {
                    const source = path.join(baseDir, folder);
                    const target = path.join(qmoffDir, folder);

                    try {
                        if (await fs.pathExists(source)) {
                            // 如果目标已存在，先删除
                            if (await fs.pathExists(target)) {
                                await fs.remove(target);
                            }
                            await fs.move(source, target);
                            console.log(`[ClassicMode] Moved ${folder} to QMoff`);
                        }
                    } catch (err) {
                        console.error(`[ClassicMode] Failed to move ${folder}:`, err);
                        errors.push(`${folder}: ${err.message}`);
                    }
                }

                // 更新配置
                const currentSettings = configManager.get('modSettings') || {};
                configManager.set('modSettings', {
                    ...currentSettings,
                    classicMode: true
                });

            } else {
                // 关闭经典模式：还原文件夹
                console.log('[ClassicMode] Restoring folders from QMoff...');

                // 从 QMoff 还原文件夹
                for (const folder of foldersToMove) {
                    const source = path.join(qmoffDir, folder);
                    const target = path.join(baseDir, folder);

                    try {
                        if (await fs.pathExists(source)) {
                            // 如果目标已存在，先删除
                            if (await fs.pathExists(target)) {
                                await fs.remove(target);
                            }
                            await fs.move(source, target);
                            console.log(`[ClassicMode] Restored ${folder} from QMoff`);
                        }
                    } catch (err) {
                        console.error(`[ClassicMode] Failed to restore ${folder}:`, err);
                        errors.push(`${folder}: ${err.message}`);
                    }
                }

                // 更新配置
                const currentSettings = configManager.get('modSettings') || {};
                configManager.set('modSettings', {
                    ...currentSettings,
                    classicMode: false
                });
            }

            if (errors.length > 0) {
                throw new Error(`经典模式切换部分失败: ${errors.join(', ')}`);
            }

            console.log(`[ClassicMode] Classic mode ${enable ? 'enabled' : 'disabled'} successfully`);
            return { success: true, classicMode: enable };

        } catch (error) {
            console.error('[ClassicMode] Failed to toggle classic mode:', error);
            throw error;
        }
    });
}
