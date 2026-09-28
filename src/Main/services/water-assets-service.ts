import fs from 'fs-extra';
import path from 'path';

export type ModWaterMode = 'transparent' | 'realistic';

export async function verifyWaterModeAssets(assetsDir: string, mode: ModWaterMode): Promise<void> {
  const waterRoot = path.join(assetsDir, 'quenching', 'water');
  const tileRoot = path.join(assetsDir, 'quenching', 'tile');
  const sourceWater = path.join(waterRoot, mode === 'transparent' ? 'water-trans' : 'water-rel');
  const sourceSlk = path.join(tileRoot, mode === 'transparent' ? 'water-trans.slk' : 'water-rel.slk');
  const shorelineNames = mode === 'transparent' ? ['shoreline1.dds', 'shorelineparticlexy.dds'] : [];
  const sources = [sourceWater, sourceSlk, ...shorelineNames.map((name) => path.join(waterRoot, 'shoreline', name))];
  for (const source of sources) {
    if (!(await fs.pathExists(source))) throw new Error(`Missing bundled water resource: ${source}`);
  }
}

/** Client assets are immutable templates: never move or remove these sources. */
export async function copyWaterModeFromAssets(baseDir: string, assetsDir: string, mode: ModWaterMode): Promise<void> {
  await verifyWaterModeAssets(assetsDir, mode);
  const waterRoot = path.join(assetsDir, 'quenching', 'water');
  const tileRoot = path.join(assetsDir, 'quenching', 'tile');
  const sourceWater = path.join(waterRoot, mode === 'transparent' ? 'water-trans' : 'water-rel');
  const sourceSlk = path.join(tileRoot, mode === 'transparent' ? 'water-trans.slk' : 'water-rel.slk');
  const shorelineNames = mode === 'transparent' ? ['shoreline1.dds', 'shorelineparticlexy.dds'] : [];

  const waterTarget = path.join(baseDir, 'replaceabletextures', 'water');
  const slkTarget = path.join(baseDir, 'terrainart', 'water.slk');
  await fs.copy(sourceWater, waterTarget, { overwrite: false, errorOnExist: true });
  await fs.copy(sourceSlk, slkTarget, { overwrite: false, errorOnExist: true });
  for (const name of shorelineNames) {
    await fs.copy(path.join(waterRoot, 'shoreline', name), path.join(baseDir, 'textures', name), { overwrite: false, errorOnExist: true });
  }
}
