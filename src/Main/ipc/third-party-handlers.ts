import { ipcMain } from 'electron';
import { getThirdPartyState, importThirdPartySource, setThirdPartyEnabled, setThirdPartyFeature, setThirdPartyName } from '../services/third-party-resources';

export function registerThirdPartyHandlers(): void {
  ipcMain.handle('third-party:get-state', (_event, root: string) => getThirdPartyState(root));
  ipcMain.handle('third-party:import-zip', (_event, root: string, id: number, zipPath: string) => importThirdPartySource(root, id, { kind: 'zip', path: zipPath }));
  ipcMain.handle('third-party:import-directory', (_event, root: string, id: number, directory: string) => importThirdPartySource(root, id, { kind: 'directory', path: directory }));
  ipcMain.handle('third-party:set-enabled', (_event, root: string, id: number, enabled: boolean) => setThirdPartyEnabled(root, id, enabled));
  ipcMain.handle('third-party:set-feature', (_event, root: string, id: number, featureId: string, enabled: boolean) => setThirdPartyFeature(root, id, featureId, enabled));
  ipcMain.handle('third-party:set-name', (_event, root: string, id: number, name: string) => setThirdPartyName(root, id, name));
}
