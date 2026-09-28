import path from 'node:path';
import fs from 'fs-extra';
import type { ModIntegrityManifest } from './mod-integrity-service';

const MANAGED_MARKERS = [
  ['environment', '.quenching-public-environment-files'],
  ['environment/dnc', '.quenching-dnc-profile'],
  ['environment/foliage', '.quenching-managed-foliage.json'],
  ['shaders', '.quenching-shader-profile'],
  ['terrainart', '.quenching-terrain-slk'],
  ['terrainart', '.quenching-terrain-tiles'],
  ['terrainart/blight', '.quenching-managed-blight.json'],
  ['units', '.quenching-profile-skin'],
  ['units', '.quenching-skin-template'],
  ['webui', '.quenching-webui-files'],
  ['ui', '.quenching-managed-ui.json'],
  ['scripts', '.quenching-managed-scripts.json'],
  ['textures', '.quenching-managed-glow.json'],
  ['', '.quenching-vision-files'],
] as const;

function safeRelative(relative: string): boolean {
  return !!relative && !path.isAbsolute(relative) && !relative.includes('\\') &&
    !relative.split('/').some(part => !part || part === '.' || part === '..' || part.includes(':'));
}

async function ordinaryFile(buildDir: string, relative: string): Promise<string | null> {
  if (!safeRelative(relative)) return null;
  let current = buildDir;
  const parts = relative.split('/');
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch(() => null);
    if (!stat?.isDirectory() || stat.isSymbolicLink()) return null;
  }
  const file = path.join(current, parts.at(-1)!);
  const stat = await fs.lstat(file).catch(() => null);
  return stat?.isFile() && !stat.isSymbolicLink() ? file : null;
}

/** Remove files at known package/client paths, regardless of modified bytes.
 * Unlisted game files remain untouched. */
export async function removeVerifiedModFiles(buildDir: string, manifest: ModIntegrityManifest): Promise<{ removed: number; preserved: string[] }> {
  const expected = new Set<string>();
  const add = (relative: string, hash: string) => {
    if (!safeRelative(relative) || !/^[a-f0-9]{64}$/i.test(hash)) return;
    expected.add(relative.toLowerCase());
  };
  for (const record of manifest.files) add(record.path, record.sha256);
  const markers: string[] = [];
  for (const [dir, marker] of MANAGED_MARKERS) {
    const relative = [dir, marker].filter(Boolean).join('/');
    const file = await ordinaryFile(buildDir, relative);
    if (!file) continue;
    const state = await fs.readJson(file).catch(() => null);
    if (state?.schema !== 1 || !state.files || typeof state.files !== 'object') continue;
    for (const [name, hash] of Object.entries(state.files)) {
      if (typeof hash === 'string') add([dir, name].filter(Boolean).join('/'), hash);
    }
    markers.push(relative);
  }

  const remove: string[] = [];
  for (const relative of expected) {
    for (const candidate of [relative, `QMoff/${relative}`, `QMoff/.branch-disabled-overlaps/${relative}`]) {
      const file = await ordinaryFile(buildDir, candidate);
      if (!file) continue;
      remove.push(file);
    }
  }
  for (const file of remove) await fs.unlink(file);
  for (const relative of markers) {
    const file = await ordinaryFile(buildDir, relative);
    if (file) await fs.unlink(file);
  }
  return { removed: remove.length, preserved: [] };
}
