import { getTextScaleFactorValue } from '../utils';
import { screen } from 'electron';
import type { Display } from 'electron';

/**
 * 可能有多个显示器,每个显示器的scale均可能不同
 * 而textscale则是全局统一的,可以直接获取
 */
export const getWindowsDisplayScale = (display?: Display) => {
	// 如果没有传入 display，在函数内部获取，避免在默认参数中使用 screen
	const targetDisplay = display || screen.getPrimaryDisplay();
	// 在 Windows 平台下获取文本缩放因子，其他平台返回 1.0
	if (process.platform === 'win32') {
		return targetDisplay.scaleFactor / getTextScaleFactorValue();
	}
	return targetDisplay.scaleFactor;
};
