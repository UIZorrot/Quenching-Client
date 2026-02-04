export const getWindowsTextScaleByPS = () => {
	try {
		const result = execSync(
			'powershell -Command "[Windows.UI.ViewManagement.UISettings]::new().TextScaleFactor"',
			{ encoding: 'utf8', timeout: 5000 }
		).toString().trim();

		const scaleFactor = parseFloat(result);
		if (isNaN(scaleFactor) || scaleFactor < 1) {
			throw new Error(`Invalid scale factor: ${result}`);
		}

		return scaleFactor;
	} catch (error) {
		throw new Error(`PowerShell command failed: ${error.message}`);
	}
};

import { execSync } from 'child_process';
