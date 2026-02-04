import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { registerAllAPIs } from './api';
import { cleanupShadersOnStartup } from './ipc/shader-handlers';
import { cleanupScriptsOnStartup } from './ipc/script-handlers';
import { AssetSyncService } from './services/asset-sync';
import { configManager } from './services/config-manager';

// 忽略 SSL 证书错误 (解决开发环境下的自签名证书问题)
app.commandLine.appendSwitch('ignore-certificate-errors');

// 保持对窗口对象的全局引用
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development';

console.log(`\n[Main] Quenching Client Starting... (v1.0.1-debug)`);
console.log(`[Main] NODE_ENV: ${process.env.NODE_ENV}`);

function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 800,
    minHeight: 560,
    frame: false, // 无边框窗口
    transparent: false,
    backgroundColor: '#000000',
    icon: path.join(__dirname, '../assets/quenching/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: !isDev
    },
    show: true // 强制显示，方便调试
  });

  // 加载应用
  if (isDev) {
    // 使用 webpack-start 脚本指定的端口 4410
    const devServerUrl = 'http://localhost:4410';
    console.log(`Loading from Dev Server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch(err => {
      console.error('Failed to load Dev Server, falling back to local file:', err);
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });

    // 开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 调试日志
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details.reason);
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();

      // 居中显示
      mainWindow.center();

      // 设置最小尺寸
      mainWindow.setMinimumSize(800, 560);
    }
  });

  // 窗口关闭事件处理已移至WindowOperationsAPI，避免重复处理

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 防止新窗口打开
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

function createTray(): void {
  // 创建系统托盘图标
  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, '../assets/quenching/1.ico')
  );

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '关于淬火试炼',
      click: () => {
        // 发送消息到渲染进程显示关于对话框
        if (mainWindow) {
          mainWindow.webContents.send('show-about');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('淬火试炼 - Quenching Mod Client');

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// 应用准备就绪
app.whenReady().then(async () => {
  // 注册所有API
  registerAllAPIs();

  console.log('\n==================== [AssetSync] Startup Check Begin ====================');
  try {
    const war3Path = configManager.get('war3Path');
    console.log(`[Main] Current War3Path from config: ${war3Path}`);

    if (war3Path) {
      console.log('[Main] War3Path detected, starting asset synchronization...');
      await AssetSyncService.syncAssetsBeforeLaunch(war3Path);
      console.log('[Main] Asset synchronization completed.');

      // 启动时清理已禁用的着色器文件
      const modSettings = configManager.get('modSettings');
      if (modSettings) {
        await cleanupShadersOnStartup(war3Path, modSettings);
        await cleanupScriptsOnStartup(war3Path, modSettings);
      }
    } else {
      console.warn('[Main] War3Path not configured. Skipping asset synchronization.');
      console.warn('[Main] Please configure the Warcraft III path in settings to enable asset sync.');
    }
  } catch (error) {
    console.error('[Main] Failed to sync core assets on startup:', error);
  }
  console.log('==================== [AssetSync] Startup Check Complete ====================\n');

  // 创建窗口
  createWindow();

  // 创建系统托盘
  createTray();

  // macOS 下点击 Dock 图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

// 所有窗口关闭时退出应用（除了 macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用即将退出
app.on('before-quit', () => {
  // 清理资源
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// 安全设置
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler((details) => {
    // 阻止应用内创建新窗口，如果需要打开外部链接，可以在这里处理
    // 例如: shell.openExternal(details.url);
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'http://localhost:3000' && !isDev) {
      event.preventDefault();
    }
  });
});

// 设置应用用户模型ID（Windows）
if (process.platform === 'win32') {
  app.setAppUserModelId('com.quenching.modclient');
}

// 单实例应用
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当运行第二个实例时，将焦点放在主窗口上
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// 导出主窗口引用（用于其他模块）
export { mainWindow };
