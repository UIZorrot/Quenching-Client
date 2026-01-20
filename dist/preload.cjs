(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("electron"));
	else if(typeof define === 'function' && define.amd)
		define(["electron"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("electron")) : factory(root["electron"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(global, (__WEBPACK_EXTERNAL_MODULE_electron__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE_electron__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*****************************!*\
  !*** ./src/Main/preload.ts ***!
  \*****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);

// 暴露安全的API给渲染进程
var electronAPI = {
  // 文件操作
  readFile: function readFile(filePath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:read', filePath);
  },
  writeFile: function writeFile(filePath, content) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:write', filePath, content);
  },
  copyFile: function copyFile(sourcePath, targetPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:copy', sourcePath, targetPath);
  },
  moveFile: function moveFile(sourcePath, targetPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:move', sourcePath, targetPath);
  },
  moveDirectory: function moveDirectory(sourceDir, targetDir) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:move-directory', sourceDir, targetDir);
  },
  deleteFile: function deleteFile(filePath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:delete', filePath);
  },
  pathExists: function pathExists(filePath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:exists', filePath);
  },
  getCurrentDirectory: function getCurrentDirectory() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:getCurrentDirectory');
  },
  // 游戏启动
  launchGame: function launchGame(executablePath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('game:launch', executablePath);
  },
  selectGamePath: function selectGamePath() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('game:select-path');
  },
  getConfig: function getConfig(key) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('config:get', key);
  },
  setConfig: function setConfig(key, value) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('config:set', key, value);
  },
  applyTheme: function applyTheme(themeId) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('theme:apply', themeId);
  },
  updateMdlLighting: function updateMdlLighting(war3Path, lightingMode) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('mdl:update-lighting', war3Path, lightingMode);
  },
  updateUISettings: function updateUISettings(war3Path, uiMode) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('ui:update-settings', war3Path, uiMode);
  },
  updateTerrainSettings: function updateTerrainSettings(war3Path, terrainMode) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('terrain:update-settings', war3Path, terrainMode);
  },
  updateTreeSettings: function updateTreeSettings(war3Path, treeMode) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('tree:update-settings', war3Path, treeMode);
  },
  updateWaterSettings: function updateWaterSettings(war3Path, waterMode) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('water:update-settings', war3Path, waterMode);
  },
  updateFoliageSettings: function updateFoliageSettings(war3Path, enabled) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('foliage:update-settings', war3Path, enabled);
  },
  updateObjectShader: function updateObjectShader(war3Path, enabled) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('shader:update-object-shader', war3Path, enabled);
  },
  updatePostProcessing: function updatePostProcessing(war3Path, enabled) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('shader:update-post-processing', war3Path, enabled);
  },
  updateEnvRenderSettings: function updateEnvRenderSettings(war3Path, enabled) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('script:update-env-render', war3Path, enabled);
  },
  updateGlowSettings: function updateGlowSettings(war3Path, enabled) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('glow:update-settings', war3Path, enabled);
  },
  updateHalfPortrait: function updateHalfPortrait(war3Path, visionModPath, enabled) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('vision:update-half-portrait', war3Path, visionModPath, enabled);
  },
  updateModelEnhance: function updateModelEnhance(war3Path, visionModPath, enabled) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('vision:update-model-enhance', war3Path, visionModPath, enabled);
  },
  applySkin: function applySkin(unitId, changes) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('skin:apply', unitId, changes);
  },
  applyBatchSkin: function applyBatchSkin(batchChanges) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('skin:apply-batch', batchChanges);
  },
  selectModelFile: function selectModelFile() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:select-model');
  },
  selectFile: function selectFile(options) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:select', options);
  },
  selectDirectory: function selectDirectory(title) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:select-directory', title);
  },
  // 新闻
  fetchNews: function fetchNews(lang) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('news:fetch', lang);
  },
  // 版本
  fetchVersion: function fetchVersion() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('version:fetch');
  },
  // Mod Actions系统操作
  openExternal: function openExternal(url) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('shell:openExternal', url);
  },
  showItemInFolder: function showItemInFolder(fullPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('shell:showItemInFolder', fullPath);
  },
  // 文件扫描和解压
  readDirectory: function readDirectory(dirPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:readDir', dirPath);
  },
  // extractArchive 已从 ElectronAPI 类型中移除，使用 extractZip 代替
  copyFiles: function copyFiles(sourcePattern, targetDir) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:copyFiles', sourcePattern, targetDir);
  },
  extractZip: function extractZip(zipPath, extractPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:extractZip', zipPath, extractPath);
  },
  createZip: function createZip(sourceDir, outputPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:createZip', sourceDir, outputPath);
  },
  launchExecutable: function launchExecutable(executablePath, args) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:launchExecutable', executablePath, args);
  },
  downloadFile: function downloadFile(url, outputPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:download', url, outputPath);
  },
  getFileStats: function getFileStats(filePath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:getStats', filePath);
  },
  // 已存在 readDirectory，移除重复定义

  // 注册表操作
  readRegistry: function readRegistry(keyPath, valueName) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('registry:read', keyPath, valueName);
  },
  writeRegistry: function writeRegistry(keyPath, valueName, value, type) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('registry:write', keyPath, valueName, value, type);
  },
  deleteRegistry: function deleteRegistry(keyPath, valueName) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('registry:delete', keyPath, valueName);
  },
  registryExists: function registryExists(keyPath, valueName) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('registry:exists', keyPath, valueName);
  },
  listRegistry: function listRegistry(keyPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('registry:list', keyPath);
  },
  backupRegistry: function backupRegistry(keyPath, backupPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('registry:backup', keyPath, backupPath);
  },
  restoreRegistry: function restoreRegistry(backupPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('registry:restore', backupPath);
  },
  // 窗口操作
  minimizeWindow: function minimizeWindow() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:minimize');
  },
  maximizeWindow: function maximizeWindow() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:maximize');
  },
  closeWindow: function closeWindow() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:close');
  },
  hideWindow: function hideWindow() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:hide');
  },
  showWindow: function showWindow() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:show');
  },
  setAlwaysOnTop: function setAlwaysOnTop(flag) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:setAlwaysOnTop', flag);
  },
  getWindowState: function getWindowState() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:getState');
  },
  setWindowSize: function setWindowSize(width, height) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:setSize', width, height);
  },
  setWindowPosition: function setWindowPosition(x, y) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:setPosition', x, y);
  },
  centerWindow: function centerWindow() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:center');
  },
  // 应用操作
  getAppVersion: function getAppVersion() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('app:getVersion');
  },
  getAppPath: function getAppPath(name) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('app:getPath', name);
  },
  quitApp: function quitApp() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('app:quit');
  },
  relaunchApp: function relaunchApp() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('app:relaunch');
  },
  getSystemInfo: function getSystemInfo() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('system:getInfo');
  },
  getDisplays: function getDisplays() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('system:getDisplays');
  },
  setWindowIcon: function setWindowIcon(iconPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:setIcon', iconPath);
  },
  setWindowTitle: function setWindowTitle(title) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:setTitle', title);
  },
  flashFrame: function flashFrame(flag) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:flashFrame', flag);
  },
  setProgressBar: function setProgressBar(progress) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('window:setProgressBar', progress);
  },
  setBadgeCount: function setBadgeCount(count) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('app:setBadgeCount', count);
  },
  // 系统操作
  executeCommand: function executeCommand(command) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('system:exec', command);
  },
  getFullPackageStatus: function getFullPackageStatus(war3Path) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('mod:get-full-package-status', war3Path);
  },
  installFullPackage: function installFullPackage(zipPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('mod:install-full-package', zipPath);
  }
};

// 通过contextBridge安全地暴露API
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 暴露一些有用的常量
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux'
});

// 暴露版本信息
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron
});

// 监听主进程消息
electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on('show-about', function () {
  // 可以在这里触发渲染进程的事件
  window.dispatchEvent(new CustomEvent('electron-show-about'));
});

// 错误处理
process.on('uncaughtException', function (error) {
  console.error('Uncaught Exception in preload:', error);
});
process.on('unhandledRejection', function (reason, promise) {
  console.error('Unhandled Rejection in preload:', reason, promise);
});
})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=preload.cjs.map