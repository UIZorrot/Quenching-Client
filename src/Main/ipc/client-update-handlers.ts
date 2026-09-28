import { ipcMain } from 'electron';
import { getClientUpdateStatus, prepareClientUpdate } from '../services/client-update-service';

export function registerClientUpdateHandlers(): void {
  ipcMain.handle('client-update:get-status', () => getClientUpdateStatus());
  ipcMain.handle('client-update:apply', async event => {
    const status = await getClientUpdateStatus();
    if (status.decision !== 'available') throw new Error(status.reason);
    await prepareClientUpdate((message, completed, total) => {
      if (!event.sender.isDestroyed()) event.sender.send('client-update:progress', { message, completed, total });
    });
    return { restarting: true };
  });
}
