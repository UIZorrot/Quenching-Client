import { reaxel, createReaxable } from 'reaxes';

// MOD组件接口
export interface ModComponent {
  id: string;
  name: string;
  description: string;
  type: 'shader' | 'texture' | 'model' | 'sound' | 'ui' | 'script';
  files: string[];
  dependencies?: string[];
  optional: boolean;
  enabled: boolean;
  size: number; // 文件大小（字节）
}

// 安装进度
export interface InstallProgress {
  component: string;
  current: number;
  total: number;
  status: 'downloading' | 'extracting' | 'installing' | 'complete' | 'error';
  message: string;
}

// MOD安装器状态管理
export const reaxel_ModInstaller = reaxel(() => {
  const { store, setState } = createReaxable({
    components: [] as ModComponent[],
    selectedComponents: new Set<string>(),
    isInstalling: false,
    progress: null as InstallProgress | null,
    installHistory: [] as string[],
    lastInstallTime: null as Date | null
  });

  // 默认MOD组件配置
  const defaultComponents: ModComponent[] = [
    {
      id: 'core-shaders',
      name: '核心着色器',
      description: '增强的光照和阴影效果',
      type: 'shader',
      files: ['Shaders/*'],
      optional: false,
      enabled: true,
      size: 15728640 // 15MB
    },
    {
      id: 'water-effects',
      name: '水面效果',
      description: '真实的水面反射和折射',
      type: 'shader',
      files: ['Shaders/Water/*'],
      dependencies: ['core-shaders'],
      optional: true,
      enabled: true,
      size: 5242880 // 5MB
    },
    {
      id: 'enhanced-textures',
      name: '增强纹理',
      description: '高分辨率地形和建筑纹理',
      type: 'texture',
      files: ['Textures/*', 'ReplaceableTextures/*'],
      optional: true,
      enabled: true,
      size: 104857600 // 100MB
    },
    {
      id: 'improved-models',
      name: '改进模型',
      description: '优化的单位和建筑模型',
      type: 'model',
      files: ['Units/*', 'Buildings/*', 'Doodads/*'],
      optional: true,
      enabled: true,
      size: 52428800 // 50MB
    },
    {
      id: 'ui-enhancements',
      name: 'UI增强',
      description: '现代化的游戏界面',
      type: 'ui',
      files: ['UI/*'],
      optional: true,
      enabled: false,
      size: 10485760 // 10MB
    },
    {
      id: 'sound-improvements',
      name: '音效改进',
      description: '高质量的音效和音乐',
      type: 'sound',
      files: ['Sound/*'],
      optional: true,
      enabled: false,
      size: 209715200 // 200MB
    },
    {
      id: 'camera-scripts',
      name: '相机脚本',
      description: '自定义相机视角脚本',
      type: 'script',
      files: ['Scripts/blizzard.j'],
      optional: true,
      enabled: false,
      size: 1048576 // 1MB
    }
  ];

  // 初始化组件
  const initializeComponents = () => {
    setState({
      components: defaultComponents,
      selectedComponents: new Set(
        defaultComponents.filter(c => c.enabled).map(c => c.id)
      )
    });
  };

  // 切换组件选择
  const toggleComponent = (componentId: string) => {
    const component = store.components.find(c => c.id === componentId);
    if (!component || !component.optional) return;

    const newSelected = new Set(store.selectedComponents);

    if (newSelected.has(componentId)) {
      newSelected.delete(componentId);
      // 移除依赖此组件的其他组件
      store.components.forEach(c => {
        if (c.dependencies?.includes(componentId)) {
          newSelected.delete(c.id);
        }
      });
    } else {
      newSelected.add(componentId);
      // 自动添加依赖组件
      if (component.dependencies) {
        component.dependencies.forEach(dep => {
          newSelected.add(dep);
        });
      }
    }

    setState({ selectedComponents: newSelected });
  };

  // 检查安装状态
  const checkInstallStatus = async (war3Path: string): Promise<boolean> => {
    try {
      // 检查是否存在MOD标识文件
      const modMarkerPath = `${war3Path}\\.quenching-mod-installed`;
      const exists = await window.electronAPI?.pathExists(modMarkerPath);
      return !!exists;
    } catch (error) {
      console.error('Failed to check install status:', error);
      return false;
    }
  };

  // 开始安装
  const startInstall = async (war3Path: string): Promise<void> => {
    if (store.isInstalling) return;

    setState({ isInstalling: true, progress: null });

    try {
      const selectedComponentsList = store.components.filter(c =>
        store.selectedComponents.has(c.id)
      );

      // 计算总大小
      const totalSize = selectedComponentsList.reduce((sum, c) => sum + c.size, 0);
      let installedSize = 0;

      for (const component of selectedComponentsList) {
        setState({
          progress: {
            component: component.name,
            current: installedSize,
            total: totalSize,
            status: 'downloading',
            message: `正在下载 ${component.name}...`
          }
        });

        // 下载组件
        await downloadComponent(component);

        setState({
          progress: {
            component: component.name,
            current: installedSize,
            total: totalSize,
            status: 'extracting',
            message: `正在解压 ${component.name}...`
          }
        });

        // 解压组件
        await extractComponent(component, war3Path);

        setState({
          progress: {
            component: component.name,
            current: installedSize,
            total: totalSize,
            status: 'installing',
            message: `正在安装 ${component.name}...`
          }
        });

        // 安装组件
        await installComponent(component, war3Path);

        installedSize += component.size;
      }

      // 创建安装标识
      await createInstallMarker(war3Path, selectedComponentsList);

      setState({
        progress: {
          component: '完成',
          current: totalSize,
          total: totalSize,
          status: 'complete',
          message: 'MOD安装完成！'
        },
        lastInstallTime: new Date(),
        installHistory: [...store.installHistory, new Date().toISOString()]
      });

      // 3秒后清除进度
      setTimeout(() => {
        setState({ isInstalling: false, progress: null });
      }, 3000);

    } catch (error) {
      console.error('Installation failed:', error);
      setState({
        progress: {
          component: '错误',
          current: 0,
          total: 0,
          status: 'error',
          message: `安装失败: ${error.message}`
        },
        isInstalling: false
      });
    }
  };

  // 下载组件
  const downloadComponent = async (component: ModComponent): Promise<void> => {
    // 模拟下载过程
    const downloadUrl = `https://api.quenching.com/mods/${component.id}.zip`;

    try {
      // 这里应该实现实际的下载逻辑
      await window.electronAPI?.downloadFile(downloadUrl, `./temp/${component.id}.zip`);
    } catch (error) {
      // 如果远程下载失败，尝试使用本地文件
      console.warn(`Failed to download ${component.id}, using local files`);
    }
  };

  // 解压组件
  const extractComponent = async (component: ModComponent, war3Path: string): Promise<void> => {
    const zipPath = `./temp/${component.id}.zip`;
    const extractPath = `./temp/${component.id}`;

    try {
      await window.electronAPI?.extractZip(zipPath, extractPath);
    } catch (error) {
      console.error(`Failed to extract ${component.id}:`, error);
      throw error;
    }
  };

  // 安装组件
  const installComponent = async (component: ModComponent, war3Path: string): Promise<void> => {
    const extractPath = `./temp/${component.id}`;

    try {
      // 复制文件到War3目录
      for (const filePattern of component.files) {
        const sourcePath = `${extractPath}\\${filePattern}`;
        const targetPath = `${war3Path}\\${filePattern}`;

        await window.electronAPI?.copyFiles(sourcePath, targetPath);
      }
    } catch (error) {
      console.error(`Failed to install ${component.id}:`, error);
      throw error;
    }
  };

  // 创建安装标识
  const createInstallMarker = async (war3Path: string, components: ModComponent[]): Promise<void> => {
    const markerPath = `${war3Path}\\.quenching-mod-installed`;
    const markerData = {
      version: '2.5',
      installDate: new Date().toISOString(),
      components: components.map(c => ({
        id: c.id,
        name: c.name,
        version: '2.5'
      }))
    };

    await window.electronAPI?.writeFile(markerPath, JSON.stringify(markerData, null, 2));
  };

  // 卸载MOD
  const uninstallMod = async (war3Path: string): Promise<void> => {
    setState({ isInstalling: true });

    try {
      setState({
        progress: {
          component: '卸载',
          current: 0,
          total: 1,
          status: 'installing',
          message: '正在卸载MOD...'
        }
      });

      // 读取安装标识
      const markerPath = `${war3Path}\\.quenching-mod-installed`;
      const markerExists = await window.electronAPI?.pathExists(markerPath);

      if (markerExists) {
        const markerContent = await window.electronAPI?.readFile(markerPath);
        if (markerContent) {
          const markerData = JSON.parse(markerContent);

          // 删除已安装的文件
          for (const component of markerData.components) {
            const componentConfig = store.components.find(c => c.id === component.id);
            if (componentConfig) {
              for (const filePattern of componentConfig.files) {
                const filePath = `${war3Path}\\${filePattern}`;
                await window.electronAPI?.deleteFile(filePath);
              }
            }
          }
        }

        // 删除标识文件
        await window.electronAPI?.deleteFile(markerPath);
      }

      setState({
        progress: {
          component: '完成',
          current: 1,
          total: 1,
          status: 'complete',
          message: 'MOD卸载完成！'
        }
      });

      // 3秒后清除进度
      setTimeout(() => {
        setState({ isInstalling: false, progress: null });
      }, 3000);

    } catch (error) {
      console.error('Uninstallation failed:', error);
      setState({
        progress: {
          component: '错误',
          current: 0,
          total: 0,
          status: 'error',
          message: `卸载失败: ${error.message}`
        },
        isInstalling: false
      });
    }
  };

  // 获取安装大小
  const getInstallSize = (): number => {
    return store.components
      .filter(c => store.selectedComponents.has(c.id))
      .reduce((sum, c) => sum + c.size, 0);
  };

  // 初始化
  initializeComponents();

  return {
    store,
    toggleComponent,
    checkInstallStatus,
    startInstall,
    uninstallMod,
    getInstallSize
  };
});

// React Hook
export const useModInstaller = () => {
  const installer = reaxel_ModInstaller();
  return {
    components: installer.store.components,
    selectedComponents: installer.store.selectedComponents,
    isInstalling: installer.store.isInstalling,
    progress: installer.store.progress,
    installHistory: installer.store.installHistory,
    lastInstallTime: installer.store.lastInstallTime,
    toggleComponent: installer.toggleComponent,
    checkInstallStatus: installer.checkInstallStatus,
    startInstall: installer.startInstall,
    uninstallMod: installer.uninstallMod,
    getInstallSize: installer.getInstallSize
  };
};
