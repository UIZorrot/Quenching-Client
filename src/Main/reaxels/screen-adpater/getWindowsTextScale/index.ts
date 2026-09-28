let cachedTextScale: Promise<number> | null = null;

export const getTextScaleFactor = (): Promise<number> => {
	if (!cachedTextScale) cachedTextScale = detectTextScaleFactor();
	return cachedTextScale;
};

const detectTextScaleFactor = async (): Promise<number> => {
	// 在非 Windows 平台上直接返回默认值
	if (process.platform !== 'win32') {
		console.log('[TextScale] Non-Windows platform detected, using default scale factor 1.0');
		return 1.0;
	}

	// 尝试多种方法获取文本缩放因子，如果都失败则返回默认值1

	try {
		const result = await getTextScaleFactorByPyScreensInfo();
		if (checkValidScale(result)) {
			return result;
		}
	} catch (e) {
		// py_screeninfo does not report text scaling on every Windows system.
	}

	try {
		const result = await getWindowsTextScaleByReg();
		if (checkValidScale(result)) {
			return result;
		}
	} catch (e) {
		// Continue to the PowerShell fallback.
	}

	try {
		const result = await getWindowsTextScaleByPS();
		if (checkValidScale(result)) {
			return result;
		}
	} catch (e) {
		// Continue with the documented default when Windows does not expose this value.
	}

	// 所有方法都失败，返回默认值
	return 1.0;
};

function checkValidScale(scale: number) {
	return typeof scale === 'number' && !Number.isNaN(scale) && scale >= 1;
}


import { getWindowsTextScaleByPS } from './powershell-style';
import { getWindowsTextScaleByReg } from './registry-style';
import { getTextScaleFactorByPyScreensInfo } from './spawn-pyscreen-style';
