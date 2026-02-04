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
import { convertActualSizeToScaleSize, getPhysicalScreens, getShortSide, HoFCachedGetPhysicalScreens } from './utils';
import { getWindowsDisplayScale } from './getWindowsDisplayScale';
// 使用相对路径导入，避免模块解析错误
import { reaxel_MainProcessHub } from '../../reaxels/main-process-hub';
import type { Display } from 'electron';
import { app, screen } from 'electron';
import { mainWindowResolutionPresets } from './resolution-presets';

/*app在4k分辨率下的基础宽高*/
const baseAppBounds = {
	width: 1920,
	height: 1350,
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
		display: Display = screen.getPrimaryDisplay(),
		options = {
			devtoolsWidth: null as number,
		}
	) => {
		try {
			const currentPhysicalScreen = (await HoFCachedGetPhysicalScreens({ store, setState })()).find((itm, index, arr) => {
				if (arr.length === 1) return true;
				if (itm.is_primary) {
					return true;
				}
				else {
					/*需要完善显示器匹配逻辑*/
					debugger;
				}
			});
			const { shortSide, value } = getShortSide(display);
			let percent = .9;

			//近距离使用大屏幕无缩放的场景
			if (
				getWindowsDisplayScale(display) < 1.2 &&
				currentPhysicalScreen.ppi < 103 &&
				currentPhysicalScreen.width * currentPhysicalScreen.height >= 3840 * 2160 &&
				(currentPhysicalScreen.width_mm > 950 || currentPhysicalScreen.height_mm > 534)
			) {
				percent = .6;
			}

			return convertActualSizeToScaleSize({
				width: options.devtoolsWidth ? (baseAppBounds.width + options.devtoolsWidth) : baseAppBounds.width,
				height: baseAppBounds.height,
			});
		} catch (e) {
			console.error(e);
			throw new Error(e);
		}
	};

	const resetMainWindowBounds = async (display = screen.getPrimaryDisplay()) => {
		const { height, width } = await calcActualAppSize();
		const physicalScreen = await getCurrentPhysicalScreen(display);
		if (!physicalScreen) {
			return;
		}
		reaxel_MainProcessHub().mainWindow?.setBounds({
			width,
			height,
			x: physicalScreen.width / 2 - width / 2,
			y: physicalScreen.height / 2 - height / 2,

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

	const centralWindowBounds = async (display = screen.getPrimaryDisplay()) => {
		const { width, height } = await calcActualAppSize(display);
		reaxel_MainProcessHub().mainWindow?.setPosition(
			(display.size.width - width) / 2,
			(display.size.height - height) / 2,
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
		// 打印缩放信息
		await logScaleInfo();

		const electronScreen = screen;

		electronScreen.on('display-metrics-changed', (event, display, changedMetrics) => {
			if (!display) return;
			console.log('显示器分辨率发生变化:');
			console.log(`ID: ${display.id}`);
			console.log(`分辨率: ${display.size.width}x${display.size.height}`);
			console.log(`scaleFactor: ${display.scaleFactor}`);
			console.log(`textScaleRatio: ${windowsTextScale}`);
			console.log(`displayScaleRatio: ${display.scaleFactor / windowsTextScale}\n\n`);
			resetMainWindowBounds();
		});

	});

	obsReaction(async () => {
		const { mainWindow } = reaxel_MainProcessHub.store;
		if (mainWindow) {
			mainWindow.on('moved', async () => {
				console.log('main-window moved');
				windowOnScreen(mainWindow);
				const r = await matchMonitors();
			});
		}

	}, () => [reaxel_MainProcessHub.store.mainWindow]);

	let rtn = {
		calcActualAppSize,
		windowsTextScale,
		windowsDisplayScale: getWindowsDisplayScale()
	};
	return Object.assign(() => rtn, {
		store,
		setState,
		mutate,
		statics,
	});
});


// 移除顶层的异步调用，在初始化时打印
const logScaleInfo = async () => {
	try {
		const displayScale = await getWindowsDisplayScale();
		console.log(JSON.stringify({
			'文本缩放比率': windowsTextScale,
			'系统缩放比率': displayScale,
		}, null, 3));
	} catch (error) {
		console.warn('Failed to get scale info:', error);
	}
};

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

