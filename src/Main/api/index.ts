import { FileOperationsAPI } from './file-operations';
import { RegistryOperationsAPI } from './registry-operations';
import { WindowOperationsAPI } from './window-operations';
import { GameLauncherAPI } from './game-launcher';
// 导入旧有的 IPC 监听器以恢复版本获取、皮肤、新闻等功能
import '../IPC-listeners';

// 注册所有API
export function registerAllAPIs() {
  FileOperationsAPI.register();
  RegistryOperationsAPI.register();
  WindowOperationsAPI.register();
  GameLauncherAPI.register();
}

export {
  FileOperationsAPI,
  RegistryOperationsAPI,
  WindowOperationsAPI,
  GameLauncherAPI
};
