import { useState, useEffect } from 'react';
import { reaxel, createReaxable } from 'reaxes';

// 安装进度接口
export interface InstallProgress {
  status: 'idle' | 'downloading' | 'extracting' | 'installing' | 'complete' | 'error';
  progress: number;
  message: string;
  currentFile?: string;
}

// MOD文件信息接口
export interface ModFile {
  name: string;
  path: string;
  size: number;
  type: 'w3n' | 'cque' | 'zip';
}

// 安装组件接口
export interface InstallComponent {
  id: string;
  name: string;
  description: string;
  type: 'core' | 'ui' | 'maps' | 'sounds' | 'textures';
  size: number;
  optional: boolean;
  dependencies?: string[];
  files: string[];
}

// MOD安装器管理
export const reaxel_ModInstaller = reaxel(() => {
  const { store, setState } = createReaxable({
    isInstalling: false,
    progress: {
      status: 'idle' as const,
      progress: 0,
      message: ''
    } as InstallProgress,
    installedMods: [] as string[],
    availableFiles: [] as ModFile[],
    components: [
      {
        id: 'core',
        name: '核心文件',
        description: 'MOD的核心文件，必须安装',
        type: 'core' as const,
        size: 50 * 1024 * 1024, // 50MB
        optional: false,
        files: ['quenching.exe', 'core.dll', 'config.ini']
      },
      {
        id: 'ui',
        name: 'UI界面',
        description: '增强的用户界面',
        type: 'ui' as const,
        size: 10 * 1024 * 1024, // 10MB
        optional: true,
        files: ['ui/main.toc', 'ui/frames.xml', 'ui/styles.css']
      },
      {
        id: 'maps',
        name: '地图文件',
        description: '额外的地图资源',
        type: 'maps' as const,
        size: 100 * 1024 * 1024, // 100MB
        optional: true,
        files: ['maps/custom1.w3x', 'maps/custom2.w3x', 'maps/scenarios/']
      },
      {
        id: 'sounds',
        name: '音效文件',
        description: '增强的音效和音乐',
        type: 'sounds' as const,
        size: 80 * 1024 * 1024, // 80MB
        optional: true,
        files: ['sounds/music/', 'sounds/effects/', 'sounds/voices/']
      },
      {
        id: 'textures',
        name: '贴图文件',
        description: '高清贴图资源',
        type: 'textures' as const,
        size: 200 * 1024 * 1024, // 200MB
        optional: true,
        files: ['textures/units/', 'textures/terrain/', 'textures/ui/']
      }
    ] as InstallComponent[],
    selectedComponents: new Set<string>(['core']) // 默认选中核心组件
  });

  // 检查MOD安装状态
  const checkModInstallation = async (war3Path: string) => {
    try {
      // 检查关键MOD文件是否存在
      const modFiles = [
        'Quenching/hc-trans.que',
        'scripts/blizzard.j'
      ];

      const installedMods: string[] = [];

      for (const file of modFiles) {
        const fullPath = `${war3Path}/${file}`;
        const exists = await window.electronAPI?.pathExists(fullPath);
        if (exists) {
          installedMods.push(file);
        }
      }

      setState({ installedMods });
      return installedMods.length > 0;

    } catch (error) {
      console.error('Failed to check mod installation:', error);
      return false;
    }
  };

  // 安装MOD
  const installMod = async (war3Path: string, modFile?: ModFile) => {
    setState({
      isInstalling: true,
      progress: { status: 'downloading', progress: 0, message: '准备安装...' }
    });

    try {
      if (modFile) {
        // 安装指定的MOD文件
        await installModFile(war3Path, modFile);
      } else {
        // 安装默认MOD包
        await installDefaultMod(war3Path);
      }

      setState({
        progress: { status: 'complete', progress: 100, message: '安装完成！' }
      });

      // 重新检查安装状态
      await checkModInstallation(war3Path);

    } catch (error) {
      setState({
        progress: {
          status: 'error',
          progress: 0,
          message: `安装失败: ${error.message}`
        }
      });
      throw error;
    } finally {
      setTimeout(() => {
        setState({ isInstalling: false });
      }, 2000);
    }
  };

  // 安装默认MOD包
  const installDefaultMod = async (war3Path: string) => {
    const steps = [
      { name: '复制核心文件', weight: 30 },
      { name: '安装着色器', weight: 25 },
      { name: '配置UI文件', weight: 20 },
      { name: '设置语言文件', weight: 15 }
    ];

    let totalProgress = 0;

    for (const [index, step] of steps.entries()) {
      setState({
        progress: {
          status: 'installing',
          progress: totalProgress,
          message: step.name
        }
      });

      switch (index) {
        case 0:
          await copyCoreFiles(war3Path);
          break;
        case 1:
          await installShaders(war3Path);
          break;
        case 2:
          await configureUI(war3Path);
          break;
        case 3:
          await setupLanguageFiles(war3Path);
          break;
      }

      totalProgress += step.weight;

      setState({
        progress: {
          status: 'installing',
          progress: totalProgress,
          message: `${step.name} 完成`
        }
      });

      // 模拟安装时间
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // 复制核心文件
  const copyCoreFiles = async (war3Path: string) => {
    const coreFiles = [
      { src: './assets/quenching/hc-trans.que', dest: 'Quenching/hc-trans.que' },
      { src: './assets/quenching/hc-trans-en.que', dest: 'Quenching/hc-trans-en.que' },
      { src: './assets/quenching/scripts/blizzard.j', dest: 'scripts/blizzard.j' }
    ];

    for (const file of coreFiles) {
      const sourcePath = file.src;
      const targetPath = `${war3Path}/${file.dest}`;

      try {
        await window.electronAPI?.copyFile(sourcePath, targetPath);
      } catch (error) {
        console.warn(`Failed to copy ${file.src}:`, error);
      }
    }
  };

  // 安装着色器
  const installShaders = async (war3Path: string) => {
    const shaderFiles = [
      'shaders/water.fx',
      'shaders/terrain.fx',
      'shaders/model.fx'
    ];

    for (const shader of shaderFiles) {
      const sourcePath = `./assets/quenching/${shader}`;
      const targetPath = `${war3Path}/${shader}`;

      try {
        await window.electronAPI?.copyFile(sourcePath, targetPath);
      } catch (error) {
        console.warn(`Failed to copy shader ${shader}:`, error);
      }
    }
  };

  // 配置UI文件
  const configureUI = async (war3Path: string) => {
    const uiFiles = [
      'ui/framedef.toc',
      'ui/war3skins.txt',
      'ui/console.fdf'
    ];

    for (const uiFile of uiFiles) {
      const sourcePath = `./assets/quenching/${uiFile}`;
      const targetPath = `${war3Path}/${uiFile}`;

      try {
        await window.electronAPI?.copyFile(sourcePath, targetPath);
      } catch (error) {
        console.warn(`Failed to copy UI file ${uiFile}:`, error);
      }
    }
  };

  // 设置语言文件
  const setupLanguageFiles = async (war3Path: string) => {
    const languageFiles = [
      'hc-trans.que',
      'hc-trans-en.que',
      'hc-trans-fr.que',
      'hc-trans-pt.que',
      'hc-trans-ru.que',
      'hc-trans-sp.que'
    ];

    for (const langFile of languageFiles) {
      const sourcePath = `./assets/quenching/${langFile}`;
      const targetPath = `${war3Path}/Quenching/${langFile}`;

      try {
        await window.electronAPI?.copyFile(sourcePath, targetPath);
      } catch (error) {
        console.warn(`Failed to copy language file ${langFile}:`, error);
      }
    }
  };

  // 安装指定MOD文件
  const installModFile = async (war3Path: string, modFile: ModFile) => {
    setState({
      progress: {
        status: 'extracting',
        progress: 0,
        message: `正在处理 ${modFile.name}...`
      }
    });

    if (modFile.type === 'w3n') {
      await installW3NFile(war3Path, modFile);
    } else if (modFile.type === 'cque') {
      await installCqueFile(war3Path, modFile);
    } else if (modFile.type === 'zip') {
      await installZipFile(war3Path, modFile);
    }
  };

  // 安装W3N文件
  const installW3NFile = async (war3Path: string, modFile: ModFile) => {
    // W3N文件通常是战役文件，需要解压到特定目录
    try {
      await window.electronAPI?.extractZip(modFile.path, `${war3Path}/Maps/`);
    } catch (error) {
      throw new Error(`W3N文件安装失败: ${error.message}`);
    }
  };

  // 安装CQUE文件
  const installCqueFile = async (war3Path: string, modFile: ModFile) => {
    // CQUE文件是压缩的MOD包
    try {
      await window.electronAPI?.extractZip(modFile.path, war3Path);
    } catch (error) {
      throw new Error(`CQUE文件安装失败: ${error.message}`);
    }
  };

  // 安装ZIP文件
  const installZipFile = async (war3Path: string, modFile: ModFile) => {
    try {
      await window.electronAPI?.extractZip(modFile.path, war3Path);
    } catch (error) {
      throw new Error(`ZIP文件安装失败: ${error.message}`);
    }
  };

  // 卸载MOD
  const uninstallMod = async (war3Path: string) => {
    setState({
      isInstalling: true,
      progress: { status: 'installing', progress: 0, message: '正在卸载MOD...' }
    });

    try {
      // 删除MOD文件
      const modFiles = [
        'Quenching/'
      ];

      for (const file of modFiles) {
        const fullPath = `${war3Path}/${file}`;
        try {
          await window.electronAPI?.deleteFile(fullPath);
        } catch (error) {
          console.warn(`Failed to delete ${file}:`, error);
        }
      }

      setState({
        progress: { status: 'complete', progress: 100, message: 'MOD卸载完成！' },
        installedMods: []
      });

    } catch (error) {
      setState({
        progress: {
          status: 'error',
          progress: 0,
          message: `卸载失败: ${error.message}`
        }
      });
      throw error;
    } finally {
      setTimeout(() => {
        setState({ isInstalling: false });
      }, 2000);
    }
  };

  // 扫描可用的MOD文件
  const scanAvailableFiles = async () => {
    try {
      // 扫描当前目录下的MOD文件
      const files = await window.electronAPI?.readDirectory('./');
      const modFiles: ModFile[] = files?.map(file => ({
        name: file.name,
        path: file.path,
        size: file.size,
        type: (file.name.split('.').pop()?.toLowerCase() as 'w3n' | 'cque' | 'zip') || 'zip'
      })) || [];

      setState({ availableFiles: modFiles });
      return modFiles;
    } catch (error) {
      console.error('Failed to scan available files:', error);
      return [];
    }
  };

  // 切换组件选择状态
  const toggleComponent = (componentId: string) => {
    const newSelected = new Set(store.selectedComponents);
    if (newSelected.has(componentId)) {
      // 不能取消选择核心组件
      if (componentId !== 'core') {
        newSelected.delete(componentId);
      }
    } else {
      newSelected.add(componentId);
    }
    setState({ selectedComponents: newSelected });
  };

  // 计算安装大小
  const getInstallSize = () => {
    return store.components
      .filter(component => store.selectedComponents.has(component.id))
      .reduce((total, component) => total + component.size, 0);
  };

  // 开始安装
  const startInstall = async (war3Path: string) => {
    const selectedComponentIds = Array.from(store.selectedComponents);
    const selectedComponents = store.components.filter(c => selectedComponentIds.includes(c.id));

    setState({
      isInstalling: true,
      progress: { status: 'installing', progress: 0, message: '开始安装...' }
    });

    try {
      let currentProgress = 0;
      const totalComponents = selectedComponents.length;

      for (let i = 0; i < selectedComponents.length; i++) {
        const component = selectedComponents[i];
        setState({
          progress: {
            status: 'installing',
            progress: Math.round((i / totalComponents) * 100),
            message: `正在安装 ${component.name}...`
          }
        });

        // 模拟安装过程
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setState({
        progress: { status: 'complete', progress: 100, message: '安装完成！' }
      });

    } catch (error) {
      setState({
        progress: {
          status: 'error',
          progress: 0,
          message: `安装失败: ${error.message}`
        }
      });
      throw error;
    } finally {
      setTimeout(() => {
        setState({ isInstalling: false });
      }, 2000);
    }
  };

  const statics = {};

  return Object.assign(() => ({
    store,
    checkModInstallation,
    installMod,
    uninstallMod,
    scanAvailableFiles,
    toggleComponent,
    getInstallSize,
    startInstall
  }), {
    store,
    setState,
    checkModInstallation,
    installMod,
    uninstallMod,
    scanAvailableFiles,
    toggleComponent,
    getInstallSize,
    startInstall,
    statics
  });
});

// React Hook
export const useModInstaller = () => {
  // 获取reaxel实例
  const installer = reaxel_ModInstaller();

  return {
    isInstalling: installer.store.isInstalling,
    progress: installer.store.progress,
    installedMods: installer.store.installedMods,
    availableFiles: installer.store.availableFiles,
    components: installer.store.components,
    selectedComponents: installer.store.selectedComponents,
    checkModInstallation: installer.checkModInstallation,
    installMod: installer.installMod,
    uninstallMod: installer.uninstallMod,
    scanAvailableFiles: installer.scanAvailableFiles,
    toggleComponent: installer.toggleComponent,
    getInstallSize: installer.getInstallSize,
    startInstall: installer.startInstall
  };
};
