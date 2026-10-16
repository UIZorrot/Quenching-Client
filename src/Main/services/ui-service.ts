import { getChannelModEnabled, getSelectedGameChannel, getSelectedGameFolder } from './game-channel';
import path from 'path';
import fs from 'fs-extra';
import { configManager } from './config-manager';
import { resolveUiZipName } from './war3-version';
import { syncBundledResourceFiles } from './managed-resource-files';
import { isFullPackageInstalled } from './full-package-service';
import { isThirdPartyQuenchingPaused } from './third-party-resources';

const UI_MARKER = '.quenching-managed-ui.json';
const UI_STYLE_MARKER = '.quenching-ui-style';

function knownUiRoots(stagingPath: string) {
    return [
        { source: stagingPath },
        ...['ui-org', 'ui-que', 'ui-blz'].map(name => ({ source: path.join(stagingPath, name) })),
    ];
}

export class UIService {
    static async syncConfiguredUI(war3Path: string, force = false): Promise<boolean> {
        const settings = configManager.get('modSettings') || {};
        if (!getChannelModEnabled(getSelectedGameChannel()) || settings.graphicsSelection === 'sd' || settings.classicMode === true) return false;
        if (await isThirdPartyQuenchingPaused(war3Path) || !(await isFullPackageInstalled(war3Path))) return false;
        return this.applyUISettings(war3Path, settings.ui || 'classic', force);
    }

    /**
     * 经典模式下替换 feedback：移除 que/blz 中无法在经典版加载的 MDX，改用 ui-org 贴图。
     */
    static async applyClassicFeedbackCompat(stagingPath: string): Promise<void> {
        const orgFeedback = path.join(stagingPath, 'ui-org', 'feedback');
        const targetFeedback = path.join(stagingPath, 'feedback');

        if (!(await fs.pathExists(orgFeedback))) {
            console.warn('[UIService] ui-org/feedback not found in staging, skipping classic feedback patch');
            return;
        }

        await fs.remove(targetFeedback).catch(() => { });
        await fs.copy(orgFeedback, targetFeedback, { overwrite: true });
        console.log('[UIService] Applied classic-compatible feedback from ui-org');
    }

    /**
     * 对已安装 UI 打经典版 feedback 补丁（锁定经典版 + 淬火/嘉年华 UI 时使用）
     */
    static async patchInstalledUiFeedbackForClassicMode(war3Path: string): Promise<void> {
        const normalizedPath = path.normalize(war3Path);
        const retailPath = path.join(normalizedPath, getSelectedGameFolder());
        const baseDir = (await fs.pathExists(retailPath)) ? retailPath : normalizedPath;
        const uiFeedback = path.join(baseDir, 'ui', 'feedback');

        if (!(await fs.pathExists(uiFeedback))) {
            console.log('[UIService] No installed ui/feedback to patch for classic mode');
            return;
        }

        const { AssetSyncService } = require('./asset-sync');
        const assetsDir = await AssetSyncService.getAssetsDir();
        const zipName = await resolveUiZipName(war3Path);
        const zipPath = path.join(assetsDir, 'quenching', zipName);

        if (!(await fs.pathExists(zipPath))) {
            console.warn(`[UIService] ${zipName} not found at ${zipPath}, skip classic feedback patch`);
            return;
        }

        let stagingPath = '';
        try {
            stagingPath = await fs.mkdtemp(path.join(baseDir, '.ui-classic-feedback-'));
            await AssetSyncService.extractZip(zipPath, stagingPath);
            await this.applyClassicFeedbackCompat(stagingPath);

            const patchedFeedback = path.join(stagingPath, 'feedback');
            if (await fs.pathExists(patchedFeedback)) {
                await syncBundledResourceFiles(
                    path.join(baseDir, 'ui'),
                    [{ source: patchedFeedback, targetPrefix: 'feedback' }],
                    knownUiRoots(stagingPath), UI_MARKER,
                    { removeAbsent: false },
                );
                console.log('[UIService] Patched installed ui/feedback for classic mode');
            }
        } finally {
            if (stagingPath) {
                await fs.remove(stagingPath).catch(() => { });
            }
        }
    }

    /**
     * Update UI style settings.
     * @param war3Path Warcraft III install path
     * @param uiMode 'classic' | 'quenching' | 'carnival'
     */
    static async applyUISettings(war3Path: string, uiMode = 'classic', force = true): Promise<boolean> {
        if (!getChannelModEnabled(getSelectedGameChannel())) return false;
        let stagingPath = '';

        try {
            if (!war3Path) {
                throw new Error('Warcraft III path is required');
            }

            const normalizedPath = path.normalize(war3Path);
            const retailPath = path.join(normalizedPath, getSelectedGameFolder());
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
            const zipName = await resolveUiZipName(war3Path);
            const zipPath = path.join(assetsDir, 'quenching', zipName);
            const styleMarker = path.join(uiPath, UI_STYLE_MARKER);
            const style = `${zipName}:${uiMode}`;
            if (!force && await fs.pathExists(styleMarker) && (await fs.readFile(styleMarker, 'utf8')).trim() === style) return true;
            console.log(`[UIService] Updating UI to mode: ${uiMode}`);

            if (!(await fs.pathExists(zipPath))) {
                throw new Error(`${zipName} not found at ${zipPath}`);
            }

            await fs.ensureDir(baseDir);
            stagingPath = await fs.mkdtemp(path.join(baseDir, '.ui-staging-'));

            console.log(`[UIService] Extracting clean ${zipName} from ${zipPath} to staging...`);
            await AssetSyncService.extractZip(zipPath, stagingPath);

            const sourceRoot = path.join(stagingPath, sourceDirName);
            if (!(await fs.pathExists(sourceRoot))) {
                throw new Error(`UI source folder ${sourceDirName} not found in ${zipName}`);
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

            const modSettings = configManager.get('modSettings') || {};
            if (modSettings.classicMode === true && uiMode !== 'classic') {
                await this.applyClassicFeedbackCompat(stagingPath);
            }

            // This branch's UI is fully client-managed. Prepare the selected style
            // first, then replace the complete UI rather than merging stale files.
            await fs.remove(uiPath);
            await fs.copy(stagingPath, uiPath);
            await fs.writeFile(styleMarker, `${style}\n`, 'utf8');

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
