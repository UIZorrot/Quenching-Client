import path from 'path';
import fs from 'fs-extra';

export class UIService {
    /**
     * 更新 UI 风格设置
     * @param war3Path 魔兽争霸III 安装路径
     * @param uiMode 'classic' | 'quenching' | 'carnival'
     */
    static async applyUISettings(war3Path: string, uiMode: string): Promise<boolean> {
        try {
            console.log(`[UIService] Updating UI to mode: ${uiMode}`);
            if (!war3Path) {
                throw new Error('未提供魔兽争霸III路径');
            }

            // 标准化路径分隔符
            const normalizedPath = path.normalize(war3Path);

            // 检查 _retail_ 目录 (Reforged 结构)
            const retailPath = path.join(normalizedPath, '_retail_');
            let baseDir = normalizedPath;
            if (await fs.pathExists(retailPath)) {
                baseDir = retailPath;
            }

            const uiPath = path.join(baseDir, 'ui');

            // 映射 UI 模式到对应的资源目录名
            const sourceMap: Record<string, string> = {
                'classic': 'ui-org',
                'quenching': 'ui-que',
                'carnival': 'ui-blz'
            };

            const sourceDirName = sourceMap[uiMode];
            if (!sourceDirName) {
                throw new Error(`未知的 UI 模式: ${uiMode}`);
            }

            // 1. 清理目标目录 (删除旧的 UI 组件)
            // 对应: DelectDir(dir_root + "ui/console"); etc.
            const dirsToDelete = ['console', 'feedback', 'framedef', 'ui-org', 'ui-que', 'ui-blz'];
            for (const dir of dirsToDelete) {
                const targetDir = path.join(uiPath, dir);
                await fs.remove(targetDir).catch(err => console.warn(`Failed to remove ${targetDir}:`, err));
            }

            // [NEW] 1.5 解压纯净的 zip-ui.zip 到 _retail_/ui
            const { AssetSyncService } = require('./asset-sync');
            const assetsDir = await AssetSyncService.getAssetsDir();
            const zipPath = path.join(assetsDir, 'quenching', 'zip-ui.zip');
            if (await fs.pathExists(zipPath)) {
                console.log('[UIService] Extracting clean zip-ui.zip...');
                await AssetSyncService.extractZip(zipPath, uiPath);
                console.log('[UIService] zip-ui.zip extracted.');
            } else {
                console.warn(`[UIService] zip-ui.zip not found at ${zipPath}`);
            }

            // 2. 复制新文件 (从子目录如 ui-que/ 覆盖到 ui/ 根部)
            const subFolders = ['feedback', 'console', 'framedef', 'webui'];
            for (const folder of subFolders) {
                const src = path.join(uiPath, sourceDirName, folder);
                const dest = path.join(uiPath, folder);

                if (await fs.pathExists(src)) {
                    console.log(`[UIService] Copying ${folder} from ${sourceDirName} to root...`);
                    await fs.copy(src, dest, { overwrite: true });
                } else {
                    // 如果源文件夹里没有这个组件 (通常是 Classic 模式下没有 console/framedef)，
                    // 我们要确保删除顶层对应目录，防止 zip 根目录中自带的 Quenching 文件残留。
                    if (await fs.pathExists(dest)) {
                        console.log(`[UIService] Component ${folder} not in ${sourceDirName}, removing from root to restore original.`);
                        await fs.remove(dest).catch(() => { });
                    }
                }
            }

            console.log(`[UIService] Successfully updated UI to ${uiMode}`);
            return true;

        } catch (error) {
            console.error('Failed to update UI settings:', error);
            throw error;
        }
    }
}
