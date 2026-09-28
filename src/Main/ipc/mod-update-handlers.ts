import { ipcMain } from 'electron';
import { applyModUpdate, getInstalledModState, getModUpdateStatus } from '../services/mod-update-service';
import { verifyModIntegrity } from '../services/mod-integrity-service';
import { getChannelModEnabled, getSelectedGameChannel, getSelectedGameDir } from '../services/game-channel';
import { isBranchModDisabled } from '../services/branch-mod-toggle';
import { syncBlightOnStartup } from '../services/blight-service';
import { configManager } from '../services/config-manager';

function assertWar3Path(war3Path: unknown): asserts war3Path is string {
  if (typeof war3Path !== 'string' || !war3Path.trim()) throw new Error('未提供魔兽路径');
}

export function registerModUpdateHandlers() {
  ipcMain.handle('mod-update:get-status', async (_event, war3Path: string) => {
    assertWar3Path(war3Path);
    return getModUpdateStatus(war3Path);
  });

  ipcMain.handle('mod-update:apply', async (_event, war3Path: string) => {
    assertWar3Path(war3Path);
    if (!getChannelModEnabled(getSelectedGameChannel()) || await isBranchModDisabled(getSelectedGameDir(war3Path))) {
      throw new Error('Enable the selected branch MOD before applying an update');
    }
    const result = await applyModUpdate(war3Path);
    // The patch is already committed at this point. A visual-profile problem
    // must not turn a successful MOD update into an apparent rollback.
    try {
      await syncBlightOnStartup(war3Path, configManager.get('modSettings') || {});
    } catch (error) {
      console.warn('[ModUpdate] Could not apply the independent Blight preference after upgrade:', error);
    }
    return result;
  });

  ipcMain.handle('mod-update:get-installed-state', async (_event, war3Path: string) => {
    assertWar3Path(war3Path);
    return getInstalledModState(war3Path);
  });

  ipcMain.handle('mod-update:verify-integrity', async (_event, war3Path: string, fullHash = false) => {
    assertWar3Path(war3Path);
    if (typeof fullHash !== 'boolean') throw new Error('完整性校验参数无效');
    return verifyModIntegrity(war3Path, fullHash ? 'full' : 'presence');
  });
}
