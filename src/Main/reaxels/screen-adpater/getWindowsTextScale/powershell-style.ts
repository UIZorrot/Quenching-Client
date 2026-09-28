import { execFile } from 'child_process';

export const getWindowsTextScaleByPS = (): Promise<number> => new Promise((resolve, reject) => {
	execFile(
		'powershell.exe',
		['-NoProfile', '-NonInteractive', '-Command', '[Windows.UI.ViewManagement.UISettings]::new().TextScaleFactor'],
		{ encoding: 'utf8', timeout: 2000, windowsHide: true },
		(error, stdout) => {
			if (error) return reject(error);
			const scaleFactor = Number.parseFloat(stdout.trim());
			if (!Number.isFinite(scaleFactor) || scaleFactor < 1) return reject(new Error('Invalid text scale factor'));
			resolve(scaleFactor);
		}
	);
});
