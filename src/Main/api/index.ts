import { FileOperationsAPI } from './file-operations';
import { RegistryOperationsAPI } from './registry-operations';
import { WindowOperationsAPI } from './window-operations';
import { GameLauncherAPI } from './game-launcher';
import { AppOperationsAPI } from './app-operations';

// 导入原有的各功能模块注册函数
import { registerLaunchHandlers } from '../ipc/launch-handlers';
import { registerSkinHandlers } from '../ipc/skin-handlers';
import { registerNewsHandlers } from '../ipc/news-handlers';
import { registerVersionHandlers } from '../ipc/version-handlers';
import { registerMdlHandlers } from '../ipc/mdl-handlers';
import { registerUIHandlers } from '../ipc/ui-handlers';
import { registerTerrainHandlers } from '../ipc/terrain-handlers';
import { registerTreeHandlers } from '../ipc/tree-handlers';
import { registerWaterHandlers } from '../ipc/water-handlers';
import { registerFoliageHandlers } from '../ipc/foliage-handlers';
import { registerShaderHandlers } from '../ipc/shader-handlers';
import { registerScriptHandlers } from '../ipc/script-handlers';
import { registerGlowHandlers } from '../ipc/glow-handlers';
import { registerVisionHandlers } from '../ipc/vision-handlers';
import { registerModManagementHandlers } from '../ipc/mod-management-handlers';
import { registerClassicSkinHandlers } from '../ipc/classic-skin-handlers';

// 注册所有API
export function registerAllAPIs() {
  // 新架构 API
  FileOperationsAPI.register();
  RegistryOperationsAPI.register();
  WindowOperationsAPI.register();
  GameLauncherAPI.register();
  AppOperationsAPI.register();

  // 兼容旧模式的 IPC Handlers
  registerLaunchHandlers();
  registerSkinHandlers();
  registerNewsHandlers();
  registerVersionHandlers();
  registerMdlHandlers();
  registerUIHandlers();
  registerTerrainHandlers();
  registerTreeHandlers();
  registerWaterHandlers();
  registerFoliageHandlers();
  registerShaderHandlers();
  registerScriptHandlers();
  registerGlowHandlers();
  registerVisionHandlers();
  registerModManagementHandlers();
  registerClassicSkinHandlers();
}

export {
  FileOperationsAPI,
  RegistryOperationsAPI,
  WindowOperationsAPI,
  GameLauncherAPI,
  AppOperationsAPI
};
