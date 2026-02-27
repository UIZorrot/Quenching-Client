# Mac Build Compatibility Changes - Summary

This document summarizes all the changes ported from `_ref/mac` to the main codebase to enable macOS builds.

## Changes Applied

### 1. **package.json** - Added Mac Build Scripts
- Added `dist:mac`: Full Mac build pipeline with fixes, signing, and DMG creation
- Added `dist:dmg`: Alternative Mac build command
- Added `fix:mac`: Script to fix library paths
- Added `sign:mac`: Script for ad-hoc signing
- Added `create:dmg`: Script to create DMG installer

### 2. **electron-builder.yml** - Mac Configuration Updates
- Changed icon path from `assets/quenching/logo.png` to `public/logo.png`
- Added `electronLanguages: ['en', 'zh', 'zh_CN']`
- Added `downloadAlternateFFmpeg: false` to prevent FFMPEG library path issues

### 3. **New Scripts** - Mac Build Automation
Created three new scripts in `scripts/`:

#### `fix-mac-app.js`
- Fixes macOS library path issues for `libffmpeg.dylib`
- Removes old rpaths and adds correct ones using `@executable_path` and `@loader_path`
- Ensures FFMPEG library can be loaded correctly

#### `sign-mac-app.js`
- Performs ad-hoc signing of the Mac app
- Prevents "application is damaged" warnings
- Uses `codesign --force --deep --sign -` for self-signing

#### `create-dmg.js`
- Creates DMG installer file
- Uses `hdiutil` with UDZO format for better compatibility
- Provides file size information

### 4. **src/Main/reaxels/screen-adpater/utils.ts** - Cross-Platform Screen API
**Critical Fix for Mac Compatibility**

- **Problem**: `screen.getPrimaryDisplay()` was called at module initialization, before Electron app was ready, causing crashes on macOS
- **Solution**: 
  - Deferred initialization of `textScaleFactor` and `displayScaleFactor`
  - Added `app.isReady()` check before calling screen APIs
  - Changed from direct exports to getter functions
  - Added platform detection for non-Windows systems (returns default screen info)

### 5. **src/Main/services/asset-sync.ts** - Asset Path Discovery
- Added `QuenChing-Electron-Client/assets` to the search candidates
- Added debug logging to show all searched paths

### 6. **src/Renderer/hooks/useWar3Settings.ts** - VisionMod Path Validation
- Already includes VisionMod path checks (lines 580-586, 596-600)
- Shows warning message when trying to use VisionMod features without setting the path
- Prevents errors and provides user feedback

### 7. **src/Main/ipc/mdl-handlers.ts** - Lighting Parameter Adjustments
Updated lighting parameters for better visual quality:
- Changed default `targetAmb` from `-0.14` to `-0.05`
- RPG mode: Changed `targetAmb` from `-0.18` to `-0.12`, unit intensity from `1.15` to `1.1`
- Battle mode: Changed intensity from `1.1` to `1.4`

## Build Instructions

### For Windows (unchanged):
```bash
npm run dist:win
```

### For macOS:
```bash
npm run dist:mac
```

This will:
1. Build the application (`npm run build`)
2. Package as .app (`electron-builder --mac`)
3. Fix library paths (`npm run fix:mac`)
4. Sign the app (`npm run sign:mac`)
5. Create DMG installer (`npm run create:dmg`)

### Output Files:
- **App**: `__Bin/mac-arm64/QM Client.app`
- **DMG**: `__Bin/QM Client.dmg`

## Platform-Specific Notes

### macOS:
- App is self-signed (ad-hoc signature)
- Users may see "cannot verify developer" warning on first launch
- Users need to allow in System Settings > Privacy & Security
- For distribution with proper signing, an Apple Developer account ($99/year) is required

### Windows:
- No changes to existing build process
- All functionality remains the same

## Testing Recommendations

1. Test asset loading on both platforms
2. Verify screen scaling works correctly on macOS
3. Test VisionMod features with and without path set
4. Verify lighting changes look correct in-game
5. Test DMG installation process on macOS

## References

See `_ref/mac/BUILD_GUIDE.md` for detailed Mac build documentation.
