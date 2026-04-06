// 导入语句必须在最前面
import "#main/index";
import "#main/reaxels/menu";
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { initializeMainWindow } from '#main/initialize-main-window';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { registerAllAPIs } from '#main/api';
import { app, ipcMain, screen } from 'electron';
import { dev } from 'electron-is';
import logger from 'electron-log/main';
import { obsReaction } from 'reaxes';
import si from "systeminformation";

logger.initialize();

console.log(__NODE_ENV__);

// =====================================================================
// 【修复】搜狗输入法/中文输入法兼容性 - 必须在任何 electron ready 前执行
// 搜狗等第三方 IME 在 Windows 上与 Electron GPU 沙箱冲突导致白屏/不弹窗
// =====================================================================
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('ignore-certificate-errors');

app.whenReady().then(() => {
	// 注册所有API
	registerAllAPIs();

	const reax_MainProcessHub = reaxel_MainProcessHub();

	obsReaction(() => {
		const { recreateMainWindow, mainWindow } = reax_MainProcessHub;
		if (mainWindow) {
		} else {
			recreateMainWindow({
				openDevTools: dev()
			});
		}
	}, () => [reax_MainProcessHub.mainWindow]);

	// mainWindow.setIcon('https://img.piclabo.xyz/2023/10/25/d67adcffb89dd.jpg')
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态,
// 直到用户使用 Cmd + Q 明确退出
// app.on( 'window-all-closed' , () => {
// 	if( process.platform !== 'darwin' ) app.quit();
// } );

app.whenReady().then(() => {

	const primaryDisplay = screen.getPrimaryDisplay();

	const scaleFactor = primaryDisplay.scaleFactor;


	// console.log( 'HDR support:' , hdrSupported );
});

si.graphics().then(data => {
	console.log("GPU:", data.controllers.map(ctrl => ctrl.model));
});
