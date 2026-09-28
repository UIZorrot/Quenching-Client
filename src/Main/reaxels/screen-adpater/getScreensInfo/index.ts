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
		const chunks: Buffer[] = [];
		let bytes = 0;
		let settled = false;
		const finish = (error?: Error, screens?: PhysicalScreen[]) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			if (error) reject(error);
			else resolve(screens || []);
		};
		const timer = setTimeout(() => {
			cp.kill();
			finish(new Error('py_screen_info timed out'));
		}, 15000);
		cp.stdout.on('data', (data: Buffer) => {
			bytes += data.length;
			if (bytes > 1024 * 1024) {
				cp.kill();
				finish(new Error('py_screen_info output exceeded 1 MiB'));
			} else chunks.push(data);
		});
		cp.on('error', (error) => finish(error));
		cp.on('close', (code) => {
			if (settled) return;
			if (code !== 0) return finish(new Error(`py_screen_info exited with code ${code}`));
			try { finish(undefined, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
			catch (error: any) { finish(new Error(`Failed to parse py_screen_info output: ${error?.message || String(error)}`)); }
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
