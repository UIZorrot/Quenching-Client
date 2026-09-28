import path from 'node:path';
import fs from 'fs-extra';

export interface BundledResourceRoot {
  source: string;
  targetPrefix?: string;
}

export interface ResourceSourceCache {
  files: Map<string, string[]>;
}

export function createResourceSourceCache(): ResourceSourceCache {
  return { files: new Map() };
}

function relativeKey(value: string): string {
  const key = value.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!key || key.split('/').some(part => !part || part === '.' || part === '..' || part.includes(':'))) {
    throw new Error(`Invalid resource path: ${value}`);
  }
  return key;
}

async function listFiles(root: string): Promise<string[]> {
  if (!(await fs.pathExists(root))) return [];
  const results: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) results.push(path.relative(root, full));
    }
  };
  await walk(root);
  return results;
}

/** Same size and mtime as the bundled source: copies keep timestamps, so this means already installed. */
async function isInstalledCopy(source: string, target: string): Promise<boolean> {
  const [src, dst] = await Promise.all([fs.stat(source), fs.lstat(target).catch(() => null)]);
  return !!dst?.isFile() && dst.size === src.size && Math.trunc(dst.mtimeMs) === Math.trunc(src.mtimeMs);
}

async function copyResource(source: string, target: string): Promise<void> {
  if (await isInstalledCopy(source, target)) return;
  const stat = await fs.lstat(target).catch(() => null);
  if (stat && !stat.isFile()) await fs.remove(target);
  await fs.ensureDir(path.dirname(target));
  await fs.copy(source, target, { overwrite: true, preserveTimestamps: true });
}

async function removeLegacyMarker(targetDir: string, markerName: string): Promise<void> {
  await fs.remove(path.join(targetDir, markerName)).catch(() => undefined);
}

/**
 * Install the desired bundled variant into targetDir.
 * Paths that exist in any known variant but not in the desired one are deleted;
 * paths no bundled variant knows about are left alone.
 */
export async function syncBundledResourceFiles(
  targetDir: string,
  desiredRoots: BundledResourceRoot[],
  knownRoots: BundledResourceRoot[],
  markerName: string,
  options: { removeAbsent?: boolean; dryRun?: boolean; sourceCache?: ResourceSourceCache } = {},
): Promise<void> {
  if (options.dryRun) return;
  for (const root of desiredRoots) {
    if (!(await fs.pathExists(root.source))) throw new Error(`Bundled resource directory is unavailable: ${root.source}`);
  }
  const lists = options.sourceCache?.files ?? new Map<string, string[]>();
  const listSource = async (dir: string): Promise<string[]> => {
    if (!lists.has(dir)) lists.set(dir, await listFiles(dir));
    return lists.get(dir)!;
  };
  const keysOf = async (root: BundledResourceRoot): Promise<Array<{ key: string; file: string }>> =>
    (await listSource(root.source)).map(relative => ({
      key: relativeKey(path.posix.join(root.targetPrefix || '', relative.replace(/\\/g, '/'))),
      file: path.join(root.source, relative),
    }));

  const desired = new Map<string, string>();
  for (const root of desiredRoots) {
    for (const { key, file } of await keysOf(root)) desired.set(key.toLowerCase(), file);
  }

  if (options.removeAbsent !== false) {
    const known = new Map<string, string>();
    for (const root of knownRoots) {
      for (const { key } of await keysOf(root)) known.set(key.toLowerCase(), key);
    }
    for (const [lower, key] of known) {
      if (!desired.has(lower)) await fs.remove(path.join(targetDir, key));
    }
  }

  for (const root of desiredRoots) {
    for (const { key, file } of await keysOf(root)) await copyResource(file, path.join(targetDir, key));
  }
  await removeLegacyMarker(targetDir, markerName);
}

/** Remove one switched-off client resource at its known path. */
export async function removeBundledResourceFile(
  targetDir: string,
  relative: string,
  _knownSources: string[],
  markerName: string,
  _options: { ifCustom?: 'backup' } = {},
): Promise<boolean> {
  await fs.remove(path.join(targetDir, relativeKey(relative)));
  await removeLegacyMarker(targetDir, markerName);
  return true;
}

/** Install one client variant at a known path, replacing existing bytes. */
export async function installBundledResourceFile(
  targetDir: string,
  relative: string,
  source: string,
  _knownSources: string[],
  markerName: string,
  _options: { ifCustom?: 'skip' | 'error' } = {},
): Promise<boolean> {
  await copyResource(source, path.join(targetDir, relativeKey(relative)));
  await removeLegacyMarker(targetDir, markerName);
  return true;
}

/** Mutate every file under targetDir that `accepts` selects. */
export async function mutateManagedResourceFiles(
  targetDir: string,
  markerName: string,
  accepts: (relative: string) => boolean,
  mutate: (file: string, relative: string) => Promise<void>,
): Promise<void> {
  for (const relative of await listFiles(targetDir)) {
    const key = relative.replace(/\\/g, '/');
    if (accepts(key)) await mutate(path.join(targetDir, relative), key);
  }
  await removeLegacyMarker(targetDir, markerName);
}
