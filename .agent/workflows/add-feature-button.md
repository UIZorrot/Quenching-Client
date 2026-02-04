---
description: 如何在淬火客户端中添加一个新的设置按钮/功能
---

# 客户端按钮功能开发流程

在淬火 Electron 客户端中添加一个新的功能（如树木切换、地形切换等），需要遵循从底层逻辑到上层 UI 的四层结构。

## 1. 主进程逻辑层 (Main Process)
- **文件位置**: `src/Main/ipc/`
- **操作**: 创建一个新的 `xxx-handlers.ts` 文件。
- **规范**:
    - 实现核心逻辑（如文件读写、配置修改）。
    - 建议：如果涉及设置切换，始终**先读取基准原版文件**再进行内存编辑，最后写回游戏目录（防止配置叠加混乱）。
    - 导出注册函数 `registerXxxHandlers`。

## 2. IPC 注册 (IPC Registration)
- **文件位置**: `src/Main/IPC-listeners.ts`
- **操作**: 
    - 引入上一步创建的注册函数。
    - 在文件底部调用该函数，确保主进程启动时 IPC 监听器生效。

## 3. 桥接层 (Preload & Types)
- **!!! 重要 !!!**: 项目实际使用的是 **`src/Main/preload.ts`** 而非根目录的 `src/preload.ts`。
- **Preload 修改**: 在 `electronAPI` 对象中添加调用接口：
  ```typescript
  updateMyFeature: (arg1: string, arg2: any) => ipcRenderer.invoke('my-feature:update', arg1, arg2),
  ```
- **TS 类型定义**: 修改 **`src/types/electron-api.d.ts`**，在 `ElectronAPI` 接口中添加对应的方法签名，确保渲染进程不会报错。

## 4. 渲染进程逻辑层 (Renderer Hook)
- **文件位置**: `src/Renderer/hooks/useWar3Settings.ts`
- **操作**:
    - **状态同步**: 实现 `detectXxxMode` 函数，通过读取实际文件内容（关键字匹配）来判断当前是什么模式，确保 UI 高亮与真实状态一致。
    - **逻辑触发**: 在 `saveModSettings` 函数中，检测 `newSettings` 是否包含该项，若包含则调用 `window.electronAPI.updateMyFeature` 触发后端逻辑。
    - **超时保护**: 建议为所有 IPC 调用添加 `Promise.race` 超时保护（如 15s 或 30s）。

## 5. UI 界面层 (UI Component)
- **文件位置**: `src/Renderer/components/MainWindow/SettingsModal.tsx`
- **操作**:
    - 在组件中添加按钮、开关或 Dropdown。
    - 点击事件绑定到 `handleSettingChange('key', value)`。

## 故障排查 (Troubleshooting)
- **API Undefined**: 确认修改的是 `src/Main/preload.ts`。
- **文件未修改**: 检查主进程日志，确认魔兽路径是否正确拼接了 `_retail_`。
- **UI不亮**: 检查 `detectXxxMode` 的匹配关键词是否正确（注意斜杠和大小写兼容）。
