---
name: quenching-electron-client-project-pack
description: Use when working on Quenching Electron client MOD features, especially Classic Mode, IPC additions, preload exposure, and Renderer settings integration.
---

# Quenching Electron Client Project Skill

## Overview

This skill standardizes how to inspect, modify, and verify the Quenching MOD client built on Electron.
It prioritizes file-path correctness, IPC consistency, and Classic Mode safety.

## Repository Map

- Runtime and packaging: `package.json`, `electron-builder.yml`, `scripts/`
- Build entries: `partial.webpack-conf.ts`
- Main process: `src/main.ts`, `src/Main/ipc/`, `src/Main/api/`
- Preload bridge: `src/Main/preload.ts` (authoritative)
- Renderer: `src/Renderer/components/`, `src/Renderer/hooks/`
- Historic docs: `wiki/` and `.agents/` compatibility docs

## Main Modules and Core Locations

- **Bootstrap and lifecycle**
  - Purpose: app startup, window lifecycle, and top-level API registration.
  - Core files: `src/main.ts`, `src/Main/stages/app-initialize/index.ts`, `src/Main/stages/window-loaded/index.tsx`.
- **Build and packaging**
  - Purpose: compile Main/Renderer/Preload bundles and package desktop installers.
  - Core files: `partial.webpack-conf.ts`, `scripts/webpack.start/index.ts`, `scripts/webpack.build/index.ts`, `electron-builder.yml`.
- **Main IPC domain handlers**
  - Purpose: execute file system and game-side mutations from trusted main process.
  - Core files: `src/Main/ipc/mod-management-handlers.ts`, `src/Main/ipc/classic-skin-handlers.ts`, `src/Main/ipc/launch-handlers.ts`, `src/Main/ipc/terrain-handlers.ts`.
- **API aggregation and registration**
  - Purpose: provide a single registration surface for all IPC handlers and higher-level APIs.
  - Core files: `src/Main/api/index.ts`, `src/Main/api/game-launcher.ts`, `src/Main/api/app-operations.ts`.
- **Preload bridge and contract**
  - Purpose: expose safe renderer-callable APIs and enforce channel contract boundaries.
  - Core files: `src/Main/preload.ts`, `src/types/electron-api.d.ts`.
- **Renderer settings and state orchestration**
  - Purpose: maintain MOD settings state, detect real game state, and trigger IPC updates.
  - Core files: `src/Renderer/hooks/useWar3Settings.ts`, `src/Renderer/hooks/useWar3Detector.ts`.
- **Renderer feature surfaces (UI)**
  - Purpose: user-facing configuration flows and feature controls.
  - Core files: `src/Renderer/components/MainWindow/SettingsModal.tsx`, `src/Renderer/components/MainWindow/SkinModal.tsx`, `src/Renderer/components/MainWindow/index.tsx`.
- **Asset and game integration services**
  - Purpose: synchronize packaged assets into Warcraft path and support launch prerequisites.
  - Core files: `src/Main/services/asset-sync.ts`, `assets/quenching/`, `public/assets/quenching/`.
- **Classic Mode subsystem**
  - Purpose: folder migration strategy for classic compatibility plus classic skin mutation path.
  - Core files: `src/Main/ipc/mod-management-handlers.ts` (`mod:toggle-classic-mode`), `src/Main/ipc/classic-skin-handlers.ts` (`classic-skin:*`), `wiki/classic_mode_implementation.md`.

## Module Dependency Path (Mental Model)

1. UI in `SettingsModal`/`SkinModal` updates desired settings.
2. `useWar3Settings` determines deltas and invokes `window.electronAPI.*`.
3. `src/Main/preload.ts` forwards to `ipcMain` channels.
4. `src/Main/ipc/*-handlers.ts` mutates files under game `_retail_`.
5. Services (for example `asset-sync.ts`) prepare baseline assets when needed.
6. Updated state is persisted and reflected back into renderer.

## Hard Rules

1. Treat `src/Main/preload.ts` as the active preload entry.
2. Do not assume `src/preload.ts` is active unless build entry changed.
3. For new settings features, implement in order:
   - Main IPC handler
   - IPC registration
   - Preload API exposure
   - Type definition update
   - Renderer hook/state wiring
   - UI trigger
4. Any Classic Mode change must verify `mod:toggle-classic-mode` and `classic-skin:apply` compatibility.
5. If docs in `.agents` and `wiki` diverge, align before feature work.

## Standard Workflow

1. Confirm active build entry points in `partial.webpack-conf.ts`.
2. Locate affected IPC channels in `src/Main/ipc/`.
3. Ensure channel is registered from `src/Main/api/index.ts`.
4. Expose channel in `src/Main/preload.ts`.
5. Add or update signatures in `src/types/electron-api.d.ts`.
6. Wire renderer behavior through `src/Renderer/hooks/useWar3Settings.ts`.
7. Apply UI changes in `src/Renderer/components/MainWindow/`.

## Verification Checklist

- App boots with no preload/IPC type mismatch.
- Settings toggle reaches main process handler.
- Classic Mode on/off moves folders as intended.
- Classic skin apply fails gracefully if `unitskin.txt` is missing.
- No duplicate registration for the same IPC channel.

## Known Pitfalls

- Dual files with similar roles (`src/main.ts` vs `src/Main/main.ts`, `src/preload.ts` vs `src/Main/preload.ts`).
- Classic Mode docs may mention `unitskin.txt` creation while current handler no longer creates it.
- API migration is partially mixed (new API classes + old IPC handlers).

## References

- `./references/classic-mode-observation.md`
- `./references/classic-mode-doc-sync.md`
- `./references/add-feature-button-workflow.md`
