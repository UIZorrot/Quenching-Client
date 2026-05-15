# Classic Mode Implementation Notes

## Original Skin Handling Logic (Pre-Removal)

Prior to the simplification requested in Step 271, the Classic Mode toggle logic included specific handling for the `units` directory and `unitskin.txt` to support a limited set of skins.

### `src/Main/ipc/mod-management-handlers.ts`

When enabling Classic Mode (`mod:toggle-classic-mode` with `enable = true`):
1.  All mod folders (including `units`) were moved to `_retail_/QMoff`.
2.  A new `_retail_/units` directory was created.
3.  `unitskin-old.txt` was copied from the assets directory to `_retail_/units/unitskin.txt`.

```typescript
// Original Code Block
// 创建 units 文件夹并复制 unitskin-old.txt
const unitsDir = path.join(baseDir, 'units');
await fs.ensureDir(unitsDir);

const { reaxel_ElectronENV } = require('../reaxels/runtime-paths');
const { absAssetsPath } = reaxel_ElectronENV();
const oldSkinSource = path.join(absAssetsPath, 'quenching', 'unitskin-old.txt');
const skinTarget = path.join(unitsDir, 'unitskin.txt');

if (await fs.pathExists(oldSkinSource)) {
    await fs.copy(oldSkinSource, skinTarget);
    console.log('[ClassicMode] Copied unitskin-old.txt to units/unitskin.txt');
} else {
    console.warn('[ClassicMode] unitskin-old.txt not found');
    errors.push('unitskin-old.txt not found in assets');
}
```

When disabling Classic Mode:
1.  The `_retail_/units` directory (containing the classic `unitskin.txt`) was deleted.
2.  The original `units` folder was restored from `QMoff`.

### Reason for Removal
The user requested to simplify the Classic Mode implementation:
1.  Disable the Skin UI entirely in Classic Mode.
2.  Stop creating the temporary `units` folder with `unitskin.txt`.
3.  Simply move all mod files to `QMoff` and leave the `_retail_` directory clean (except for `QMoff` and `cos`).

This documentation serves as a record in case this feature needs to be restored in the future.
