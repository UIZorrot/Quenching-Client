import { execSync , spawn } from 'child_process';
import { shell } from 'electron';


/**
 * 从注册表中获取 Chrome 的安装路径
 * @param {string} version - "stable" 或 "dev"
 * @returns {string | null} Chrome 浏览器路径
 */
export function getChromePathFromRegistry(version: 'stable' | 'dev' = 'stable'): string | null {
	const regKey = version === 'stable'
		? 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe'
		: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome-dev.exe';
	
	try {
		const output = execSync(`reg query "${regKey}" /ve`, { encoding: 'utf8' });
		const match = output.match(/REG_SZ\s+(.*)/);
		if (match) {
			return match[1].trim();
		} else {
			throw new Error('未找到浏览器路径');
		}
	} catch (error) {
		console.error(`无法获取 Chrome 路径: ${error.message}`);
		return null;
	}
}

/**
 * 使用指定的 Chrome 浏览器打开链接
 * @param {string} url - 需要打开的链接
 * @param {string} version - "stable" 或 "dev"
 */
export function openLinkInChrome(url: string, version: 'stable' | 'dev' = 'stable'): void {
	const chromePath = getChromePathFromRegistry(version);
	if (chromePath) {
		spawn(chromePath, [url], { detached: true, stdio: 'ignore' }).unref();
	} else {
		console.warn(`未找到 Chrome 路径，使用默认浏览器打开链接: ${url}`);
		shell.openExternal(url); // 默认行为
	}
}

/**
 * 在 Electron 中自定义处理打开链接的行为
 * @param {Electron.BrowserWindow} win - 当前窗口实例
 */
export function useOpenLinkViaChrome(win: Electron.BrowserWindow): void {
	// 使用 setWindowOpenHandler 处理新窗口打开行为
	win.webContents.setWindowOpenHandler(({ url }) => {
		// 自定义处理外部链接
		if (url.startsWith('http')) {
			openLinkInChrome(url, 'stable'); // 使用稳定版 Chrome 打开链接
			return { action: 'deny' }; // 阻止 Electron 默认行为
		}
		return { action: 'allow' }; // 保留其他行为
	});
}
