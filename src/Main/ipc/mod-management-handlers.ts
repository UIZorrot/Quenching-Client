import { ipcMain } from 'electron';
import { AssetSyncService } from '../services/asset-sync';
import fs from 'fs-extra';
import path from 'node:path';
import { configManager } from '../services/config-manager';
import { getSelectedGameChannel, getSelectedGameFolder, setChannelModEnabled } from '../services/game-channel';
import { normalizeWar3RootPath } from '../services/war3-path';
import { assertNoPendingBranchCopy } from '../services/branch-package-copy';
import { isBranchModDisabled, recoverBranchModToggle, setBranchModEnabledOnDisk } from '../services/branch-mod-toggle';
import { loadIntegrityManifest, readCurrentModVersion } from '../services/mod-integrity-service';
import { assertWarcraftNotRunning } from '../services/mod-update-service';
import { removeVerifiedModFiles } from '../services/mod-uninstall-service';

export function registerModManagementHandlers() {
    ipcMain.handle('mod:delete', async (_event, war3Path: string) => {
        await assertWarcraftNotRunning();
        const root = normalizeWar3RootPath(war3Path);
        const buildDir = path.join(root, getSelectedGameFolder());
        if (!(await fs.pathExists(buildDir))) throw new Error('当前游戏分支不存在');
        await assertNoPendingBranchCopy(buildDir);
        await recoverBranchModToggle(buildDir);
        if (await isBranchModDisabled(buildDir)) await setBranchModEnabledOnDisk(buildDir, true);
        const version = await readCurrentModVersion(root);
        if (!version) throw new Error('未找到可验证的 MOD 文件清单，无法安全删除');
        const loaded = await loadIntegrityManifest(root, version);
        if (!loaded) throw new Error('MOD 文件清单不可用，未删除任何文件');
        const result = await removeVerifiedModFiles(buildDir, loaded.manifest);
        const keep = path.join(buildDir, '_patch', 'keep.que');
        const keepStat = await fs.lstat(keep).catch(() => null);
        if (keepStat?.isFile() && !keepStat.isSymbolicLink()) {
            const text = await fs.readFile(keep, 'utf8');
            if ([...text.matchAll(/^-v(\d+(?:\.\d+){1,2})-\s*$/gim)].at(-1)?.[1] === version) await fs.unlink(keep);
        }
        const installed = path.join(buildDir, '.quenching', 'installed-mod.json');
        const installedStat = await fs.lstat(installed).catch(() => null);
        if (installedStat?.isFile() && !installedStat.isSymbolicLink()) {
            const state = await fs.readJson(installed).catch(() => null);
            if (state?.product === 'quenching-mod' && state.version === version) await fs.unlink(installed);
        }
        setChannelModEnabled(getSelectedGameChannel(), false);
        configManager.set('modSettings', { modEnabled: false });
        return { success: true, ...result };
    });

    // 重置渲染组件
    ipcMain.handle('mod:reset-rendering', async (event, war3Path: string) => {
        console.log('[ModManagement] Resetting rendering components...');
        // Re-apply client resource paths and replace any unexpected same-name files.
        await AssetSyncService.syncConfiguredAssets(war3Path);
        console.log('[ModManagement] Rendering components reset complete');

        return { success: true };
    });

    // No renderer calls this legacy IPC. Keeping it active would move player
    // folders without a persistent crash journal. Home profile controls replace it.
    ipcMain.handle('mod:toggle-classic-mode', async () => {
        throw new Error('旧版经典模式整目录切换已停用；请使用主页画质模式。');
    });
}
