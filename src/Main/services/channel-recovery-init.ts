import { app, dialog } from 'electron';
import { configManager } from './config-manager';
import { assertNoInterruptedLegacyChannelSwitch } from './game-channel-switch';
import { gameChannelFolder } from '../../shared/game-channel';
import { normalizeWar3RootPath } from './war3-path';
import { recoverBranchModToggle } from './branch-mod-toggle';
import { assertNoPendingBranchCopy } from './branch-package-copy';
import { setChannelModEnabled } from './game-channel';
import path from 'path';
import fs from 'fs-extra';

/** Shared startup barrier: old partial moves need inspection, never automatic mutation. */
export const channelRecoveryReady = app.whenReady().then(async () => {
    const gamePath = configManager.get('war3Path');
    if (!gamePath) return;
    try {
        await assertNoInterruptedLegacyChannelSwitch(gamePath);
        const root = normalizeWar3RootPath(gamePath);
        for (const channel of ['retail', 'ptr'] as const) {
            const build = path.join(root, gameChannelFolder(channel));
            if (!(await fs.pathExists(build))) continue;
            await assertNoPendingBranchCopy(build);
            const restoredEnabled = await recoverBranchModToggle(build);
            if (restoredEnabled !== null) setChannelModEnabled(channel, restoredEnabled);
        }
    } catch (error) {
        console.error('[GameChannel] Branch transaction requires manual attention:', error);
        dialog.showErrorBox('魔兽目录需要人工检查',
            '发现未能安全恢复的分支操作记录。为保护你的文件，客户端已停止；请先人工检查，不要继续切换或覆盖目录。');
        app.quit();
        throw error;
    }
});
