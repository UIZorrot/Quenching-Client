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
}
