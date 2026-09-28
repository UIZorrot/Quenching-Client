import { ipcMain } from 'electron';
import { customSkinService } from '../services/custom-skin-service';

export function registerCustomSkinHandlers() {
  ipcMain.handle('custom-skin:list', async (_event, targetId?: string) => {
    return targetId ? customSkinService.getForTarget(targetId) : customSkinService.getAll();
  });

  ipcMain.handle('custom-skin:inspect-model', async (_event, modelPath: string) => {
    return customSkinService.inspectExternalModel(modelPath);
  });

  ipcMain.handle('custom-skin:create', async (_event, input) => {
    return customSkinService.create(input);
  });
}
