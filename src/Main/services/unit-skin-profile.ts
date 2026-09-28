import fs from 'fs-extra';
import path from 'node:path';
import type { EffectiveGraphics } from '../../shared/mod-profile';

export type UnitSkinProfile = 'sd' | 'hd' | 'hd-retro' | 'de';
const PROFILES = new Set<UnitSkinProfile>(['sd', 'hd', 'hd-retro', 'de']);
const TEMPLATE: Record<UnitSkinProfile, string> = {
  sd: 'unitskin-sd.txt',
  hd: 'unitskin-new.txt',
  'hd-retro': 'unitskin-old.txt',
  de: 'unitskin-de.txt',
};

function marker(retailDir: string): string {
  return path.join(retailDir, '.quenching', 'unit-skin-profile.json');
}

export function skinProfileForGraphics(graphics: EffectiveGraphics, retroUnits: boolean, retroBuildings: boolean): UnitSkinProfile {
  return graphics === 'hd' && (retroUnits || retroBuildings) ? 'hd-retro' : graphics;
}

export function unitSkinTemplate(quenchingDir: string, profile: UnitSkinProfile): string {
  return path.join(quenchingDir, 'skin', TEMPLATE[profile]);
}

export function storedSkinPath(retailDir: string, profile: UnitSkinProfile, disabled = false): string {
  return path.join(retailDir, 'QMoff', 'skin-profiles', profile, disabled ? 'unitskin-dis.txt' : 'unitskin.txt');
}

export async function activeSkinProfile(retailDir: string): Promise<UnitSkinProfile | null> {
  const state = await fs.readJson(marker(retailDir)).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  return state?.schema === 1 && PROFILES.has(state.profile) ? state.profile : null;
}

/** Keep one profile active and the other three under QMoff. */
export async function switchUnitSkinProfile(
  retailDir: string,
  quenchingDir: string,
  desired: UnitSkinProfile,
): Promise<{ created: boolean; switched: boolean }> {
  const units = path.join(retailDir, 'units');
  const active = path.join(units, 'unitskin.txt');
  const disabled = path.join(units, 'unitskin-dis.txt');
  const legacyParked = path.join(retailDir, 'QMoff', 'units');
  const previous = await activeSkinProfile(retailDir);
  const oldProfile = previous || 'hd';
  const template = unitSkinTemplate(quenchingDir, desired);
  if (!(await fs.pathExists(template))) throw new Error(`Missing ${desired} unit skin template: ${template}`);

  // Earlier SD transitions parked the entire units directory. Recover its
  // skin separately before the remaining unit models are restored.
  if (!(await fs.pathExists(active)) && !(await fs.pathExists(disabled))) {
    for (const name of ['unitskin.txt', 'unitskin-dis.txt']) {
      const old = path.join(legacyParked, name);
      if (await fs.pathExists(old)) {
        await fs.ensureDir(units);
        await fs.move(old, path.join(units, name), { overwrite: true });
        break;
      }
    }
  }

  const hasActive = await fs.pathExists(active);
  const hasDisabled = await fs.pathExists(disabled);
  if (hasActive && hasDisabled) await fs.remove(disabled);
  const wasDisabled = !hasActive && (hasDisabled || await fs.pathExists(storedSkinPath(retailDir, oldProfile, true)));

  if (previous === desired && (hasActive || (!hasDisabled && wasDisabled))) {
    return { created: false, switched: false };
  }

  if (hasActive || hasDisabled) {
    const old = hasActive ? active : disabled;
    const parked = storedSkinPath(retailDir, oldProfile, wasDisabled);
    await fs.ensureDir(path.dirname(parked));
    await fs.move(old, parked, { overwrite: true });
  }

  const destination = wasDisabled ? storedSkinPath(retailDir, desired, true) : active;
  const parkedDesired = storedSkinPath(retailDir, desired, wasDisabled);
  const alternateParked = storedSkinPath(retailDir, desired, !wasDisabled);
  let created = false;
  await fs.ensureDir(units);
  if (parkedDesired === destination && await fs.pathExists(destination)) {
    // The selected profile is disabled; its copy already lives in QMoff.
  } else if (await fs.pathExists(parkedDesired)) {
    await fs.move(parkedDesired, destination, { overwrite: true });
  } else if (await fs.pathExists(alternateParked)) {
    await fs.move(alternateParked, destination, { overwrite: true });
  } else {
    await fs.copy(template, destination, { overwrite: true });
    created = true;
  }
  await fs.outputJson(marker(retailDir), { schema: 1, profile: desired });
  return { created, switched: previous !== desired };
}
