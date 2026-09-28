const { absAppStaticsPath } = reaxel_ElectronENV();

const textScaleKey = 'HKCU\\Software\\Microsoft\\Accessibility';

setExternalVBSLocation(path.join(absAppStaticsPath, '/assets/vbs'));

export const getWindowsTextScaleByReg = () => {
	const promise = regedit.list([textScaleKey]).then((value) => {
		// 检查注册表值是否存在
		if (!value || !value[textScaleKey] || !value[textScaleKey].values || !value[textScaleKey].values.TextScaleFactor) {
			return null;
		}

		const textScaleFactorValue = value[textScaleKey].values.TextScaleFactor.value;
		if (typeof textScaleFactorValue !== 'number') {
			return null;
		}

		const textScaleFactor = textScaleFactorValue / 100;
		// console.log( 'Text Scale Factor:' , textScaleFactor ); // 转换为倍数
		return textScaleFactor;
	});

	// Catch any other errors and prevent unhandled rejection
	return promise.catch(e => {
		return null;
	});
}


import { promisified as regedit, setExternalVBSLocation } from 'regedit';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import path from 'node:path';
