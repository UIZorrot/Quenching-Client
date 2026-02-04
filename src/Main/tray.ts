const { absAssetsPath } = reaxel_ElectronENV();

app.whenReady().then(() => {
	const trayIconPath = path.join(absAssetsPath, 'quenching/1.ico');
	const tray = new Tray(trayIconPath);

	const rebuildMenu = () => {
		const lang = configManager.get('language') || 'zh-CN';
		const isEn = lang === 'en-US';
		const isKo = lang === 'ko-KR';

		let showLabel = '显示主窗口';
		let exitLabel = '退出';
		let tooltip = '淬火试炼 - Quenching Mod Client';

		if (isEn) {
			showLabel = 'Show Main Window';
			exitLabel = 'Quit';
			tooltip = 'Quenching Mod Client';
		} else if (isKo) {
			showLabel = '기본 창 표시';
			exitLabel = '종료';
			tooltip = 'Quenching Mod Client';
		}

		const contextMenu = Menu.buildFromTemplate([
			{
				label: showLabel,
				async click() {
					reaxel_MainProcessHub().mainWindow?.show();
				},
			},
			{
				label: exitLabel,
				async click() {
					quit('tray-exit');
				},
			},
		]);

		tray.setContextMenu(contextMenu);
		tray.setToolTip(tooltip);
	};

	rebuildMenu();

	tray.on('click', async () => {
		const mainWindow = reaxel_MainProcessHub().mainWindow;
		if (mainWindow) {
			if (mainWindow.isVisible()) {
				if (mainWindow.isMinimized()) mainWindow.restore();
				mainWindow.show();
				mainWindow.focus();
			} else {
				mainWindow.show();
			}
		}
	});

	// 监听语言变化 (通过 setConfig 的 IPC 调用)
	ipcMain.on('config:set', (event, key, value) => {
		if (key === 'language') {
			rebuildMenu();
		}
	});
});

import { quit } from './useQuitEvent';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { Tray, Menu, app, ipcMain } from 'electron';
import path from 'node:path';
import { configManager } from './services/config-manager';
