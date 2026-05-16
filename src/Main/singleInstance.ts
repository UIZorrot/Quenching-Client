import { app } from 'electron';

// =====================================================================
// 【修复】单实例锁必须在 app.whenReady() 之前调用
// 原先在 app.whenReady 内部调用会产生竞态条件：
// 当搜狗输入法等 IME 进程在短时间内产生多次启动请求时，
// app.whenReady 已经触发但锁还没拿到，导致多实例同时运行或异常退出。
// =====================================================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	// 已有实例在运行，静默退出当前新启动的进程（不弹错误框，避免干扰用户）
	app.quit();
	process.exit(0);
}

// 当第二个实例尝试启动时（如用户双击图标），聚焦到已有主窗口
// 注意：实际的窗口聚焦逻辑在 reaxel_MainProcessHub 中处理
app.on('second-instance', () => {
	// 从全局获取主窗口并聚焦（多数情况由框架处理）
	const { BrowserWindow } = require('electron');
	const windows = BrowserWindow.getAllWindows();
	if (windows.length > 0) {
		const mainWin = windows[0];
		if (mainWin.isMinimized()) {
			mainWin.restore();
		}
		mainWin.show();
		mainWin.focus();
	}
});
