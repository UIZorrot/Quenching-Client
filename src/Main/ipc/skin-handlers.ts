import { ipcMain } from 'electron';
import { skinService, SkinChange } from '../services/skin-service';

export function registerSkinHandlers() {
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

  ipcMain.handle('skin:is-enabled', async () => {
    try {
      return await skinService.isSkinEnabled();
    } catch (error) {
      console.error('Failed to check skin status:', error);
      throw error;
    }
  });
}
