import { reaxel, createReaxable } from 'reaxes';

// War3 路径检测和管理
export interface War3Installation {
  path: string;
  version: string;
  isReforged: boolean;
  isValid: boolean;
  executablePath: string;
}

// War3 相关文件路径
export const WAR3_FILES = {
  EXECUTABLE: 'Warcraft III.exe',
  EXECUTABLE_X86: 'x86_64/Warcraft III.exe',
  PREFERENCES: 'War3Preferences.txt',
  BLIZZARD_J: 'Scripts/blizzard.j',
  COMMON_J: 'Scripts/common.j',
  MAPS_FOLDER: 'Maps',
  CAMPAIGNS_FOLDER: 'Campaigns',
  REPLAYS_FOLDER: 'Replay',
  CUSTOM_KEYS: 'CustomKeys.txt'
} as const;

// 注册表路径
export const REGISTRY_PATHS = {
  WAR3_CLASSIC: 'HKEY_CURRENT_USER\\Software\\Blizzard Entertainment\\Warcraft III',
  WAR3_REFORGED: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\Warcraft III',
  BATTLE_NET: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\Battle.net'
} as const;

// War3 检测状态管理
export const reaxel_War3Detector = reaxel(() => {
  const { store, setState } = createReaxable({
    installations: [] as War3Installation[],
    currentInstallation: null as War3Installation | null,
    isScanning: false,
    lastScanTime: null as Date | null,
    isInWar3Directory: false
  });

  // 检测War3安装路径
  const detectWar3Installations = async (): Promise<War3Installation[]> => {
    setState({ isScanning: true });

    try {
      const installations: War3Installation[] = [];

      // 1. 从注册表检测
      const registryPaths = await detectFromRegistry();
      installations.push(...registryPaths);

      // 2. 从常见安装路径检测
      const commonPaths = await detectFromCommonPaths();
      installations.push(...commonPaths);

      // 3. 从当前目录检测
      const currentPath = await detectFromCurrentDirectory();
      if (currentPath) {
        installations.push(currentPath);
      }

      // 去重并验证
      const uniqueInstallations = deduplicateInstallations(installations);
      const validatedInstallations = await Promise.all(
        uniqueInstallations.map(validateInstallation)
      );

      const validInstallations = validatedInstallations.filter(inst => inst.isValid);

      setState({
        installations: validInstallations,
        lastScanTime: new Date(),
        isScanning: false
      });

      // 如果当前没有选中的安装，自动选择第一个
      if (!store.currentInstallation && validInstallations.length > 0) {
        setCurrentInstallation(validInstallations[0]);
      }

      return validInstallations;
    } catch (error) {
      console.error('Error detecting War3 installations:', error);
      setState({ isScanning: false });
      return [];
    }
  };

  // 从注册表检测
  const detectFromRegistry = async (): Promise<War3Installation[]> => {
    const installations: War3Installation[] = [];

    try {
      // 检测经典版
      const classicPath = await window.electronAPI?.readRegistry(
        REGISTRY_PATHS.WAR3_CLASSIC,
        'InstallPath'
      );
      if (classicPath) {
        installations.push({
          path: classicPath,
          version: 'Classic',
          isReforged: false,
          isValid: false,
          executablePath: `${classicPath}\\${WAR3_FILES.EXECUTABLE}`
        });
      }

      // 检测重制版
      const reforgedPath = await window.electronAPI?.readRegistry(
        REGISTRY_PATHS.WAR3_REFORGED,
        'InstallPath'
      );
      if (reforgedPath) {
        installations.push({
          path: reforgedPath,
          version: 'Reforged',
          isReforged: true,
          isValid: false,
          executablePath: `${reforgedPath}\\${WAR3_FILES.EXECUTABLE_X86}`
        });
      }
    } catch (error) {
      console.warn('Failed to read from registry:', error);
    }

    return installations;
  };

  // 从常见路径检测
  const detectFromCommonPaths = async (): Promise<War3Installation[]> => {
    const commonPaths = [
      'C:\\Program Files (x86)\\Warcraft III',
      'C:\\Program Files\\Warcraft III',
      'D:\\Program Files (x86)\\Warcraft III',
      'D:\\Program Files\\Warcraft III',
      'C:\\Games\\Warcraft III',
      'D:\\Games\\Warcraft III'
    ];

    const installations: War3Installation[] = [];

    for (const installPath of commonPaths) {
      try {
        const exists = await window.electronAPI?.pathExists(installPath);
        if (exists) {
          // 检查是否是重制版
          const reforgedExe = `${installPath}\\${WAR3_FILES.EXECUTABLE_X86}`;
          const classicExe = `${installPath}\\${WAR3_FILES.EXECUTABLE}`;

          const hasReforged = await window.electronAPI?.pathExists(reforgedExe);
          const hasClassic = await window.electronAPI?.pathExists(classicExe);

          if (hasReforged) {
            installations.push({
              path: installPath,
              version: 'Reforged',
              isReforged: true,
              isValid: false,
              executablePath: reforgedExe
            });
          } else if (hasClassic) {
            installations.push({
              path: installPath,
              version: 'Classic',
              isReforged: false,
              isValid: false,
              executablePath: classicExe
            });
          }
        }
      } catch (error) {
        // 忽略单个路径的错误
      }
    }

    return installations;
  };

  // 从当前目录检测
  const detectFromCurrentDirectory = async (): Promise<War3Installation | null> => {
    try {
      const currentDir = await window.electronAPI?.getCurrentDirectory();
      if (!currentDir) return null;

      const reforgedExe = `${currentDir}\\${WAR3_FILES.EXECUTABLE_X86}`;
      const classicExe = `${currentDir}\\${WAR3_FILES.EXECUTABLE}`;

      const hasReforged = await window.electronAPI?.pathExists(reforgedExe);
      const hasClassic = await window.electronAPI?.pathExists(classicExe);

      if (hasReforged) {
        setState({ isInWar3Directory: true });
        return {
          path: currentDir,
          version: 'Reforged (Current)',
          isReforged: true,
          isValid: false,
          executablePath: reforgedExe
        };
      } else if (hasClassic) {
        setState({ isInWar3Directory: true });
        return {
          path: currentDir,
          version: 'Classic (Current)',
          isReforged: false,
          isValid: false,
          executablePath: classicExe
        };
      }

      setState({ isInWar3Directory: false });
      return null;
    } catch (error) {
      console.error('Error detecting current directory:', error);
      return null;
    }
  };

  // 验证安装
  const validateInstallation = async (installation: War3Installation): Promise<War3Installation> => {
    try {
      // 检查可执行文件
      const exeExists = await window.electronAPI?.pathExists(installation.executablePath);
      if (!exeExists) {
        return { ...installation, isValid: false };
      }

      // 检查关键文件
      const preferencesPath = `${installation.path}\\${WAR3_FILES.PREFERENCES}`;
      const blizzardJPath = `${installation.path}\\${WAR3_FILES.BLIZZARD_J}`;

      const hasPreferences = await window.electronAPI?.pathExists(preferencesPath);
      const hasBlizzardJ = await window.electronAPI?.pathExists(blizzardJPath);

      // 至少要有可执行文件
      const isValid = exeExists;

      return { ...installation, isValid };
    } catch (error) {
      console.error('Error validating installation:', error);
      return { ...installation, isValid: false };
    }
  };

  // 去重安装
  const deduplicateInstallations = (installations: War3Installation[]): War3Installation[] => {
    const seen = new Set<string>();
    return installations.filter(inst => {
      const key = inst.path.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // 设置当前安装
  const setCurrentInstallation = (installation: War3Installation | null) => {
    setState({ currentInstallation: installation });

    // 保存到本地存储
    if (installation) {
      localStorage.setItem('quenching-war3-path', installation.path);
    }
  };

  // 启动游戏
  const launchGame = async (installation?: War3Installation) => {
    const targetInstallation = installation || store.currentInstallation;
    if (!targetInstallation || !targetInstallation.isValid) {
      throw new Error('No valid War3 installation selected');
    }

    try {
      await window.electronAPI?.launchExecutable(targetInstallation.executablePath);
    } catch (error) {
      console.error('Failed to launch game:', error);
      throw error;
    }
  };

  // 初始化时检测
  detectWar3Installations();

  // 尝试从本地存储恢复路径
  const savedPath = localStorage.getItem('quenching-war3-path');
  if (savedPath) {
    // 异步验证保存的路径
    detectFromCurrentDirectory().then(current => {
      if (current && current.path === savedPath) {
        setCurrentInstallation(current);
      }
    });
  }

  return {
    store,
    detectWar3Installations,
    setCurrentInstallation,
    launchGame,
    validateInstallation
  };
});

// React Hook
export const useWar3Detector = () => {
  const detector = reaxel_War3Detector();
  return {
    installations: detector.store.installations,
    currentInstallation: detector.store.currentInstallation,
    isScanning: detector.store.isScanning,
    isInWar3Directory: detector.store.isInWar3Directory,
    lastScanTime: detector.store.lastScanTime,
    detectInstallations: detector.detectWar3Installations,
    setCurrentInstallation: detector.setCurrentInstallation,
    launchGame: detector.launchGame
  };
};
