import fs from 'fs-extra';
import path from 'path';
import { EffectiveGraphics } from '../../shared/mod-profile';
import { resolveRetailDir } from './full-package-service';

/** Under DE, these doodad roots stay active; everything else parks to QMoff. */
export const DE_DOODADS_KEEP = new Set(['que', 'terrain', 'cinematic']);

/** SD parks visual packages; units and buildings have a shared priority pass. */
export const SD_PARKED_DIRS = [
  'environment',
  'campaign',
  'doodads',
  'fonts',
  'patch',
  'replaceabletextures',
  'shaders',
  'splats',
  'terrainart',
  'textures',
] as const;

const ACTIVE_SKIN_FILES = new Set(['unitskin.txt', 'destructableskin.txt']);

const WATER_BACKUP_DIR_NAMES = ['water-rel', 'water-trans'] as const;
const SHORELINE_NAMES = ['shoreline1.dds', 'shorelineparticlexy.dds'] as const;

/** Remove the active water files; each water mode recreates them from client assets. */
export async function removeActiveWaterOverrides(baseDir: string): Promise<void> {
  const paths = [
    path.join('replaceabletextures', 'water'),
    path.join('terrainart', 'water.slk'),
    ...SHORELINE_NAMES.map((name) => path.join('textures', name)),
    path.join('QMoff', 'water-history'),
  ];
  for (const relative of paths) await fs.remove(path.join(baseDir, relative));
}

async function hasDirectoryContent(dir: string): Promise<boolean> {
  if (!(await fs.pathExists(dir))) return false;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) return true;
      if (entry.isDirectory() && (await hasDirectoryContent(path.join(dir, entry.name)))) {
        return true;
      }
    }
    return false;
  } catch (error: any) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false;
    throw error;
  }
}

async function movePath(source: string, target: string): Promise<void> {
  if (!(await fs.pathExists(source))) return;
  await fs.ensureDir(path.dirname(target));
  if (await fs.pathExists(target)) await fs.remove(target);
  await fs.move(source, target, { overwrite: false });
}

/** Merge a parked and active directory; the destination wins on duplicates. */
async function mergeMoveDirectory(source: string, target: string): Promise<void> {
  if (!(await fs.pathExists(source))) return;
  await fs.ensureDir(target);
  for (const name of await fs.readdir(source)) {
    const from = path.join(source, name);
    const to = path.join(target, name);
    const fromStat = await fs.lstat(from);
    if (fromStat.isSymbolicLink()) throw new Error(`Cannot merge symbolic link: ${from}`);
    if (!(await fs.pathExists(to))) {
      await fs.move(from, to, { overwrite: false });
      continue;
    }
    const toStat = await fs.lstat(to);
    if (fromStat.isDirectory() && toStat.isDirectory() && !toStat.isSymbolicLink()) {
      await mergeMoveDirectory(from, to);
    } else {
      await fs.remove(from);
    }
  }
  await fs.rmdir(source).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOTEMPTY' && error.code !== 'EEXIST') throw error;
  });
}

/** SD and DE keep only the two active skin tables under units. */
export async function parkNonHdUnitsAndBuildings(war3Path: string): Promise<void> {
  const baseDir = await resolveRetailDir(war3Path);
  const buildings = path.join(baseDir, 'buildings');
  await movePath(buildings, path.join(baseDir, 'QMoff', 'buildings'));

  const units = path.join(baseDir, 'units');
  if (!(await fs.pathExists(units))) return;
  const parked = path.join(baseDir, 'QMoff', 'units');
  for (const name of await fs.readdir(units)) {
    if (ACTIVE_SKIN_FILES.has(name.toLowerCase())) continue;
    await movePath(path.join(units, name), path.join(parked, name));
  }
}

/** Restore unit models and buildings before HD skin tables are selected. */
export async function restoreHdUnitsAndBuildings(war3Path: string): Promise<void> {
  const baseDir = await resolveRetailDir(war3Path);
  await movePath(path.join(baseDir, 'QMoff', 'buildings'), path.join(baseDir, 'buildings'));

  const parked = path.join(baseDir, 'QMoff', 'units');
  if (!(await fs.pathExists(parked))) return;
  const units = path.join(baseDir, 'units');
  for (const name of await fs.readdir(parked)) {
    if (ACTIVE_SKIN_FILES.has(name.toLowerCase())) {
      // Older SD switches parked entire units directories. The profile
      // service owns these tables now; keep only one active copy.
      if (!(await fs.pathExists(path.join(units, name)))) {
        await movePath(path.join(parked, name), path.join(units, name));
      } else {
        await fs.remove(path.join(parked, name));
      }
      continue;
    }
    await movePath(path.join(parked, name), path.join(units, name));
  }
  if ((await fs.readdir(parked)).length === 0) await fs.rmdir(parked);
}

/**
 * DE: keep que/terrain/cinematic under doodads; park the rest to QMoff/doodads.
 */
export async function parkDeDoodadsExtras(war3Path: string): Promise<void> {
  const baseDir = await resolveRetailDir(war3Path);
  const doodadsDir = path.join(baseDir, 'doodads');
  const parkedRoot = path.join(baseDir, 'QMoff', 'doodads');

  if (!(await fs.pathExists(doodadsDir))) {
    return;
  }

  await fs.ensureDir(parkedRoot);
  const entries = await fs.readdir(doodadsDir);
  for (const name of entries) {
    if (DE_DOODADS_KEEP.has(name.toLowerCase())) continue;
    await movePath(path.join(doodadsDir, name), path.join(parkedRoot, name));
    console.log(`[GraphicsLayout] DE: parked doodads/${name} -> QMoff/doodads/`);
  }
}

/** HD (and leaving DE): restore any doodads parked under QMoff/doodads. */
export async function restoreParkedDoodads(war3Path: string): Promise<void> {
  const baseDir = await resolveRetailDir(war3Path);
  const doodadsDir = path.join(baseDir, 'doodads');
  const parkedRoot = path.join(baseDir, 'QMoff', 'doodads');

  if (!(await fs.pathExists(parkedRoot))) return;

  await fs.ensureDir(doodadsDir);
  const entries = await fs.readdir(parkedRoot);
  for (const name of entries) {
    // Active DE keep folders take precedence over stale parked copies.
    if (DE_DOODADS_KEEP.has(name.toLowerCase())) {
      const parkedKeep = path.join(parkedRoot, name);
      if (await hasDirectoryContent(parkedKeep) && !(await hasDirectoryContent(path.join(doodadsDir, name)))) {
        await movePath(parkedKeep, path.join(doodadsDir, name));
      } else {
        await fs.remove(parkedKeep);
      }
      continue;
    }
    await movePath(path.join(parkedRoot, name), path.join(doodadsDir, name));
    console.log(`[GraphicsLayout] Restored doodads/${name} from QMoff`);
  }

  if (!(await hasDirectoryContent(parkedRoot))) {
    await fs.rmdir(parkedRoot).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOTEMPTY' && error.code !== 'EEXIST') throw error;
    });
  }
}

/** DE parks water resources under QMoff. */
export async function stripWaterForDe(
  war3Path: string,
  _assets?: { waterRoot: string; tileRoot: string }
): Promise<void> {
  const baseDir = await resolveRetailDir(war3Path);
  const paths = WATER_BACKUP_DIR_NAMES.map((name) => path.join('replaceabletextures', name));
  await removeActiveWaterOverrides(baseDir);
  for (const relative of paths) {
    const source = path.join(baseDir, relative);
    if (await fs.pathExists(source)) {
      await movePath(source, path.join(baseDir, 'QMoff', relative));
      console.log(`[GraphicsLayout] DE: parked ${relative}`);
    }
  }
}

/** Restore only package backup packs; effective water is recreated from client assets. */
export async function restoreParkedWaterDirs(war3Path: string): Promise<boolean> {
  const baseDir = await resolveRetailDir(war3Path);
  const rtDir = path.join(baseDir, 'replaceabletextures');
  const parkedRt = path.join(baseDir, 'QMoff', 'replaceabletextures');

  let restored = false;
  for (const name of WATER_BACKUP_DIR_NAMES) {
    const parked = path.join(parkedRt, name);
    if (!(await fs.pathExists(parked))) continue;
    const active = path.join(rtDir, name);
    await movePath(parked, active);
    restored = true;
    console.log(`[GraphicsLayout] Restored replaceabletextures/${name} from QMoff`);
  }
  return restored;
}

export async function parkSdResources(war3Path: string): Promise<void> {
  const baseDir = await resolveRetailDir(war3Path);
  const qmoffDir = path.join(baseDir, 'QMoff');
  await fs.ensureDir(qmoffDir);

  for (const dir of SD_PARKED_DIRS) {
    const activePath = path.join(baseDir, dir);
    const parkedPath = path.join(qmoffDir, dir);
    if (!(await fs.pathExists(activePath))) continue;

    const activeHasContent = await hasDirectoryContent(activePath);
    const parkedHasContent = await hasDirectoryContent(parkedPath);

    if (!activeHasContent) {
      await fs.rmdir(activePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOTEMPTY' && error.code !== 'EEXIST') throw error;
      });
      continue;
    }
    if (parkedHasContent) {
      await mergeMoveDirectory(activePath, parkedPath);
      continue;
    }
    if (await fs.pathExists(parkedPath)) {
      await fs.rmdir(parkedPath);
    }
    await fs.move(activePath, parkedPath, { overwrite: false });
    console.log(`[GraphicsLayout] SD: parked ${dir} -> QMoff`);
  }
}

export async function restoreSdParkedResources(war3Path: string): Promise<void> {
  const baseDir = await resolveRetailDir(war3Path);
  const qmoffDir = path.join(baseDir, 'QMoff');

  for (const dir of SD_PARKED_DIRS) {
    const parkedPath = path.join(qmoffDir, dir);
    const activePath = path.join(baseDir, dir);
    if (!(await fs.pathExists(parkedPath))) continue;
    if (await fs.pathExists(activePath) && (await hasDirectoryContent(activePath))) {
      await mergeMoveDirectory(parkedPath, activePath);
      continue;
    }
    if (await fs.pathExists(activePath)) {
      await fs.rmdir(activePath);
    }
    await fs.move(parkedPath, activePath, { overwrite: false });
    console.log(`[GraphicsLayout] Restored ${dir} from QMoff (left SD)`);
  }
}

/**
 * Apply retail folder layout for the resolved graphics profile.
 * classicMode parking is handled separately and takes precedence — skip SD park when classic is on.
 */
export async function syncGraphicsLayout(
  war3Path: string,
  graphics: EffectiveGraphics,
  options?: { classicMode?: boolean; waterMode?: 'transparent' | 'realistic' | 'off'; waterAssets?: { waterRoot: string; tileRoot: string } }
): Promise<{ waterNeedsReapply: boolean }> {
  const classicMode = options?.classicMode === true;
  let waterNeedsReapply = false;

  if (graphics === 'sd') {
    if (!classicMode) {
      await parkNonHdUnitsAndBuildings(war3Path);
      await parkSdResources(war3Path);
    }
    return { waterNeedsReapply: false };
  }

  if (graphics === 'de') {
    await parkNonHdUnitsAndBuildings(war3Path);
    if (!classicMode) await restoreSdParkedResources(war3Path);
    await parkDeDoodadsExtras(war3Path);
    await stripWaterForDe(war3Path, options?.waterAssets);
    waterNeedsReapply = false;
  } else {
    // HD
    await restoreHdUnitsAndBuildings(war3Path);
    if (!classicMode) await restoreSdParkedResources(war3Path);
    await restoreParkedDoodads(war3Path);
    const restoredWater = await restoreParkedWaterDirs(war3Path);
    const baseDir = await resolveRetailDir(war3Path);
    const activeWater = path.join(baseDir, 'replaceabletextures', 'water');
    const waterSlk = path.join(baseDir, 'terrainart', 'water.slk');
    const hasActiveWater = await fs.pathExists(activeWater);
    const hasWaterSlk = await fs.pathExists(waterSlk);
    const hasShoreline = (await Promise.all(SHORELINE_NAMES.map((name) => fs.pathExists(path.join(baseDir, 'textures', name))))).some(Boolean);
    waterNeedsReapply = options?.waterMode === 'off'
      ? hasActiveWater || hasWaterSlk || hasShoreline
      : restoredWater || !hasActiveWater || !hasWaterSlk;
  }

  return { waterNeedsReapply };
}
