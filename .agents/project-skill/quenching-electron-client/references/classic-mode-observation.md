# Classic Mode Observation (Code Truth)

## Confirmed Architecture

- This project is an Electron client MOD:
  - `package.json` includes `electron`, `electron-builder`, and desktop build scripts.
- Build entries:
  - Main: `src/main.ts`
  - Renderer: `src/Renderer/index.tsx`
  - Preload: `src/Main/preload.ts`

## Critical Classic Mode Behavior

- `mod:toggle-classic-mode` in `src/Main/ipc/mod-management-handlers.ts` currently moves folders between `_retail_` and `_retail_/QMoff`.
- `classic-skin:apply` in `src/Main/ipc/classic-skin-handlers.ts` requires `_retail_/units/unitskin.txt` to already exist.
- Result: if classic toggle no longer creates `unitskin.txt`, classic skin apply can fail at runtime.

## Risk Signals

1. Documentation and code behavior around `unitskin.txt` are not fully aligned.
2. Parallel historical files may cause edits in wrong place.
3. Mixed API registration style can create duplicate or stale handler paths.

## Practical Direction

- Decide one policy and codify it:
  - either restore `unitskin.txt` creation chain,
  - or disable/guard classic skin APIs when file is absent.
