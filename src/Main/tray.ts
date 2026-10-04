const { absAssetsPath } = reaxel_ElectronENV();

app.whenReady().then(() => {
	if (process.env.QUENCHING_TEST_CONFIG_DIR) return;
	const trayIconPath = path.join(absAssetsPath, 'quenching/1.ico');
	const tray = new Tray(trayIconPath);

	const rebuildMenu = () => {
		const lang = configManager.get('language') || 'zh-CN';
		const labels: Record<string, { show: string; exit: string }> = {
			'zh-CN': { show: '显示主窗口', exit: '退出' },
			'en-US': { show: 'Show Main Window', exit: 'Quit' },
			'ko-KR': { show: '메인 창 표시', exit: '종료' },
			'fr-FR': { show: 'Afficher la fenêtre principale', exit: 'Quitter' },
			'pt-BR': { show: 'Mostrar janela principal', exit: 'Sair' },
			'ru-RU': { show: 'Показать главное окно', exit: 'Выход' },
			'es-ES': { show: 'Mostrar ventana principal', exit: 'Salir' },
			'pl-PL': { show: 'Pokaż okno główne', exit: 'Zakończ' },
		};
		const { show: showLabel, exit: exitLabel } = labels[lang] || labels['zh-CN'];
		const tooltip = lang === 'zh-CN' ? '淬火试炼 - Quenching Mod Client' : 'Quenching Mod Client';

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

	configManager.onDidChange('language', rebuildMenu);
});

import { quit } from './useQuitEvent';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { Tray, Menu, app } from 'electron';
import path from 'node:path';
import { configManager } from './services/config-manager';
