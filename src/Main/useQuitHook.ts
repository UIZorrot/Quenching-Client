export const useQuitHook = (win: BrowserWindow) => {
	onQuit((type) => {
		if (type === 'close-window') {
			win.hide();
			return false;
		} else {
			return true;
		}
	});
	win.on('close', (event) => {
		//没有quitReason就说明是从x按钮关闭的
		if (!quitReason) {
			// 直接关闭程序，不隐藏到托盘
			// 如果用户想要隐藏到托盘，可以使用最小化按钮
			app.quit();
		}
	});
}


import { onQuit, quitReason } from './useQuitEvent';
import { BrowserWindow, app } from 'electron';
