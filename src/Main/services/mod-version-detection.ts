import fs from 'fs-extra';
import path from 'path';

export interface CurrentModMarker {
  version: string;
  sequence: number | null;
  displayVersion: string | null;
}

export const LEGACY_34_SENTINELS = ['Rbuildings', 'RetroTex', 'RUnits'] as const;

export async function readCurrentModMarkerAtDir(branchDir: string): Promise<CurrentModMarker | null> {
  const keepPath = path.join(branchDir, '_patch', 'keep.que');
  const text = await fs.readFile(keepPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return '';
    throw error;
  });
  let current: CurrentModMarker | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const version = /^-v(\d+(?:\.\d+){1,2})-$/i.exec(line)?.[1];
    if (version) {
      current = { version, sequence: null, displayVersion: null };
      continue;
    }
    if (!current) continue;
    const sequence = /^-s(\d+)-$/i.exec(line)?.[1];
    if (sequence) {
      const parsed = Number(sequence);
      if (Number.isSafeInteger(parsed) && parsed > 0) current.sequence = parsed;
      continue;
    }
    const displayVersion = /^-d(\d+(?:\.\d+){1,2})-$/i.exec(line)?.[1];
    if (displayVersion) current.displayVersion = displayVersion;
  }
  return current;
}

export function resolveManagedSequence(marker: CurrentModMarker): number | null {
  return marker.sequence ?? (marker.version === '3.5' ? 35 : null);
}

/** Check only six fixed paths at most; never enumerate a player's resource tree. */
export async function hasLegacy34Sentinels(branchDir: string): Promise<boolean> {
  const present = await Promise.all(LEGACY_34_SENTINELS.map(async (folder) => {
    for (const candidate of [path.join(branchDir, folder), path.join(branchDir, 'QMoff', folder)]) {
      const stat = await fs.stat(candidate).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
        throw error;
      });
      if (stat?.isDirectory()) return true;
    }
    return false;
  }));
  return present.every(Boolean);
}
