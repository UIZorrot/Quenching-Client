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
            const dirsToDelete = ['console', 'feedback', 'framedef'];
            for (const dir of dirsToDelete) {
                const targetDir = path.join(uiPath, dir);
                await fs.remove(targetDir).catch(err => console.warn(`Failed to remove ${targetDir}:`, err));
            }

            // 2. 复制新文件
            // 根据旧代码逻辑：
            // Classic: 只复制 feedback
            // Quenching/Carnival: 复制 feedback, console, framedef
            const copyDir = async (srcSubDir: string, destSubDir: string) => {
                const src = path.join(uiPath, sourceDirName, srcSubDir);
                const dest = path.join(uiPath, destSubDir);
                if (await fs.pathExists(src)) {
                    await fs.copy(src, dest, { overwrite: true });
                } else {
                    console.warn(`Source directory not found: ${src}`);
                }
            };

            if (uiMode === 'classic') {
                await copyDir('feedback', 'feedback');
            } else {
                await copyDir('feedback', 'feedback');
                await copyDir('console', 'console');
                await copyDir('framedef', 'framedef');
            }

            console.log(`[UIService] Successfully updated UI to ${uiMode}`);
            return true;

        } catch (error) {
            console.error('Failed to update UI settings:', error);
            throw error;
        }
    }
}
