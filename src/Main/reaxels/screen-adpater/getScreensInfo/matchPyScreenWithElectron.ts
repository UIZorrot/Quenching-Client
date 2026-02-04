/**
 * 匹配pyscreens和Electron获取到的显示器参数
 */
export async function matchMonitors(): Promise<Map<PhysicalScreen, Electron.Display>> {
	const textScaleFactor = await getTextScaleFactor();
	const pyscreens = await getCachedPyScreensInfo();
	
	const monitorMap = new Map<PhysicalScreen, Electron.Display>();
	const electronDisplays = screen.getAllDisplays();
	const primaryDisplay = screen.getPrimaryDisplay();
	const primaryScaleFactor = primaryDisplay.scaleFactor;
	
	// 找到 Python 中的主显示器
	const primaryPythonMonitor = pyscreens.find(m => m.is_primary);
	if (!primaryPythonMonitor) return monitorMap;
	
	// 计算主显示器的 DPI 缩放因子并验证
	const DPI_scale_factor_primary = primaryScaleFactor / textScaleFactor;
	if (Math.abs(primaryPythonMonitor.display_scale_factor - DPI_scale_factor_primary) > 0.01) {
		console.warn('Primary display scale factor mismatch');
	}
	
	// 为每个 Electron 显示器计算物理像素坐标
	electronDisplays.forEach(display => {
		// 计算该显示器的 DPI 缩放因子
		const DPI_scale_factor = display.scaleFactor / textScaleFactor;
		
		// 将 Electron 的逻辑像素转换为物理像素
		const convertedElectronBounds:Rectangle = {
			x : Math.round(display.bounds.x * display.scaleFactor),
			y : Math.round(display.bounds.y * display.scaleFactor),
			width : Math.round(display.bounds.width * display.scaleFactor),
			height : Math.round(display.bounds.height * display.scaleFactor),
		};
		
		// 找到匹配的 Python 显示器
		const matchedMonitor = pyscreens.find(monitor => {
			const expectedScaleFactor = monitor.display_scale_factor * textScaleFactor;
			return (
				Math.abs(monitor.x - convertedElectronBounds.x) < 1 &&
				Math.abs(monitor.y - convertedElectronBounds.y) < 1 &&
				Math.abs(monitor.width - convertedElectronBounds.width) < 2 &&
				Math.abs(monitor.height - convertedElectronBounds.height) < 2 &&
				Math.abs(display.scaleFactor - expectedScaleFactor) < 0.01
			);
		});
		
		if (matchedMonitor) {
			monitorMap.set(matchedMonitor, display);
		} else {
			debugger;
			console.warn(`No match found for Electron display at physical position (${convertedElectronBounds.x}, ${convertedElectronBounds.y})`);
		}
	});
	
	return monitorMap;
}

import { getTextScaleFactor } from '../getWindowsTextScale';
import { screen , app ,Rectangle } from 'electron';
import { getPyScreensInfo , getCachedPyScreensInfo } from '../getScreensInfo';
import type { PhysicalScreen } from '../utils';

