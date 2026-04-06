import type { PhysicalScreen } from '../utils';
import { spawn } from 'node:child_process';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import path from 'node:path';

export const getPyScreensInfo = async () => {
	// 在非 Windows 平台上返回空数组，因为 screen_info.exe 只在 Windows 上可用
	if (process.platform !== 'win32') {
		console.log('[PyScreenInfo] Non-Windows platform detected, returning empty screen info');
		return [];
	}

	const { absAssetsPath } = reaxel_ElectronENV();
	return new Promise<PhysicalScreen[]>((resolve, reject) => {
		const cp = spawn(path.join(absAssetsPath, 'py_screen_info/screen_info.exe'));
		cp.stdout.on('data', (data: Buffer) => {
			try {
				resolve(JSON.parse(data.toString()));
			} catch (e) {
				reject(new Error(`Failed to parse py_screen_info output: ${e.message}`));
			}
			cp.kill();
		});
		cp.stdout.on('error', (e) => {
			console.error();
			reject(e);
		});
	});
}


let timeout = 5000;
let prevInvokedTime = 0;
let prevPyScreenResult: PhysicalScreen[] = null;
/**
 * 一定时间内获取的是缓存的pyscreen,超时后重新获取
 */
export const getCachedPyScreensInfo = async () => {
	const now = Date.now();
	if (!prevPyScreenResult || (now - prevInvokedTime > timeout)) {
		prevInvokedTime = now;
		return prevPyScreenResult = await getPyScreensInfo();
	} else {
		return prevPyScreenResult;
	}
}
