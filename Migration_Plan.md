# Quenching Mod Client - Electron Migration Plan

## 1. Project Structure & Architecture

We will utilize the existing Monorepo structure in `QuenChing-Electron-Client` but significantly refactor the `Main` and `Renderer` logic to align with the functionality of the C# version.

### 1.1 Core Architecture
*   **Main Process (`src/Main`)**: Handles heavy lifting and system interactions.
    *   **API Layer**: Exposes `invoke` handlers for Renderer.
    *   **Services**:
        *   `GameLauncher`: Handles process spawning (`-launch -uid w3`).
        *   `FileManager`: Handles "Hot-Swapping" of folders (Terrain, UI).
        *   `CASCManager`: Handles Anti-Harmony extraction (using `casclib`).
        *   `RegistryManager`: Reads/Writes War3 registry keys.
        *   `KeyboardHook`: (Future) Native key interception.
*   **Renderer Process (`src/Renderer`)**: React UI.
    *   **Reaxels (State)**: One reaxel per module (Launch, Mods, Skins).
    *   **Components**: Pure UI components receiving data from Reaxels.

## 2. Implementation Phases

### Phase 1: Foundation & Launch (Priority High)
*   **Goal**: Client starts, reads config, and launches the game.
*   **Tasks**:
    1.  Setup `electron-store` for `config.ini` migration.
    2.  Implement `GameLauncher` service in Main.
    3.  Implement `War3Detector` to find game path.
    4.  Bind "Start Game" button.

### Phase 2: General Mods - File Swapping (Priority High)
*   **Goal**: Terrain, Lighting, Trees, Water.
*   **Tasks**:
    1.  Implement `FileManager` with atomic move/copy operations.
    2.  Port logic for `setbtn_tile` (Terrain) and `setbtn_light` (DNC).
    3.  Implement `MdlParser` (TS) to edit `.mdl` files for lighting intensity.

### Phase 3: Anti-Harmony - CASC (Priority Medium)
*   **Goal**: Extract uncensored models.
*   **Tasks**:
    1.  Install `casclib` npm package.
    2.  Implement `CASCManager` to scan and extract `_teen.w3mod` files.
    3.  Create UI progress bar for extraction.

### Phase 4: Skins (Priority Medium)
*   **Goal**: Unit and UI skins.
*   **Tasks**:
    1.  Implement `UnitSkinGenerator`: Parse/Write `unitskin.txt`.
    2.  Implement `UISkinInstaller`: Unzip and copy UI packs.

### Phase 5: Utils & Cleanup (Priority Low)
*   **Goal**: Key remapping and polish.
*   **Tasks**:
    1.  Implement `War3Preferences.txt` parser.
    2.  (Optional) Native Keyboard Hook via `uiohook-napi`.

## 3. Technology Stack Updates
*   **CASC**: `casclib` (Node.js).
*   **Config**: `electron-store`.
*   **File Ops**: `fs-extra`.

## 4. Next Steps (Immediate)
1.  Install `casclib`.
2.  Clean up `projects/QuenChing-Mod-Client/src/Main/api`.
3.  Implement `GameLauncher`.
