import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../types/electron-api';

// 暴露安全的API给渲染进程
const electronAPI: ElectronAPI = {
  // 文件操作
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  copyFile: (sourcePath: string, targetPath: string) => ipcRenderer.invoke('file:copy', sourcePath, targetPath),
  moveFile: (sourcePath: string, targetPath: string) => ipcRenderer.invoke('file:move', sourcePath, targetPath),
  moveDirectory: (sourceDir: string, targetDir: string) => ipcRenderer.invoke('file:move-directory', sourceDir, targetDir),
  deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
  pathExists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
  getCurrentDirectory: () => ipcRenderer.invoke('file:getCurrentDirectory'),

  // 游戏启动
  launchGame: (executablePath?: string) => ipcRenderer.invoke('game:launch', executablePath),
  selectGamePath: () => ipcRenderer.invoke('game:select-path'),
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  applyTheme: (themeId: string) => ipcRenderer.invoke('theme:apply', themeId),
  updateMdlLighting: (war3Path: string, lightingMode: string) => ipcRenderer.invoke('mdl:update-lighting', war3Path, lightingMode),
  updateUISettings: (war3Path: string, uiMode: string) => ipcRenderer.invoke('ui:update-settings', war3Path, uiMode),
  updateTerrainSettings: (war3Path: string, terrainMode: string) => ipcRenderer.invoke('terrain:update-settings', war3Path, terrainMode),
  updateTreeSettings: (war3Path: string, treeMode: string) => ipcRenderer.invoke('tree:update-settings', war3Path, treeMode),
  updateWaterSettings: (war3Path: string, waterMode: string) => ipcRenderer.invoke('water:update-settings', war3Path, waterMode),
  updateFoliageSettings: (war3Path: string, enabled: boolean) => ipcRenderer.invoke('foliage:update-settings', war3Path, enabled),
  updateObjectShader: (war3Path: string, enabled: boolean) => ipcRenderer.invoke('shader:update-object-shader', war3Path, enabled),
  updatePostProcessing: (war3Path: string, enabled: boolean) => ipcRenderer.invoke('shader:update-post-processing', war3Path, enabled),
  updateEnvRenderSettings: (war3Path: string, enabled: boolean) => ipcRenderer.invoke('script:update-env-render', war3Path, enabled),
  updateGlowSettings: (war3Path: string, enabled: boolean) => ipcRenderer.invoke('glow:update-settings', war3Path, enabled),
  updateHalfPortrait: (war3Path: string, visionModPath: string, enabled: boolean) => ipcRenderer.invoke('vision:update-half-portrait', war3Path, visionModPath, enabled),
  updateModelEnhance: (war3Path: string, visionModPath: string, enabled: boolean) => ipcRenderer.invoke('vision:update-model-enhance', war3Path, visionModPath, enabled),
  applySkin: (unitId: string, changes: any[]) => ipcRenderer.invoke('skin:apply', unitId, changes),
  applyBatchSkin: (batchChanges: any[]) => ipcRenderer.invoke('skin:apply-batch', batchChanges),
  selectModelFile: () => ipcRenderer.invoke('file:select-model'),
  selectFile: (options: { title?: string, filters?: { name: string, extensions: string[] }[] }) => ipcRenderer.invoke('file:select', options),
  selectDirectory: (title?: string) => ipcRenderer.invoke('file:select-directory', title),

  // 新闻
  fetchNews: (lang?: 'cn' | 'en') => ipcRenderer.invoke('news:fetch', lang),
  // 版本
  fetchVersion: () => ipcRenderer.invoke('version:fetch'),

  // Mod Actions系统操作
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('shell:showItemInFolder', fullPath),

  // 文件扫描和解压
  readDirectory: (dirPath: string) => ipcRenderer.invoke('file:readDir', dirPath),
  // extractArchive 已从 ElectronAPI 类型中移除，使用 extractZip 代替
  copyFiles: (sourcePattern: string, targetDir: string) => ipcRenderer.invoke('file:copyFiles', sourcePattern, targetDir),
  extractZip: (zipPath: string, extractPath: string) => ipcRenderer.invoke('file:extractZip', zipPath, extractPath),
  createZip: (sourceDir: string, outputPath: string) => ipcRenderer.invoke('file:createZip', sourceDir, outputPath),
  launchExecutable: (executablePath: string, args?: string[]) => ipcRenderer.invoke('file:launchExecutable', executablePath, args),
  downloadFile: (url: string, outputPath: string) => ipcRenderer.invoke('file:download', url, outputPath),
  getFileStats: (filePath: string) => ipcRenderer.invoke('file:getStats', filePath),
  // 已存在 readDirectory，移除重复定义

  // 注册表操作
  readRegistry: (keyPath: string, valueName: string) => ipcRenderer.invoke('registry:read', keyPath, valueName),
  writeRegistry: (keyPath: string, valueName: string, value: string, type?: string) => ipcRenderer.invoke('registry:write', keyPath, valueName, value, type),
  deleteRegistry: (keyPath: string, valueName?: string) => ipcRenderer.invoke('registry:delete', keyPath, valueName),
  registryExists: (keyPath: string, valueName?: string) => ipcRenderer.invoke('registry:exists', keyPath, valueName),
  listRegistry: (keyPath: string) => ipcRenderer.invoke('registry:list', keyPath),
  backupRegistry: (keyPath: string, backupPath: string) => ipcRenderer.invoke('registry:backup', keyPath, backupPath),
  restoreRegistry: (backupPath: string) => ipcRenderer.invoke('registry:restore', backupPath),

  // 窗口操作
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', flag),
  getWindowState: () => ipcRenderer.invoke('window:getState'),
  setWindowSize: (width: number, height: number) => ipcRenderer.invoke('window:setSize', width, height),
  setWindowPosition: (x: number, y: number) => ipcRenderer.invoke('window:setPosition', x, y),
  centerWindow: () => ipcRenderer.invoke('window:center'),

  // 应用操作
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAppPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  relaunchApp: () => ipcRenderer.invoke('app:relaunch'),
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  getDisplays: () => ipcRenderer.invoke('system:getDisplays'),
  setWindowIcon: (iconPath: string) => ipcRenderer.invoke('window:setIcon', iconPath),
  setWindowTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
  flashFrame: (flag: boolean) => ipcRenderer.invoke('window:flashFrame', flag),
  setProgressBar: (progress: number) => ipcRenderer.invoke('window:setProgressBar', progress),
  setBadgeCount: (count: number) => ipcRenderer.invoke('app:setBadgeCount', count),

  // 系统操作
  executeCommand: (command: string) => ipcRenderer.invoke('system:exec', command),

  getFullPackageStatus: (war3Path?: string) => ipcRenderer.invoke('mod:get-full-package-status', war3Path),
  installFullPackage: (zipPath: string) => ipcRenderer.invoke('mod:install-full-package', zipPath),
  syncAssets: () => ipcRenderer.invoke('mod:sync-assets')
};

// 通过contextBridge安全地暴露API
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 暴露一些有用的常量
contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux'
});

// 暴露版本信息
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron
});

// 监听主进程消息
ipcRenderer.on('show-about', () => {
  // 可以在这里触发渲染进程的事件
  window.dispatchEvent(new CustomEvent('electron-show-about'));
});

ipcRenderer.on('mod:install-progress', (event, data) => {
  window.dispatchEvent(new CustomEvent('mod-install-progress', { detail: data }));
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in preload:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in preload:', reason, promise);
});
