import { getTextScaleFactor } from './getWindowsTextScale';
import { screen, app } from 'electron';
import type { Display, Size } from 'electron';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { spawn } from 'child_process';
import path from 'path';

// 延迟初始化的变量
let textScaleFactor: number;
let displayScaleFactor: number;
let initialized = false;

// 初始化函数，确保在 app ready 后调用
const initializeScaleFactors = async () => {
	if (initialized) return;
	
	if (!app.isReady()) {
		await new Promise<void>(resolve => app.whenReady().then(() => resolve()));
	}
	
	try {
		textScaleFactor = await getTextScaleFactor();
		displayScaleFactor = screen.getPrimaryDisplay().scaleFactor / textScaleFactor;
		initialized = true;
	} catch (error) {
		console.warn('Failed to initialize scale factors:', error);
		textScaleFactor = 1;
		displayScaleFactor = 1;
	}
};

// 导出获取函数而不是直接值
export const getTextScaleFactorValue = () => textScaleFactor || 1;
export const getDisplayScaleFactorValue = () => displayScaleFactor || 1;

// 延迟初始化，在 app ready 后执行
if (app.isReady()) {
	initializeScaleFactors().catch(console.error);
} else {
	app.whenReady().then(() => initializeScaleFactors().catch(console.error));
}

/**
 * 计算受dpr影响过的屏幕宽高
 * *为什么不直接用display.size? --因为size会被textScale和displayScale同时影响,而这个函数计算的是只受displayScaleSize影响的分辨率,因为textScaleSize并不影响UI的大小
 * display.size.width === realWithPx * displayScale * textScale 
 */
export const calcDprEffectedRes = (display: Display) => {
	const currentTextScaleFactor = getTextScaleFactorValue();
	if (!currentTextScaleFactor) {
		console.warn('textScaleFactor not initialized yet, using default value 1');
		return {
			dprWidth: display.size.width,
			dprHeight: display.size.height,
		};
	}
	return {
		dprWidth: display.size.width / currentTextScaleFactor,
		dprHeight: display.size.height / currentTextScaleFactor,
	};
}

/**
 * 获取屏幕宽高中短的那一边
 */
export const getShortSide = (display: Display) => {
	const min = Math.min(display.size.width, display.size.height);
	return {
		shortSide: (min === display.size.width ? "width" : "height") as "width" | "height",
		value: min,
	}
}

import { platform } from 'node:os';

/**
 * 获取屏幕的物理参数
 */
export const getPhysicalScreens = () => {
	// 检查操作系统，非 Windows 系统返回默认值
	if (platform() !== 'win32') {
		const defaultScreen = {
			"x": 0,
			"y": 0,
			"width": 1920,
			"height": 1080,
			"width_mm": 508,
			"height_mm": 286,
			"name": 'Default Display',
			"is_primary": true,
			"ppi": 96,
			"display_scale_factor": 1.0,
			"text_scale_factor": 1.0,
		} as PhysicalScreen;
		return Promise.resolve([defaultScreen]);
	}

	const { absAssetsPath } = reaxel_ElectronENV();
	const exePath = path.join(absAssetsPath, 'py_screen_info/screen_info.exe');
	const cp = spawn(exePath);
	const promise = xPromise<PhysicalScreen[]>();
	cp.stdout.on('data', (data) => {
		const physicalScreens = JSON.parse(data) as PhysicalScreen[];
		promise.resolve(physicalScreens);
	});
	cp.on('error', (e) => {
		console.error(e);
		promise.reject(e);
	});

	return promise;
}
export const HoFCachedGetPhysicalScreens = ({ store, setState }) => async () => {
	if (store.screenInfos.length) {
		return store.screenInfos;
	}
	const physicalScreen = await getPhysicalScreens();
	setState({
		screenInfos: physicalScreen,
	});
	return physicalScreen;
}

export const convertActualSizeToScaleSize = async ({ width, height }) => {
	const { width: primaryWidthPx, height: primaryHeightPx } = (await getPhysicalScreens()).find(s => s.is_primary)!;
	const { size } = screen.getPrimaryDisplay();
	return {
		width: Math.ceil((width / primaryWidthPx) * size.width),
		height: Math.ceil((height / primaryHeightPx) * size.height),
	}
}

export type PhysicalScreen = {
	"x": number,
	"y": number,
	"width": number,
	"height": number,
	"width_mm": number,
	"height_mm": number,
	"name": string,
	"is_primary": boolean,
	"ppi": number,
	"display_scale_factor": number,
	"text_scale_factor": number,
};
