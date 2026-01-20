# 自定义涂装 (Custom Skin) 模块开发笔记

## 1. 模块概述
该模块允许用户选择本地的魔兽争霸III模型文件 (.mdx/.mdl)，并将其应用到指定的单位上。这是通过修改魔兽目录下的 `unitskin.txt` 文件实现的。

## 2. 核心架构
采用了经典的 Electron 渲染进程与主进程协作模式：
- **渲染进程 (Renderer)**: 负责 UI 展示、种族切换、单位选择、本地文件选择指令。
- **主进程 (Main)**: 负责调用原生对话框选择文件、文件系统操作（拷贝模型）、以及 `unitskin.txt` 的读写。

## 3. 关键文件索引
- **UI & 逻辑**: [SkinModal.tsx](file:///d:/Quenching/QM/MOD/quenching-client/QuenchingModCN/QuenChing-Electron-Client/projects/QuenChing-Mod-Client/src/Renderer/components/MainWindow/SkinModal.tsx)
- **配置定义**: [skin-config.ts](file:///d:/Quenching/QM/MOD/quenching-client/QuenchingModCN/QuenChing-Electron-Client/projects/QuenChing-Mod-Client/src/Renderer/assets/data/skin-config.ts) (包含 `CUSTOM_SKIN_CONFIG`)
- **API 定义**: [electron-api.d.ts](file:///d:/Quenching/QM/MOD/quenching-client/QuenchingModCN/QuenChing-Electron-Client/projects/QuenChing-Mod-Client/src/types/electron-api.d.ts)
- **预加载脚本**: [preload.ts](file:///d:/Quenching/QM/MOD/quenching-client/QuenchingModCN/QuenChing-Electron-Client/projects/QuenChing-Mod-Client/src/Main/preload.ts)
- **文件操作服务**: [file-operations.ts](file:///d:/Quenching/QM/MOD/quenching-client/QuenchingModCN/QuenChing-Electron-Client/projects/QuenChing-Mod-Client/src/Main/api/file-operations.ts)
- **涂装服务逻辑**: [skin-service.ts](file:///d:/Quenching/QM/MOD/quenching-client/QuenchingModCN/QuenChing-Electron-Client/projects/QuenChing-Mod-Client/src/Main/services/skin-service.ts)

## 4. 实现细节

### 4.1 UI 集成
在 `SkinModal.tsx` 中，我们添加了一个虚拟的 `selectedHeroId === 'custom'` 状态来触发自定义涂装界面。
- 侧边栏添加了“自定义涂装”入口。
- 使用 `customSkins` 状态（Record<string, string>）存储每个单位对应的本地模型路径。

### 4.2 文件选择 (IPC)
通过 `window.electronAPI.selectModelFile()` 调用主进程的 `dialog.showOpenDialog`，过滤条件设为 `*.mdx` 和 `*.mdl`。

### 4.3 涂装应用
调用 `window.electronAPI.applySkin(unitId, [{ field: 'file', value: filePath }])`。
- 主进程会识别到这是一个文件路径，并将其处理为相对于魔兽目录的路径（通常存放在 `CustomSkins` 文件夹下）。
- 修改 `unitskin.txt` 中对应 `[unitId]` 节下的 `file` 字段。

## 5. 配置指南
如果需要增加支持自定义涂装的单位，只需修改 `skin-config.ts` 中的 `CUSTOM_SKIN_CONFIG` 对象：
```typescript
export const CUSTOM_SKIN_CONFIG: Record<string, { name: string, units: CustomSkinUnit[] }> = {
  human: {
    name: '人族',
    units: [
      { unitId: 'Hpal', name: '圣骑士', icon: 'btnheropaladin.png' },
      // 添加更多单位...
    ]
  },
  // ... 其他种族
};
```

## 6. 维护与踩坑 (Tips)
- **状态同步**: 切换种族时，需要小心 `useEffect` 重置状态的逻辑。我们通过判断 `selectedHeroId !== 'custom'` 来避免在自定义模式下被强行重置。
- **类型安全**: 尽量避免使用 `@ts-ignore`，可以通过 `(window as any).electronAPI` 或完善 `d.ts` 定义来解决。
- **文件路径**: 应用涂装时，确保传递的是绝对路径，主进程会自动处理拷贝和相对路径转换。

---
*记录时间：2026-01-11*
*记录人：你的 AI 伙伴 🐾*
