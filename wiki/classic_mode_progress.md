# Classic Mode Implementation - Progress Update

## ✅ Completed (Phase 1-3)

### Backend Implementation
- ✅ **Classic Mode Toggle Handler** (`mod-management-handlers.ts`)
  - File movement logic (folders to/from QMoff)
  - unitskin.txt creation from unitskin-old.txt
  - State persistence in modSettings

- ✅ **Classic Skin Handler** (`classic-skin-handlers.ts`)
  - Line-based skin replacement logic
  - Hero ID to line number mapping
  - IPC handlers for classic skin application

- ✅ **Type Definitions** (`electron-api.d.ts`)
  - toggleClassicMode API
  - applyClassicSkin API
  - getClassicSupportedHeroes API

- ✅ **Preload Script** (`preload.ts`)
  - Exposed all classic mode APIs

- ✅ **API Registration** (`api/index.ts`)
  - Registered classic skin handlers

### Frontend Implementation
- ✅ **Settings Modal** (`SettingsModal.tsx`)
  - Classic mode toggle button
  - Conditional disabling of settings
  - Warning messages
  - Delete Mod and Reset Rendering restrictions

- ✅ **Main Window** (`index.tsx`)
  - MOD toggle disabled in classic mode
  - Warning message on toggle attempt

- ✅ **State Management** (`useWar3Settings.ts`)
  - classicMode property in ModSettings

### Data Files
- ✅ **Classic Skin Mapping** (`classic-skin-mapping.ts`)
  - Hero ID to line number mappings
  - Helper functions for classic mode detection

## ⏳ Remaining Work (Phase 4)

### Skin Modal Adaptation
- ❌ **Filter to Hero Skins Only**
  - Hide warband and custom skin options in classic mode
  - Show only hero skins

- ❌ **Classic Skin Application Logic**
  - Detect classic mode in SkinModal
  - Use applyClassicSkin API instead of regular skin API
  - Map skin config to classic format (file, modelScale, art, unitSound)

- ❌ **UI Indicators**
  - Show "Classic Mode" badge/indicator
  - Display which heroes are supported

### Data Validation
- ❌ **Compare Old vs New Skin Configs**
  - Verify hero skin mappings
  - Document differences
  - Ensure compatibility

### Testing
- ❌ **Functional Testing**
  - Classic mode toggle
  - File movement verification
  - Skin application in classic mode
  - Settings restrictions
  - State persistence

## Implementation Guide for Remaining Work

### 1. Update SkinModal for Classic Mode

```typescript
// In SkinModal.tsx

import { useWar3Settings } from '../../hooks/useWar3Settings';
import { isHeroSupportedInClassicMode } from '../../assets/data/classic-skin-mapping';

export const SkinModal: React.FC<SkinModalProps> = ({ open, onClose }) => {
  const { modSettings } = useWar3Settings();
  const isClassicMode = modSettings?.classicMode || false;

  // Filter categories - hide warband and custom in classic mode
  const availableCategories = useMemo(() => {
    if (isClassicMode) {
      return [{ id: 'hero', name: t('skin.category.hero') }];
    }
    return [
      { id: 'hero', name: t('skin.category.hero') },
      { id: 'warband', name: t('skin.category.warband') },
      { id: 'custom', name: t('skin.category.custom') }
    ];
  }, [isClassicMode, t]);

  // Filter heroes - only show supported heroes in classic mode
  const filteredHeroes = useMemo(() => {
    if (!isClassicMode) return currentHeroes;
    return currentHeroes.filter(hero => isHeroSupportedInClassicMode(hero.unitId));
  }, [isClassicMode, currentHeroes]);

  // Apply skin - use classic API in classic mode
  const handleApplySkin = async (targetId: string, skinId: string) => {
    if (isClassicMode) {
      // Use classic skin application logic
      await applyClassicModeSkin(targetId, skinId);
    } else {
      // Use regular skin application logic
      await applyRegularSkin(targetId, skinId);
    }
  };
}
```

### 2. Create Classic Skin Application Helper

```typescript
// Helper function to convert skin config to classic format
function convertToClassicSkinData(skinConfig: SkinChange[]) {
  const classicData: any = {};
  
  for (const change of skinConfig) {
    if (change.field === 'file') {
      classicData.file = change.value;
    } else if (change.field === 'modelScale') {
      classicData.modelScale = change.value;
    } else if (change.field === 'Art') {
      classicData.art = change.value;
    } else if (change.field === 'unitSound') {
      classicData.unitSound = change.value;
    }
  }
  
  return classicData;
}
```

### 3. Testing Checklist

- [ ] Enable classic mode from settings
- [ ] Verify folders moved to QMoff
- [ ] Verify unitskin.txt created
- [ ] Open skin modal - only heroes shown
- [ ] Apply hero skin in classic mode
- [ ] Verify unitskin.txt modified correctly
- [ ] Disable classic mode
- [ ] Verify folders restored from QMoff
- [ ] Verify all settings re-enabled

## Notes

- Classic mode only supports 24 heroes (all racial heroes + neutral heroes)
- Line numbers are critical - must match exactly with unitskin-old.txt structure
- Each hero occupies ~168 lines in unitskin.txt
- Classic mode disables: terrain, tree, lighting, water, foliage, shader, postProcessing, glow, half, modelEnhance
- Classic mode keeps enabled: UI, envRender

## Files Modified

### Backend
- `src/Main/ipc/mod-management-handlers.ts` - Classic mode toggle
- `src/Main/ipc/classic-skin-handlers.ts` - Classic skin application (NEW)
- `src/Main/api/index.ts` - Handler registration
- `src/Main/preload.ts` - API exposure
- `src/types/electron-api.d.ts` - Type definitions

### Frontend
- `src/Renderer/components/MainWindow/SettingsModal.tsx` - UI restrictions
- `src/Renderer/components/MainWindow/index.tsx` - MOD toggle restriction
- `src/Renderer/hooks/useWar3Settings.ts` - State management
- `src/Renderer/assets/data/classic-skin-mapping.ts` - Hero mappings (NEW)

### Remaining
- `src/Renderer/components/MainWindow/SkinModal.tsx` - Needs adaptation
