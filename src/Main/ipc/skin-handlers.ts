import { ipcMain } from 'electron';
import { skinService, SkinChange } from '../services/skin-service';
import { retroSkinService } from '../services/retro-skin-service';
import { versionSkinService } from '../services/version-skin-service';
import { SkinArtSet, VersionSkinChoice } from '../../shared/skin-versions';
import { canUseRetroSkin, resolveModProfile } from '../services/mod-profile';
import { configManager } from '../services/config-manager';

export function registerSkinHandlers() {
  ipcMain.handle('skin:version-panel', (_event, artSet: SkinArtSet) => versionSkinService.panel(artSet));
  ipcMain.handle('skin:version-apply', (_event, artSet: SkinArtSet, choices: VersionSkinChoice[]) => versionSkinService.apply(artSet, choices));
  ipcMain.handle('skin:apply', async (event, unitId: string, changes: SkinChange[]) => {
    try {
      return await skinService.applySkin(unitId, changes);
    } catch (error) {
      console.error('Failed to apply skin:', error);
      throw error;
    }
  });

  ipcMain.handle('skin:apply-batch', async (event, batchChanges: { unitId: string; changes: SkinChange[] }[]) => {
    try {
      return await skinService.applyBatchSkin(batchChanges);
    } catch (error) {
      console.error('Failed to apply batch skin:', error);
      throw error;
    }
  });

  ipcMain.handle('skin:disable', async () => {
    try {
      return await skinService.disableSkins();
    } catch (error) {
      console.error('Failed to disable skins:', error);
      throw error;
    }
  });

  ipcMain.handle('skin:enable', async () => {
    try {
      await skinService.enableSkins();
      return true;
    } catch (error) {
      console.error('Failed to enable skins:', error);
      throw error;
    }
  });

  ipcMain.handle('skin:is-enabled', async () => {
    try {
      return await skinService.isSkinEnabled();
    } catch (error) {
      console.error('Failed to check skin status:', error);
      throw error;
    }
  });

  ipcMain.handle('retro-skin:get-status', async () => {
    try {
      return await retroSkinService.getStatus();
    } catch (error) {
      console.error('Failed to get retro skin status:', error);
      throw error;
    }
  });

  ipcMain.handle(
    'retro-skin:apply',
    async (_event, options: { unitsEnabled?: boolean; buildingsEnabled?: boolean }) => {
      try {
        const war3Path = configManager.get('war3Path');
        const settings = configManager.get('modSettings') || {};
        if (war3Path) {
          const profile = await resolveModProfile(war3Path, {
            versionSelection: settings.versionSelection,
            graphicsSelection: settings.graphicsSelection,
            classicMode: settings.classicMode === true,
          });
          if (!canUseRetroSkin(profile.graphics)) {
            throw new Error('怀旧皮肤仅支持 HD 模式，SD 和 DE 模式不可用');
          }
        }
        return await retroSkinService.apply(options);
      } catch (error) {
        console.error('Failed to apply retro skin:', error);
        throw error;
      }
    }
  );
}
