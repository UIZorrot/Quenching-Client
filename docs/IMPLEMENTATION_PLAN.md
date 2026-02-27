# Implementation Plan for 7 Critical Issues

## Issue 1: Demon Hunter Skin Configuration Errors

### Problem:
- Preview images for Demon Hunter are using Keeper of the Grove images (cosh_n7.png, cosh_n6.png, cosh_n5.png)
- Model paths may be incorrect (using classic paths instead of HD paths)

### Solution:
1. Update preview image references in `src/Renderer/assets/data/skin-config.ts` (lines 1117, 1128, 1139)
2. Verify model paths match the reference C# code
3. Check if metamorphosis form needs separate configuration

### Files to modify:
- `src/Renderer/assets/data/skin-config.ts`

---

## Issue 2: Version Check Always Shows "New Version Available"

### Problem:
- Current version is v3.0, but system still shows update available
- Version comparison logic may be incorrect

### Solution:
1. Find version check code
2. Fix version comparison logic
3. Ensure package.json version matches

### Files to investigate:
- Search for "new version available" or version check logic
- Check version service/component

---

## Issue 3: Skin Selection Not Persisting on Page Navigation

### Problem:
- Selected skin doesn't stay highlighted when navigating away and back

### Solution:
1. Ensure skin selection is saved to config
2. Load and apply saved skin selection on component mount
3. Update UI to reflect saved selection

### Files to modify:
- Skin selection component
- Config management

---

## Issue 4: 4K Display Scaling Issues

### Problem:
- Some users report UI scaling problems on 4K displays
- Need to investigate both Windows and Mac

### Solution:
1. Review screen scaling logic in `src/Main/reaxels/screen-adpater/`
2. Test with different DPI settings
3. Add fallback scaling logic

### Files to check:
- `src/Main/reaxels/screen-adpater/utils.ts` (already modified for Mac)
- Window initialization code

---

## Issue 5: Force Re-extract UI Files on Startup

### Problem:
- UI files should be deleted and re-extracted every startup
- Should apply user's selected UI type

### Solution:
1. Add startup hook to delete `_retail_/webui` folder
2. Re-extract from appropriate zip based on user's UI setting
3. Copy correct QuenchingOn image based on language

### Files to modify:
- `src/Main/services/asset-sync.ts` - modify `syncAssetsBeforeLaunch`
- Add force re-extraction logic

---

## Issue 6: Invalid War3 Path Validation

### Problem:
- System accepts invalid War3 paths
- Should check for `_retail_` subdirectory

### Solution:
1. Find path validation logic
2. Add check for `_retail_` folder existence
3. Show error if invalid path

### Files to find and modify:
- Path selection/validation component
- IPC handler for path validation

---

## Issue 7: Add "Basic" Settings Tab

### Problem:
- Need new settings tab with:
  - Delete MOD button (delete mod directories + disable mod + reset settings)
  - Reset Rendering Components button (delete and re-extract 4 core zips)

### Solution:
1. Add new "Basic" tab to SettingsModal
2. Implement "Delete MOD" function:
   - Identify all MOD directories (_retail_/environment, scripts, shaders, ui, webui, QMoff)
   - Delete these directories
   - Set modEnabled = false
   - Reset all mod settings to defaults
3. Implement "Reset Rendering" function:
   - Delete 4 core directories (environment, scripts, shaders, ui)
   - Re-extract from zips

### Files to modify:
- `src/Renderer/components/MainWindow/SettingsModal.tsx`
- Add new IPC handlers in Main process
- Update i18n translations

---

## Priority Order:
1. Issue 1 (Demon Hunter) - Quick fix, user-facing
2. Issue 6 (Path validation) - Prevents errors
3. Issue 5 (UI re-extraction) - Important for consistency
4. Issue 7 (Basic settings tab) - New feature, important for user control
5. Issue 2 (Version check) - Annoying but not breaking
6. Issue 3 (Skin persistence) - UX improvement
7. Issue 4 (4K scaling) - Needs testing, may already be fixed by Mac changes
