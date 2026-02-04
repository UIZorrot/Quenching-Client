import { useState, useEffect } from 'react';
import { reaxel, createReaxable } from 'reaxes';

// War3安装信息接口
export interface War3Installation {
  path: string;
  version: string;
  isReforged: boolean;
  isValid: boolean;
  executablePath: string;
}

// War3检测状态管理
export const reaxel_War3Detector = reaxel(() => {
  const { store, setState } = createReaxable({
    installations: [] as War3Installation[],
    currentInstallation: null as War3Installation | null,
    isDetecting: false,
    isInWar3Directory: false,
    currentDirectory: ''
  });

  // 检测War3安装
  const detectInstallations = async () => {
    setState({ isDetecting: true });

    try {
      const installations: War3Installation[] = [];

      // 0. 优先从 Config 获取保存的路径
      if (window.electronAPI?.getConfig) {
        const savedPath = await window.electronAPI.getConfig('war3Path');
        if (savedPath) {
          const installation = await analyzeWar3Directory(savedPath);
          if (installation) {
            installations.push(installation);
          }
        }
      }

      // 1. 获取当前目录
      const currentDir = await window.electronAPI?.getCurrentDirectory();
      setState({ currentDirectory: currentDir || '' });

      // 检查当前目录是否是War3目录
      const isInWar3Dir = await checkIsWar3Directory(currentDir);
      setState({ isInWar3Directory: isInWar3Dir });

      // 如果当前目录是War3目录，添加到列表
      if (isInWar3Dir) {
        const installation = await analyzeWar3Directory(currentDir);
        if (installation && !installations.find(inst => inst.path === installation.path)) {
          installations.push(installation);
        }
      }

      // 检测常见的War3安装路径
      const commonPaths = [
        'C:\\Program Files (x86)\\Warcraft III',
        'C:\\Program Files\\Warcraft III',
        'D:\\Warcraft III',
        'E:\\Warcraft III',
        'C:\\Games\\Warcraft III',
        'D:\\Games\\Warcraft III'
      ];

      for (const path of commonPaths) {
        if (path !== currentDir) {
          const isValid = await checkIsWar3Directory(path);
          if (isValid) {
            const installation = await analyzeWar3Directory(path);
            if (installation && !installations.find(inst => inst.path === installation.path)) {
              installations.push(installation);
            }
          }
        }
      }

      setState({
        installations,
        currentInstallation: installations.length > 0 ? installations[0] : null
      });

    } catch (error) {
      console.error('Failed to detect War3 installations:', error);
    } finally {
      setState({ isDetecting: false });
    }
  };

  // 检查目录是否是War3目录
  const checkIsWar3Directory = async (dirPath: string): Promise<boolean> => {
    if (!dirPath) return false;

    try {
      // 检查关键文件是否存在
      const keyFiles = [
        'Warcraft III.exe',
        'Warcraft III Launcher.exe', // 战网启动器
        'x86_64/Warcraft III.exe', // 重制版路径
        '_retail_/x86_64/Warcraft III.exe', // 战网重制版路径
        'War3.exe', // 经典版
        'game.dll',
        'Warcraft III Launcher.exe' // 用户提到的文件
      ];

      for (const file of keyFiles) {
        const fullPath = `${dirPath}/${file}`;
        const exists = await window.electronAPI?.pathExists(fullPath);
        if (exists) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  // 分析War3目录信息
  const analyzeWar3Directory = async (dirPath: string): Promise<War3Installation | null> => {
    try {
      // 检查各种可能的可执行文件路径
      const paths = [
        { path: `${dirPath}/_retail_/x86_64/Warcraft III.exe`, reforged: true, version: 'Reforged (Retail)' },
        { path: `${dirPath}/x86_64/Warcraft III.exe`, reforged: true, version: 'Reforged' },
        { path: `${dirPath}/Warcraft III.exe`, reforged: false, version: 'Classic/Reforged' },
        { path: `${dirPath}/Warcraft III Launcher.exe`, reforged: true, version: 'Battle.net Launcher' },
        { path: `${dirPath}/War3.exe`, reforged: false, version: 'Classic' }
      ];

      let executablePath = '';
      let isReforged = false;
      let version = 'Unknown';

      for (const p of paths) {
        if (await window.electronAPI?.pathExists(p.path)) {
          executablePath = p.path;
          isReforged = p.reforged;
          version = p.version;
          break;
        }
      }

      if (!executablePath) {
        return null;
      }

      return {
        path: dirPath,
        version,
        isReforged,
        isValid: true,
        executablePath
      };
    } catch (error) {
      console.error('Failed to analyze War3 directory:', error);
      return null;
    }
  };

  // 设置当前安装
  const setCurrentInstallation = (installation: War3Installation | null) => {
    setState({ currentInstallation: installation });
  };

  // 启动游戏
  const launchGame = async (installation?: War3Installation) => {
    const targetInstallation = installation || store.currentInstallation;
    if (!targetInstallation) {
      throw new Error('未选择War3安装');
    }

    try {
      await window.electronAPI?.launchGame();
    } catch (error) {
      throw new Error(`游戏启动失败: ${error.message}`);
    }
  };

  // 初始化时自动检测
  detectInstallations();

  const statics = {};

  return Object.assign(() => ({
    store,
    detectInstallations,
    setCurrentInstallation,
    launchGame,
    checkIsWar3Directory,
    analyzeWar3Directory
  }), {
    store,
    setState,
    detectInstallations,
    setCurrentInstallation,
    launchGame,
    checkIsWar3Directory,
    analyzeWar3Directory,
    statics
  });
});

// React Hook
export const useWar3Detector = () => {
  // 获取reaxel实例
  const detector = reaxel_War3Detector();

  return {
    installations: detector.store.installations,
    currentInstallation: detector.store.currentInstallation,
    isDetecting: detector.store.isDetecting,
    isInWar3Directory: detector.store.isInWar3Directory,
    currentDirectory: detector.store.currentDirectory,
    detectInstallations: detector.detectInstallations,
    setCurrentInstallation: detector.setCurrentInstallation,
    launchGame: detector.launchGame
  };
};
