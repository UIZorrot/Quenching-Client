# Add Feature Button Workflow (Normalized)

## Goal

Add a new toggle/button feature safely across Main, IPC, Preload, Types, Hook, and UI.

## Steps

1. Create `src/Main/ipc/<feature>-handlers.ts` with core file/config logic.
2. Register handler through active registration path (`src/Main/api/index.ts` or designated listener index in project version).
3. Expose method in `src/Main/preload.ts`.
4. Add TS signatures in `src/types/electron-api.d.ts`.
5. In `src/Renderer/hooks/useWar3Settings.ts`, detect mode and invoke the new API when settings change.
6. In `src/Renderer/components/MainWindow/SettingsModal.tsx`, bind UI control to setting updates.

## Guardrails

- Read from baseline/original file before writing final merged content.
- Add timeout protection to expensive IPC calls.
- Confirm `_retail_` path resolution for all file operations.

## Smoke Test

- Toggle from UI.
- Confirm ipc handler execution logs.
- Confirm target file changed as expected.
- Restart app and confirm state persistence.
