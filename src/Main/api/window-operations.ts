import { ipcMain, BrowserWindow, shell, app } from 'electron';

// 窗口操作API
export class WindowOperationsAPI {
  static register() {
    // 最小化窗口
    ipcMain.handle('window:minimize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        // 立即响应，不等待动画完成
        setImmediate(() => window.minimize());
      }
    });

    // 最大化窗口
    ipcMain.handle('window:maximize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
      }
    });

    // 关闭窗口
    ipcMain.handle('window:close', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        // 直接退出应用，避免多重处理导致的延迟
        setImmediate(() => {
          const { app } = require('electron');
          app.quit();
        });
      }
    });

    // 隐藏窗口
    ipcMain.handle('window:hide', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.hide();
      }
    });

    // 显示窗口
    ipcMain.handle('window:show', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.show();
      }
    });

    // 设置窗口置顶
    ipcMain.handle('window:setAlwaysOnTop', (event, flag: boolean) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setAlwaysOnTop(flag);
      }
    });

    // 获取窗口状态
    ipcMain.handle('window:getState', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        return {
          isMaximized: window.isMaximized(),
          isMinimized: window.isMinimized(),
          isVisible: window.isVisible(),
          isFocused: window.isFocused(),
          bounds: window.getBounds()
        };
      }
      return null;
    });

    // 设置窗口大小
    ipcMain.handle('window:setSize', (event, width: number, height: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setSize(width, height);
      }
    });

    // 设置窗口位置
    ipcMain.handle('window:setPosition', (event, x: number, y: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setPosition(x, y);
      }
    });

    // 居中窗口
    ipcMain.handle('window:center', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.center();
      }
    });

    // 打开外部链接
    ipcMain.handle('window:openExternal', async (event, url: string) => {
      try {
        await shell.openExternal(url);
        return true;
      } catch (error) {
        console.error('Failed to open external URL:', error);
        throw error;
      }
    });

    // 显示文件夹
    ipcMain.handle('window:showItemInFolder', (event, fullPath: string) => {
      shell.showItemInFolder(fullPath);
    });

    // 获取应用版本
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    // 获取应用路径
    ipcMain.handle('app:getPath', (event, name: string) => {
      return app.getPath(name as any);
    });

    // 退出应用
    ipcMain.handle('app:quit', () => {
      app.quit();
    });

    // 重启应用
    ipcMain.handle('app:relaunch', () => {
      app.relaunch();
      app.exit();
    });

    // 获取系统信息
    ipcMain.handle('system:getInfo', async () => {
      const os = require('os');
      return {
        platform: process.platform,
        arch: process.arch,
        version: os.release(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus(),
        hostname: os.hostname(),
        userInfo: os.userInfo()
      };
    });

    // 获取显示器信息
    ipcMain.handle('system:getDisplays', () => {
      const { screen } = require('electron');
      return screen.getAllDisplays();
    });

    // 设置窗口图标
    ipcMain.handle('window:setIcon', (event, iconPath: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setIcon(iconPath);
      }
    });

    // 设置窗口标题
    ipcMain.handle('window:setTitle', (event, title: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setTitle(title);
      }
    });

    // 闪烁窗口（Windows）
    ipcMain.handle('window:flashFrame', (event, flag: boolean) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window && process.platform === 'win32') {
        window.flashFrame(flag);
      }
    });

    // 设置进度条（Windows/macOS）
    ipcMain.handle('window:setProgressBar', (event, progress: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setProgressBar(progress);
      }
    });

    // 设置缩略图工具栏（Windows）
    ipcMain.handle('window:setThumbarButtons', (event, buttons: any[]) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window && process.platform === 'win32') {
        window.setThumbarButtons(buttons);
      }
    });

    // 设置任务栏徽章（macOS）
    ipcMain.handle('app:setBadgeCount', (event, count: number) => {
      if (process.platform === 'darwin') {
        app.setBadgeCount(count);
      }
    });

    // 设置Dock菜单（macOS）
    ipcMain.handle('app:setDockMenu', (event, menu: any) => {
      if (process.platform === 'darwin') {
        const { Menu } = require('electron');
        app.dock.setMenu(Menu.buildFromTemplate(menu));
      }
    });
  }
}
