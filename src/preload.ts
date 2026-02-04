import { contextBridge, ipcRenderer, IpcRenderer } from "electron";

contextBridge.exposeInMainWorld('versions', {
  get node() {
    return process.versions.node;
  },
  get chrome() {
    return process.versions.chrome;
  },
  get electron() {
    return process.versions.electron;
  },

});

contextBridge.exposeInMainWorld('IPC', {
  send(channel, ...args) {
    ipcRenderer.send(channel, ...args);
  },
  on(channel, listener) {
    return ipcRenderer.on(channel, listener);
  },
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
  },

});

// 暴露完整的 electronAPI
const electronAPI = {
  // 文件操作
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  copyFile: (sourcePath: string, targetPath: string) => ipcRenderer.invoke('file:copy', sourcePath, targetPath),
  moveFile: (sourcePath: string, targetPath: string) => ipcRenderer.invoke('file:move', sourcePath, targetPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
  pathExists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
  getCurrentDirectory: () => ipcRenderer.invoke('file:getCurrentDirectory'),

  // 游戏启动
  launchGame: (executablePath?: string) => ipcRenderer.invoke('game:launch', executablePath),
  selectGamePath: () => ipcRenderer.invoke('game:select-path'),
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  applyTheme: (themeId: string) => ipcRenderer.invoke('theme:apply', themeId),

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

  // 系统操作
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('shell:showItemInFolder', fullPath),
  executeCommand: (command: string) => ipcRenderer.invoke('system:exec', command),

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

  // 注册表操作
  readRegistry: (keyPath: string, valueName: string) => ipcRenderer.invoke('registry:read', keyPath, valueName),
  writeRegistry: (keyPath: string, valueName: string, value: string, type?: string) => ipcRenderer.invoke('registry:write', keyPath, valueName, value, type),
  deleteRegistry: (keyPath: string, valueName?: string) => ipcRenderer.invoke('registry:delete', keyPath, valueName),
  registryExists: (keyPath: string, valueName?: string) => ipcRenderer.invoke('registry:exists', keyPath, valueName),
  listRegistry: (keyPath: string) => ipcRenderer.invoke('registry:list', keyPath),
  backupRegistry: (keyPath: string, backupPath: string) => ipcRenderer.invoke('registry:backup', keyPath, backupPath),
  restoreRegistry: (backupPath: string) => ipcRenderer.invoke('registry:restore', backupPath),

  // 文件扫描和解压
  scanDirectory: (dirPath: string, extensions: string[]) => ipcRenderer.invoke('file:scanDirectory', dirPath, extensions),
  extractArchive: (archivePath: string, targetPath: string) => ipcRenderer.invoke('file:extractArchive', archivePath, targetPath),
  copyFiles: (sourcePattern: string, targetDir: string) => ipcRenderer.invoke('file:copyFiles', sourcePattern, targetDir),
  extractZip: (zipPath: string, extractPath: string) => ipcRenderer.invoke('file:extractZip', zipPath, extractPath),
  createZip: (sourceDir: string, outputPath: string) => ipcRenderer.invoke('file:createZip', sourceDir, outputPath),
  launchExecutable: (executablePath: string, args?: string[]) => ipcRenderer.invoke('file:launchExecutable', executablePath, args),
  downloadFile: (url: string, outputPath: string) => ipcRenderer.invoke('file:download', url, outputPath),
  getFileStats: (filePath: string) => ipcRenderer.invoke('file:getStats', filePath),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('file:readDir', dirPath),

  // 涂装系统
  applySkin: (unitId: string, changes: any[]) => ipcRenderer.invoke('skin:apply', unitId, changes),
  applyBatchSkin: (batchChanges: any[]) => ipcRenderer.invoke('skin:apply-batch', batchChanges),

  // 新闻操作
  fetchNews: (lang?: 'cn' | 'en') => ipcRenderer.invoke('news:fetch', lang),
  // 版本获取（远程）
  fetchVersion: () => ipcRenderer.invoke('version:fetch'),
  // 树木设置
  updateTreeSettings: (war3Path: string, treeMode: string) => ipcRenderer.invoke('tree:update-settings', war3Path, treeMode),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
