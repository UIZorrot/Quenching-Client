import { app, ipcMain } from 'electron';
import { configManager } from '../services/config-manager';
import { ModelResourceRequest, ModelResourceService } from '../services/model-resource-service';

export function registerModelPreviewHandlers() {
  const resources = new ModelResourceService();
  app.once('will-quit', () => resources.close());
  ipcMain.handle('model:read-resource', async (_event, request: ModelResourceRequest) => {
    const resource = await resources.read(request, configManager.get('war3Path'));
    return { data: resource.bytes.toString('base64'), mimeType: 'application/octet-stream', resolvedPath: resource.resolvedPath };
  });
}
