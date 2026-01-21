import { ipcMain, shell, clipboard, screen } from 'electron';
import { IpcMainHandle, IpcMainOn } from '#main/utils/useIPC';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_AhkSpawner } from '#main/reaxels/ahk-spawner';
import { reaxel_ProcessMonitor } from '#main/reaxels/process-monitor';
import { useOpenDevtools } from '#generic/modify-electron/open-devtools';

export class AppOperationsAPI {
    static register() {
        // 监控魔兽进程
        IpcMainOn('monitor-war3exe-process').on((e, data) => {
            const { toggleWar3ProcessMonitor } = reaxel_ProcessMonitor();
            toggleWar3ProcessMonitor(data);
        });

        // 获取 AHK 状态
        IpcMainOn('fetch-ahk_cp-status').on((e, data, reply) => {
            reaxel_MainProcessHub().observedMainWindow((win) => {
                reply('fetch-ahk_cp-status').send(!!reaxel_AhkSpawner.store.ahk);
            });
        });

        // 快捷键监听 (F12 打开开发者工具)
        IpcMainOn('shortcut').on((e, data) => {
            if (data.type === 'keydown' && data.key === 'F12') {
                const { mainWindow } = reaxel_MainProcessHub();
                if (mainWindow) {
                    if (mainWindow.webContents.isDevToolsOpened()) {
                        mainWindow.webContents.closeDevTools();
                    } else {
                        useOpenDevtools(mainWindow, { devtoolsOptions: { mode: 'left' }, width: 0 });
                    }
                }
            }
        });

        // 打开外部链接
        IpcMainOn('open-url').on((e, data) => {
            shell.openExternal(data);
        });

        // 剪贴板操作
        IpcMainHandle('clipboard').handle((e, data) => {
            if (data.operation === 'write') {
                clipboard.writeText(data.value);
                return null;
            } else {
                return clipboard.readText("clipboard");
            }
        });

        // 屏幕信息
        IpcMainHandle('screen-info').handle((e, data) => {
            return {
                primaryScreen: screen.getPrimaryDisplay()
            };
        });
    }
}
