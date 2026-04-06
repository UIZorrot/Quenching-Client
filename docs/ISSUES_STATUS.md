# 7 Critical Issues - Status Report

## ✅ Issue 1: Demon Hunter Skin Configuration - PARTIALLY FIXED

### Completed:
- ✅ Fixed preview images: Changed from cosh_n7/n6/n5 (Keeper of the Grove) to cosh_n1/n2/n3 (Demon Hunter)
- ✅ Updated Illidan skin: Changed unitSound from 'Illidan' to 'HeroDemonHunter', modelScale from 1.1 to 1.16

### Remaining:
- ⚠️ Demon Illidan form still needs manual fix:
  - Change `file:hd` from `Units\\NightElf\\IllidanEvil\\IllidanEvil` to `Units\\NightElf\\Illidan\\Illidan`
  - Change `Art:hd` from `BTNEvilIllidan.blp` to `BTNIllidanDemonForm.blp`
  - Change `unitSound` from `Illidan` to `HeroDemonHunterMorphed`
  - Change `modelScale:hd` from `1.1` to `1.25`
  - File: `src/Renderer/assets/data/skin-config.ts` lines 1141-1144

---

## ⏳ Issue 2: Version Check - NOT STARTED

### Investigation Needed:
1. Find version check logic (search for "new version" or "version available")
2. Current version in package.json is 3.0
3. Check version comparison logic
4. Logs show: `[Version] Successfully fetched version: v3.1` but still shows update

### Files to Check:
- Search for version service/component
- Check Main process version checking code

---

## ⏳ Issue 3: Skin Selection Persistence - NOT STARTED

### Requirements:
1. Save selected skin to config when changed
2. Load saved skin selection on component mount
3. Highlight the correct skin button

### Files to Modify:
- Skin selection component (find the component that handles skin changes)
- Ensure it calls `window.electronAPI.setConfig` to save selection
- Load selection on mount and apply to UI state

---

## ⏳ Issue 4: 4K Display Scaling - POSSIBLY ALREADY FIXED

### Status:
- Mac compatibility changes already improved screen scaling logic
- Added deferred initialization and platform detection
- Need user testing to confirm

### If Issues Persist:
- Review `src/Main/reaxels/screen-adpater/utils.ts`
- Add additional DPI scaling logic
- Test on actual 4K displays (Windows and Mac)

---

## ⏳ Issue 5: Force UI Re-extraction on Startup - NOT STARTED

### Implementation Plan:
1. Modify `src/Main/services/asset-sync.ts` - `syncAssetsBeforeLaunch` function
2. Add logic to:
   ```typescript
   // Delete webui folder
   const webuiPath = path.join(war3Path, '_retail_', 'webui');
   await fs.remove(webuiPath);
   
   // Re-extract UI files
   const uiSetting = modSettings?.ui || 'quenching';
   // Extract appropriate files based on uiSetting
   // Copy correct QuenchingOn image based on language
   ```

### Files to Modify:
- `src/Main/services/asset-sync.ts`

---

## ⏳ Issue 6: War3 Path Validation - NOT STARTED

### Implementation Plan:
1. Find path validation logic (search for war3Path validation)
2. Add check:
   ```typescript
   const retailPath = path.join(selectedPath, '_retail_');
   const isValid = await fs.pathExists(retailPath);
   if (!isValid) {
     throw new Error('Invalid War3 path: _retail_ folder not found');
   }
   ```

### Files to Find:
- Path selection dialog/component
- IPC handler for path validation
- Likely in Main process

---

## ⏳ Issue 7: Add "Basic" Settings Tab - NOT STARTED

### Implementation Plan:

#### 1. Add New Tab to SettingsModal
File: `src/Renderer/components/MainWindow/SettingsModal.tsx`

Add new tab:
```typescript
<Tabs.TabPane tab={t('settings.basic.title')} key="basic">
  {/* Basic settings content */}
</Tabs.TabPane>
```

#### 2. Add "Delete MOD" Button
```typescript
const handleDeleteMod = async () => {
  if (confirm(t('settings.basic.deleteMod.confirm'))) {
    await window.electronAPI.deleteMod(war3Path);
    // Reset UI state
    // Reload settings
  }
};
```

#### 3. Add "Reset Rendering" Button
```typescript
const handleResetRendering = async () => {
  if (confirm(t('settings.basic.resetRendering.confirm'))) {
    await window.electronAPI.resetRenderingComponents(war3Path);
  }
};
```

#### 4. Add IPC Handlers (Main Process)
File: Create `src/Main/ipc/mod-management-handlers.ts`

```typescript
ipcMain.handle('mod:delete', async (event, war3Path) => {
  // Delete directories:
  // - _retail_/environment
  // - _retail_/scripts
  // - _retail_/shaders  
  // - _retail_/ui
  // - _retail_/webui
  // - _retail_/QMoff
  
  // Set modEnabled = false
  // Reset all mod settings to defaults
});

ipcMain.handle('mod:reset-rendering', async (event, war3Path) => {
  // Delete 4 core directories
  // Re-extract from zips
});
```

#### 5. Add i18n Translations
Files: `src/Renderer/utils/i18n.ts`

```typescript
'settings.basic.title': '基础',
'settings.basic.deleteMod': '删除MOD',
'settings.basic.deleteMod.desc': '删除所有MOD文件并重置设置',
'settings.basic.deleteMod.confirm': '确定要删除所有MOD文件吗？此操作不可恢复。',
'settings.basic.resetRendering': '重置渲染组件',
'settings.basic.resetRendering.desc': '删除并重新解压核心渲染文件',
'settings.basic.resetRendering.confirm': '确定要重置渲染组件吗？',
```

---

## Summary

### Completed:
- ✅ Mac build compatibility (all 7 changes from _ref/mac)
- ✅ Demon Hunter preview images fixed (2/3 skins)
- ✅ Demon Hunter Illidan skin configuration updated

### Needs Manual Fix:
- ⚠️ Demon Illidan configuration (lines 1141-1144 in skin-config.ts)

### Not Started (Priority Order):
1. **Issue 6** - War3 path validation (prevents errors)
2. **Issue 5** - UI re-extraction (consistency)
3. **Issue 7** - Basic settings tab (user control)
4. **Issue 2** - Version check (UX annoyance)
5. **Issue 3** - Skin persistence (UX improvement)
6. **Issue 4** - 4K scaling (needs testing)

### Estimated Time Remaining:
- Issue 6: 30 minutes
- Issue 5: 1 hour
- Issue 7: 2-3 hours
- Issue 2: 30 minutes
- Issue 3: 1 hour
- Issue 4: Testing only (may already be fixed)

**Total: ~5-6 hours of development work**
