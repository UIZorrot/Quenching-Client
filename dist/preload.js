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
/*!************************!*\
  !*** ./src/preload.ts ***!
  \************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);

electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('versions', {
  get node() {
    return process.versions.node;
  },
  get chrome() {
    return process.versions.chrome;
  },
  get electron() {
    return process.versions.electron;
  }
});
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('IPC', {
  send: function send(channel) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.send.apply(electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer, [channel].concat(args));
  },
  on: function on(channel, listener) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.on(channel, listener);
  },
  invoke: function invoke(channel) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke.apply(electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer, [channel].concat(args));
  }
});

// 暴露完整的 electronAPI
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
  launchGame: function launchGame() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('game:launch');
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
  // 系统操作
  openExternal: function openExternal(url) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('shell:openExternal', url);
  },
  showItemInFolder: function showItemInFolder(fullPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('shell:showItemInFolder', fullPath);
  },
  executeCommand: function executeCommand(command) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('system:exec', command);
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
  // 文件扫描和解压
  scanDirectory: function scanDirectory(dirPath, extensions) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:scanDirectory', dirPath, extensions);
  },
  extractArchive: function extractArchive(archivePath, targetPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:extractArchive', archivePath, targetPath);
  },
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
  readDirectory: function readDirectory(dirPath) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('file:readDir', dirPath);
  },
  // 涂装系统
  applySkin: function applySkin(unitId, changes) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('skin:apply', unitId, changes);
  },
  applyBatchSkin: function applyBatchSkin(batchChanges) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('skin:apply-batch', batchChanges);
  },
  // 新闻操作
  fetchNews: function fetchNews(lang) {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('news:fetch', lang);
  },
  // 版本获取（远程）
  fetchVersion: function fetchVersion() {
    return electron__WEBPACK_IMPORTED_MODULE_0__.ipcRenderer.invoke('version:fetch');
  }
};
electron__WEBPACK_IMPORTED_MODULE_0__.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=preload.js.map