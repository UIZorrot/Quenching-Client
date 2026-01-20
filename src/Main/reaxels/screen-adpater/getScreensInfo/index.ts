export const getPyScreensInfo = async () => {
	const { absAppStaticsPath } = reaxel_ElectronENV();
	return new Promise<PhysicalScreen[]>(( resolve , reject ) => {
		const cp = spawn(path.join(absAppStaticsPath , 'assets/py_screen_info/screen_info.exe'));
		cp.stdout.on('data' , ( data: Buffer ) => {
			console.log('fffffffffffffg' , data.toString());
			resolve(JSON.parse(data.toString()));
			cp.kill();
		});
		cp.stdout.on('error' , ( e ) => {
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
	if ( !prevPyScreenResult || (now - prevInvokedTime > timeout) ) {
		prevInvokedTime = now;
		return prevPyScreenResult = await getPyScreensInfo();
	} else {
		return prevPyScreenResult;
	}
}

import type { PhysicalScreen } from '../utils';
import { spawn } from 'node:child_process';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import path from 'node:path';
