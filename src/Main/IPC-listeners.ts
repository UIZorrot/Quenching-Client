IpcMainOn('monitor-war3exe-process').on((e, data) => {
	const { toggleWar3ProcessMonitor } = reaxel_ProcessMonitor();
	toggleWar3ProcessMonitor(data);
});

IpcMainOn('fetch-ahk_cp-status').on((e, data, reply) => {
	reaxel_MainProcessHub().observedMainWindow((win) => {
		reply('fetch-ahk_cp-status').send(!!reaxel_AhkSpawner.store.ahk);
	});
});

IpcMainOn('shortcut').on((e, data) => {
	if (data.type === 'keydown' && data.key === 'F12') {
		const { mainWindow } = reaxel_MainProcessHub()
		if (mainWindow) {
			if (mainWindow.webContents.isDevToolsOpened()) {
				mainWindow.webContents.closeDevTools();
			} else {
				useOpenDevtools(mainWindow, { devtoolsOptions: { mode: 'left' }, width: 0 });
			}
		}
	}
});

IpcMainOn('open-url').on((e, data) => {
	shell.openExternal(data);
});
IpcMainHandle('clipboard').handle((e, data) => {
	if (data.operation === 'write') {
		clipboard.writeText(data.value);
	} else if (data.operation === 'read') {
		return clipboard.readText("clipboard");
	}
});
IpcMainHandle('screen-info').handle((e, data) => {
	return {
		primaryScreen: screen.getPrimaryDisplay()
	};
});

import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_AhkSpawner } from '#main/reaxels/ahk-spawner';
import { IpcMainHandle, IpcMainOn, useIpcSend } from '#main/utils/useIPC';
import { reaxel_ProcessMonitor } from '#main/reaxels/process-monitor';
import { shell, clipboard, ipcRenderer, ipcMain, screen } from 'electron';
import { useOpenDevtools } from '#generic/modify-electron/open-devtools';
import { registerLaunchHandlers } from './ipc/launch-handlers';
import { registerSkinHandlers } from './ipc/skin-handlers';
import { registerNewsHandlers } from './ipc/news-handlers';
import { registerVersionHandlers } from './ipc/version-handlers';
import { registerMdlHandlers } from './ipc/mdl-handlers';
import { registerUIHandlers } from './ipc/ui-handlers';
import { registerTerrainHandlers } from './ipc/terrain-handlers';
import { registerTreeHandlers } from './ipc/tree-handlers';
import { registerWaterHandlers } from './ipc/water-handlers';
import { registerFoliageHandlers } from './ipc/foliage-handlers';
import { registerShaderHandlers } from './ipc/shader-handlers';
import { registerScriptHandlers } from './ipc/script-handlers';
import { registerGlowHandlers } from './ipc/glow-handlers';
import { registerVisionHandlers } from './ipc/vision-handlers';

// Register Quenching Mod Handlers
registerLaunchHandlers();
registerSkinHandlers();
registerNewsHandlers();
registerVersionHandlers();
registerMdlHandlers();
registerUIHandlers();
registerTerrainHandlers();
registerTreeHandlers();
registerWaterHandlers();
registerFoliageHandlers();
registerShaderHandlers();
registerScriptHandlers();
registerGlowHandlers();
registerVisionHandlers();
