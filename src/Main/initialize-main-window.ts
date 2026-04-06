import { useQuitHook } from './useQuitHook';
import { reaxel_ScreenAdapter } from '#main/reaxels/screen-adpater';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { useBeautifulDevtool } from '#generic/modify-electron/beautiful-devtool';
import { useOpenDevtools } from '#generic/modify-electron/open-devtools';
import { dev } from 'electron-is';
import { BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron';
import path from 'path';


const { runInExcutable, absAppRunningPath, absAssetsPath } = reaxel_ElectronENV();
//4k下的尺寸
const appAttributes = {
	width: 1800,
	height: 1350
}
const devtoolsWidth = 1300;

export const initializeMainWindow = async (
	options: BrowserWindowConstructorOptions & ExtraOptions = {

	}
): Promise<BrowserWindow> => {
	const defaultExtraOptions: ExtraOptions = {
		openDevTools: dev(),
	}
	const { calcActualAppSize } = reaxel_ScreenAdapter();
	const actualAppSize = await calcActualAppSize();
	const defaultOptions: BrowserWindowConstructorOptions = {
		webPreferences: {
			devTools: true,
			contextIsolation: true,
			nodeIntegration: false,
			preload: path.join(absAppRunningPath, 'preload.cjs'),
			experimentalFeatures: false,

		},
		center: true,
		resizable: false,
		frame: false, // 无边框窗口
		icon: path.join(absAssetsPath, process.platform === 'win32' ? 'quenching/1.ico' : 'quenching/logo.png')
	};

	options = _.merge({
		...actualAppSize,
	}, defaultExtraOptions, defaultOptions, options);

	if (options.openDevTools) {
		// options.width += devtoolsWidth;
	}
	// console.trace( options );
	const mainWindow = new BrowserWindow(options);
	// console.log('screen.getPrimaryDisplay().scaleFactor:',screen.getPrimaryDisplay().scaleFactor);
	// 加载 index.html
	if (__NODE_ENV__ === 'development' && !runInExcutable) {
		// 尝试连接到webpack dev server，如果失败则加载本地文件
		try {
			await mainWindow.loadURL(`https://127.0.0.1:${__DEV_PORT__}`);
		} catch (error) {
			console.warn('Failed to connect to webpack dev server, loading local file:', error);
			mainWindow.loadFile("dist/renderer/index.html");
		}
	} else {
		mainWindow.loadFile("dist/renderer/index.html");
	}

	useQuitHook(mainWindow);
	useBeautifulDevtool(mainWindow);

	mainWindow.webContents.on('did-finish-load', () => {
		console.log('webkit loaded');
		// mainWindowLoaded.resolve( mainWindow );
	});
	if (options.openDevTools) {
		useOpenDevtools(mainWindow, {
			width: ((devtoolsWidth / screen.getPrimaryDisplay().scaleFactor)),
			devtoolsOptions: { mode: 'left', activate: true }
		}
		);
	}



	return mainWindow as BrowserWindow;
};

type ExtraOptions = Partial<{
	openDevTools: boolean,
}>

