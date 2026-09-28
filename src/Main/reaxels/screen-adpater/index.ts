/**
 * 适配方案演示https://www.figma.com/design/5ttni1km306mFuZPRpGaVJ/Untitled?node-id=0-1&m=dev&t=1255ePvWcFfSgafX-1
 * 影响窗口在屏幕上展示的因素
 * [屏幕物理尺寸]
 * [屏幕分辨率]
 * [屏幕dpr]
 * [宽屏?方屏?竖屏?]
 ***************************
 * - screen.width = 逻辑像素数 = 物理像素数/
 * - dpr决定了用户观看距离
 * - 16/9的ar为1.7777*
 */
import { matchMonitors } from './getScreensInfo/matchPyScreenWithElectron';
import { windowOnScreen } from './onMoveScreen';
import { getTextScaleFactor } from './getWindowsTextScale';
import { getPhysicalScreens } from './utils';
import { getWindowsDisplayScale } from './getWindowsDisplayScale';
// 使用相对路径导入，避免模块解析错误
import { reaxel_MainProcessHub } from '../../reaxels/main-process-hub';
import type { Display } from 'electron';
import { app, screen } from 'electron';
import { mainWindowResolutionPresets } from './resolution-presets';

/*同一套逻辑像素画布。Windows 和 macOS 都按工作区缩放，避免 4K 把按钮裁出窗口。*/
const baseAppBounds = {
	width: 1440,
	height: 900,
};
// 移除顶层await，在需要时异步获取
let windowsTextScale: number = 1; // 默认值
const screenTypes = {};
/*app的最佳观看视距大小为690mm/米 */
const appHeightRatio = 690;

// 异步初始化文本缩放因子
const initTextScale = async () => {
	try {
		windowsTextScale = await getTextScaleFactor();
	} catch (error) {
		console.warn('Failed to get text scale factor, using default value 1:', error);
		windowsTextScale = 1;
	}
};

export const reaxel_ScreenAdapter = reaxel(() => {

	const { store, setState, mutate } = createReaxable({
		screenInfos: [],
		get primaryInfo() {
			return this.screenInfos.find(s => s.is_primary);
		}
	});

	const statics = {
		mainWindowResolutionPresets,
	};

	const calcActualAppSize = async (
		display?: Display,
		options = {
			devtoolsWidth: null as number,
		}
	) => {
		try {
			// 在函数内部获取 display，避免在默认参数中使用 screen
			const targetDisplay = display || screen.getPrimaryDisplay();


			// Electron 的 workAreaSize 在 Windows 和 macOS 上都是逻辑像素，已包含系统缩放。
			const work = targetDisplay.workAreaSize;
			const contentWidth = options.devtoolsWidth ? baseAppBounds.width + options.devtoolsWidth : baseAppBounds.width;
			const scale = Math.min(
				1,
				(work.width * 0.92) / contentWidth,
				(work.height * 0.92) / baseAppBounds.height,
			);
			return {
				width: Math.min(work.width, Math.round(contentWidth * scale)),
				height: Math.min(work.height, Math.round(baseAppBounds.height * scale)),
			};
		} catch (e) {
			console.error(e);
			throw new Error(e);
		}
	};

	const resetMainWindowBounds = async (display?: Display) => {
		const targetDisplay = display || screen.getPrimaryDisplay();
		const { height, width } = await calcActualAppSize(targetDisplay);
		const area = targetDisplay.workArea;
		reaxel_MainProcessHub().mainWindow?.setBounds({
			width,
			height,
			x: Math.round(area.x + (area.width - width) / 2),
			y: Math.round(area.y + (area.height - height) / 2),
		}, true);
	};

	/**
	 * @experimental
	 */
	const getCurrentPhysicalScreen = async (display: Display) => {
		try {
			return (await getPhysicalScreens()).find(s => s.name === display.label);
		}
		catch (e) {
			debugger;
		}
	}

	const centralWindowBounds = async (display?: Display) => {
		const targetDisplay = display || screen.getPrimaryDisplay();
		const { width, height } = await calcActualAppSize(targetDisplay);
		const area = targetDisplay.workArea;
		reaxel_MainProcessHub().mainWindow?.setPosition(
			Math.round(area.x + (area.width - width) / 2),
			Math.round(area.y + (area.height - height) / 2),
		)
	}
	// obsReaction( () => {
	// 	if( reaxel_MainProcessHub().mainWindow ) {
	// 		resetMainWindowBounds();
	// 	}
	// } , () => [ reaxel_MainProcessHub().mainWindow ] );

	app.whenReady().then(async () => {
		// 初始化文本缩放因子
		await initTextScale();

		const electronScreen = screen;

		electronScreen.on('display-metrics-changed', (event, display, changedMetrics) => {
			if (!display) return;
			console.log('显示器分辨率发生变化:');
			console.log(`ID: ${display.id}`);
			console.log(`分辨率: ${display.size.width}x${display.size.height}`);
			console.log(`scaleFactor: ${display.scaleFactor}`);
			console.log(`textScaleRatio: ${windowsTextScale}`);
			console.log(`displayScaleRatio: ${display.scaleFactor / windowsTextScale}\n\n`);
			resetMainWindowBounds(display);
		});

	});

	obsReaction(async () => {
		const mainWindow = reaxel_MainProcessHub?.store?.mainWindow;
		if (mainWindow) {
			mainWindow.on('moved', async () => {
				console.log('main-window moved');
				windowOnScreen(mainWindow);
				const r = await matchMonitors();
			});
		}

	}, () => [reaxel_MainProcessHub?.store?.mainWindow]);

	let rtn = {
		calcActualAppSize,
		windowsTextScale,
		get windowsDisplayScale() {
			return getWindowsDisplayScale();
		}
	};
	return Object.assign(() => rtn, {
		store,
		setState,
		mutate,
		statics,
	});
});


/**
 * 定义用户使用的设备及场景
 */
abstract class ScreenType {
	width_px: number;
	height_px: number;
	width_inch: number;
	height_inch: number;
}

class SceneType extends ScreenType {
	distance_cm: number;
	dpr: number;
	/*aspectRatio*/
	ar: number;

	constructor(opts: {
		distance_cm: number,
		dpr: number,
		width_px: number,
		height_px: number,
		width_inch: number,
		height_inch: number,
	}) {
		super();
		Object.assign(this, {
			...opts,
			ar: opts.width_px / opts.height_px,
		});
	}
}
