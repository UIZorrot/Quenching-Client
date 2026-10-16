import { ipcMain } from 'electron';
import { customSkinService } from '../services/custom-skin-service';

export function registerCustomSkinHandlers() {
  ipcMain.handle('custom-skin:list', async (_event, targetId?: string) => {
    await customSkinService.repairImportedModels();
    return targetId ? customSkinService.getForTarget(targetId) : customSkinService.getAll();
  });

  ipcMain.handle('custom-skin:inspect-model', async (_event, modelPath: string, artSet?: 'sd' | 'hd' | 'de', portraitPath?: string) => {
    return customSkinService.inspectExternalModel(modelPath, artSet, portraitPath);
  });

  ipcMain.handle('custom-skin:create', async (_event, input) => {
    return customSkinService.create(input);
  });
  ipcMain.handle('custom-skin:delete', async (_event, id: string) => {
    await customSkinService.remove(id);
    return true;
  });
}
