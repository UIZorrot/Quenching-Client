export const env = (() => {
	const isElectron =
		typeof window !== 'undefined' &&
		typeof window.process === 'object' &&
		window.process.type === 'renderer' &&
		typeof window.require === 'function';
	
	const hasPreloadFlag =
		typeof window !== 'undefined' &&
		typeof window.IPC === 'object' &&
		typeof window.versions?.electron === 'string';
	
	if (isElectron || hasPreloadFlag) {
		return 'electron';
	} else {
		return 'browser';
	}
})();

export const isElectron = env === "electron";
export const isBrowser = env === "browser";
