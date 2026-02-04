const { absAppStaticsPath } = reaxel_ElectronENV();

const textScaleKey = 'HKCU\\Software\\Microsoft\\Accessibility';

setExternalVBSLocation(path.join(absAppStaticsPath, '/assets/vbs'));

export const getWindowsTextScaleByReg = () => {
	const promise = regedit.list([textScaleKey]).then((value) => {
		// 检查注册表值是否存在
		if (!value || !value[textScaleKey] || !value[textScaleKey].values || !value[textScaleKey].values.TextScaleFactor) {
			// Instead of throwing, we return null or 1.0 to avoid unhandled rejections if this is expected to fail on some systems
			console.warn('TextScaleFactor not found in registry, defaulting to 1.0');
			return 1.0; 
		}

		const textScaleFactorValue = value[textScaleKey].values.TextScaleFactor.value;
		if (typeof textScaleFactorValue !== 'number') {
			console.warn('TextScaleFactor is not a number, defaulting to 1.0');
			return 1.0;
		}

		const textScaleFactor = textScaleFactorValue / 100;
		// console.log( 'Text Scale Factor:' , textScaleFactor ); // 转换为倍数
		return textScaleFactor;
	});

	// Catch any other errors and prevent unhandled rejection
	return promise.catch(e => {
		console.warn('Registry read failed:', e.message);
		return 1.0;
	});
}


import { promisified as regedit, setExternalVBSLocation } from 'regedit';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import path from 'node:path';
