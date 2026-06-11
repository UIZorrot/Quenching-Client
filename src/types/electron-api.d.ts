// Electron API类型定义

interface ElectronAPI {
  // 文件操作
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<boolean>;
  moveFile: (sourcePath: string, targetPath: string) => Promise<boolean>;
  moveDirectory: (sourceDir: string, targetDir: string) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<boolean>;
  pathExists: (filePath: string) => Promise<boolean>;
  getCurrentDirectory: () => Promise<string>;
  copyFiles: (sourcePattern: string, targetDir: string) => Promise<boolean>;
  extractZip: (zipPath: string, extractPath: string) => Promise<boolean>;
  createZip: (sourceDir: string, outputPath: string) => Promise<boolean>;
  launchExecutable: (executablePath: string, args?: string[]) => Promise<boolean>;
  downloadFile: (url: string, outputPath: string) => Promise<boolean>;
  getFileStats: (filePath: string) => Promise<FileStats>;
  readDirectory: (dirPath: string) => Promise<DirectoryItem[]>;

  // 注册表操作
  readRegistry: (keyPath: string, valueName: string) => Promise<string | null>;
  writeRegistry: (keyPath: string, valueName: string, value: string, type?: string) => Promise<boolean>;
  deleteRegistry: (keyPath: string, valueName?: string) => Promise<boolean>;
  registryExists: (keyPath: string, valueName?: string) => Promise<boolean>;
  listRegistry: (keyPath: string) => Promise<RegistryValue[]>;
  backupRegistry: (keyPath: string, backupPath: string) => Promise<boolean>;
  restoreRegistry: (backupPath: string) => Promise<boolean>;

  // 窗口操作
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
  setAlwaysOnTop: (flag: boolean) => Promise<void>;
  getWindowState: () => Promise<WindowState>;
  setWindowSize: (width: number, height: number) => Promise<void>;
  setWindowPosition: (x: number, y: number) => Promise<void>;
  centerWindow: () => Promise<void>;
  openExternal: (url: string) => Promise<boolean>;
  showItemInFolder: (fullPath: string) => Promise<void>;

  // 应用操作
  getAppVersion: () => Promise<string>;
  getAppPath: (name: string) => Promise<string>;
  quitApp: () => Promise<void>;
  relaunchApp: () => Promise<void>;
  getSystemInfo: () => Promise<SystemInfo>;
  getDisplays: () => Promise<Display[]>;
  setWindowIcon: (iconPath: string) => Promise<void>;
  setWindowTitle: (title: string) => Promise<void>;
  flashFrame: (flag: boolean) => Promise<void>;
  setProgressBar: (progress: number) => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;

  // 系统操作
  executeCommand: (command: string) => Promise<{ stdout: string; stderr: string }>;

  // 游戏启动
  launchGame: (executablePath?: string) => Promise<boolean>;
  launchMap: (mapPath: string, difficulty: number) => Promise<boolean>;
  extractCampaignW3n: (w3nPath: string) => Promise<{
    success: boolean;
    outputDir: string;
    maps: string[];
  }>;
  listInstalledCampaigns: () => Promise<{
    campaigns: Array<{
      id: string;
      path: string;
      mapCount: number;
      title?: string;
      difficulty?: string;
      author?: string;
      description?: string;
      maps?: Array<{
        path: string;
        chapter?: string;
        title?: string;
      }>;
    }>;
  }>;
  selectGamePath: () => Promise<string | null>;
  getConfig: (key: string) => Promise<any>;
  setConfig: (key: string, value: any) => Promise<void>;
  applyTheme: (themeId: string) => Promise<boolean>;
  updateMdlLighting: (war3Path: string, lightingMode: string, lightingBrightness?: number) => Promise<boolean>;
  updateUISettings: (war3Path: string, uiMode: string) => Promise<boolean>;
  updateTerrainSettings: (war3Path: string, terrainMode: string, waterMode?: string) => Promise<boolean>;
  updateTreeSettings: (war3Path: string, treeMode: string) => Promise<boolean>;
  updateWaterSettings: (war3Path: string, waterMode: string) => Promise<boolean>;
  updateFoliageSettings: (war3Path: string, enabled: boolean) => Promise<boolean>;
  updateObjectShader: (war3Path: string, enabled: boolean) => Promise<boolean>;
  updatePostProcessing: (war3Path: string, enabled: boolean) => Promise<boolean>;
  updateLegacyWar3Shader: (war3Path: string, enabled: boolean) => Promise<boolean>;
  updateIntelAmdShaderFix: (war3Path: string, enabled: boolean) => Promise<boolean>;
  updateEnvRenderSettings: (war3Path: string, enabled: boolean) => Promise<boolean>;
  updateGlowSettings: (war3Path: string, enabled: boolean) => Promise<boolean>;
  updateHalfPortrait: (war3Path: string, visionModPath: string, enabled: boolean) => Promise<boolean>;
  updateModelEnhance: (war3Path: string, visionModPath: string, enabled: boolean) => Promise<boolean>;

  getFullPackageStatus: (war3Path?: string) => Promise<boolean>;
  installFullPackage: (zipPath: string) => Promise<FullPackageInstallResult>;
  syncAssets: () => Promise<void>;

  // Mod Management
  deleteMod: (war3Path: string) => Promise<{ success: boolean }>;
  resetRenderingComponents: (war3Path: string) => Promise<{ success: boolean }>;
  toggleClassicMode: (war3Path: string, enable: boolean) => Promise<{ success: boolean; classicMode: boolean }>;

  // Classic Mode Skin System
  applyClassicSkin: (war3Path: string, change: {
    heroId: string;
    skinData: {
      file?: string;
      modelScale?: string;
      modelScaleSD?: string;
      art?: string;
      unitSound?: string;
    };
  }) => Promise<{ success: boolean }>;
  getClassicSupportedHeroes: (war3Path: string) => Promise<string[]>;



  // 涂装系统
  applySkin: (unitId: string, changes: any[]) => Promise<boolean>;
  applyBatchSkin: (batchChanges: any[]) => Promise<boolean>;
  disableSkins: () => Promise<boolean>;
  isSkinEnabled: () => Promise<boolean>;
  selectModelFile: () => Promise<string | null>;
  selectFile: (options: { title?: string, filters?: { name: string, extensions: string[] }[] }) => Promise<string | null>;
  selectDirectory: (title?: string) => Promise<string | null>;

  // 新闻操作
  fetchNews: (lang?: 'cn' | 'en') => Promise<any[]>;
  fetchVersion: () => Promise<string>;
}

interface FileStats {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  mtime: Date;
  ctime: Date;
}

interface DirectoryItem {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
}

interface RegistryValue {
  name: string;
  type: string;
  value: string;
}

interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isVisible: boolean;
  isFocused: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  totalMemory: number;
  freeMemory: number;
  cpus: Array<{
    model: string;
    speed: number;
    times: {
      user: number;
      nice: number;
      sys: number;
      idle: number;
      irq: number;
    };
  }>;
  hostname: string;
  userInfo: {
    uid: number;
    gid: number;
    username: string;
    homedir: string;
    shell: string;
  };
}

interface Display {
  id: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor: number;
  rotation: number;
  internal: boolean;
}

interface FullPackageStatus {
  hasZip: boolean;
  alreadyInstalled: boolean;
  zipPath: string | null;
  installTarget: string | null;
}

interface FullPackageInstallResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

// 全局类型声明

interface Window {
  electronAPI: ElectronAPI;
}
