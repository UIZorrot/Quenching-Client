export const windowOnScreen = async (mainWindow:BrowserWindow) => {
	const bounds = mainWindow.getBounds();
	const screens = await getPyScreensInfo();
	
	const display = screen.getDisplayMatching(bounds);
	
	console.log(screens,'gggg');
	console.log('当前窗口位于显示器：', display.id)
};

import { getPyScreensInfo } from './getScreensInfo';
import { BrowserWindow , screen , app } from 'electron';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
