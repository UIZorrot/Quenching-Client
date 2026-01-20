export const getTextScaleFactor = async (): Promise<number> => {
	// 尝试多种方法获取文本缩放因子，如果都失败则返回默认值1

	try {
		const result = await getTextScaleFactorByPyScreensInfo();
		if (checkValidScale(result)) {
			return result;
		}
	} catch (e) {
		console.warn(`无法通过py_screeninfo获取主屏幕的textScaleFactor:`, e.message);
	}

	try {
		const result = await getWindowsTextScaleByReg();
		if (checkValidScale(result)) {
			return result;
		}
	} catch (e) {
		console.warn(`无法通过注册表获取主屏幕的textScaleFactor:`, e.message);
	}

	try {
		const result = getWindowsTextScaleByPS();
		if (checkValidScale(result)) {
			return result;
		}
	} catch (e) {
		console.warn(`无法通过PowerShell获取主屏幕的textScaleFactor:`, e.message);
	}

	// 所有方法都失败，返回默认值
	console.warn('所有获取文本缩放因子的方法都失败，使用默认值 1.0');
	return 1.0;
};

function checkValidScale(scale: number) {
	return typeof scale === 'number' && !Number.isNaN(scale) && scale >= 1;
}


import { getWindowsTextScaleByPS } from './powershell-style';
import { getWindowsTextScaleByReg } from './registry-style';
import { getTextScaleFactorByPyScreensInfo } from './spawn-pyscreen-style';

