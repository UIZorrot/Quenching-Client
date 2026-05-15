import path from 'path';
import fs from 'fs-extra';

export class UIService {
    /**
     * Update UI style settings.
     * @param war3Path Warcraft III install path
     * @param uiMode 'classic' | 'quenching' | 'carnival'
     */
    static async applyUISettings(war3Path: string, uiMode: string): Promise<boolean> {
        let stagingPath = '';

        try {
            console.log(`[UIService] Updating UI to mode: ${uiMode}`);
            if (!war3Path) {
                throw new Error('Warcraft III path is required');
            }

            const normalizedPath = path.normalize(war3Path);
            const retailPath = path.join(normalizedPath, '_retail_');
            const baseDir = await fs.pathExists(retailPath) ? retailPath : normalizedPath;
            const uiPath = path.join(baseDir, 'ui');

            const sourceMap: Record<string, string> = {
                classic: 'ui-org',
                quenching: 'ui-que',
                carnival: 'ui-blz'
            };

            const sourceDirName = sourceMap[uiMode];
            if (!sourceDirName) {
                throw new Error(`Unknown UI mode: ${uiMode}`);
            }

            const { AssetSyncService } = require('./asset-sync');
            const assetsDir = await AssetSyncService.getAssetsDir();
            const zipPath = path.join(assetsDir, 'quenching', 'zip-ui.zip');

            if (!(await fs.pathExists(zipPath))) {
                throw new Error(`zip-ui.zip not found at ${zipPath}`);
            }

            await fs.ensureDir(baseDir);
            stagingPath = await fs.mkdtemp(path.join(baseDir, '.ui-staging-'));

            console.log(`[UIService] Extracting clean zip-ui.zip from ${zipPath} to staging...`);
            await AssetSyncService.extractZip(zipPath, stagingPath);

            const sourceRoot = path.join(stagingPath, sourceDirName);
            if (!(await fs.pathExists(sourceRoot))) {
                throw new Error(`UI source folder ${sourceDirName} not found in zip-ui.zip`);
            }

            const subFolders = ['feedback', 'console', 'framedef', 'webui'];
            for (const folder of subFolders) {
                const src = path.join(sourceRoot, folder);
                const dest = path.join(stagingPath, folder);

                await fs.remove(dest).catch(err => console.warn(`Failed to reset staging ${dest}:`, err));

                if (await fs.pathExists(src)) {
                    console.log(`[UIService] Preparing ${folder} from ${sourceDirName}...`);
                    await fs.copy(src, dest, { overwrite: true });
                } else {
                    console.log(`[UIService] Component ${folder} not in ${sourceDirName}; removing root component.`);
                }
            }

            const dirsToReplace = ['console', 'feedback', 'framedef', 'webui', 'ui-org', 'ui-que', 'ui-blz'];
            await fs.ensureDir(uiPath);
            for (const dir of dirsToReplace) {
                const targetDir = path.join(uiPath, dir);
                await fs.remove(targetDir).catch(err => console.warn(`Failed to remove ${targetDir}:`, err));
            }

            await fs.copy(stagingPath, uiPath, { overwrite: true });

            console.log(`[UIService] Successfully updated UI to ${uiMode}`);
            return true;
        } catch (error) {
            console.error('Failed to update UI settings:', error);
            throw error;
        } finally {
            if (stagingPath) {
                await fs.remove(stagingPath).catch(err => console.warn(`Failed to remove UI staging path ${stagingPath}:`, err));
            }
        }
    }
}
