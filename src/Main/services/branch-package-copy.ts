import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import { statfs } from 'fs/promises';
import { BRANCH_MOD_FOLDERS } from './branch-mod-toggle';

const JOURNAL = path.join('.quenching', 'branch-copy.json');
const PACKAGE_ROOTS = new Set<string>([...BRANCH_MOD_FOLDERS, '_manual', 'Mac.txt', 'reg.reg']);

function safeRelative(value: unknown): value is string {
  return typeof value === 'string' && !!value && !path.isAbsolute(value) && !value.includes('\\') &&
    !value.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'));
}

async function existsNoFollow(file: string): Promise<boolean> {
  return !!(await fs.lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  }));
}

async function assertSafeParents(root: string, relative: string): Promise<void> {
  let current = root;
  for (const part of relative.split('/').slice(0, -1)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`Unsafe directory: ${current}`);
  }
}

interface CopyItem { source?: string; content?: Buffer; relative: string }

/** A leftover journal from an older client blocks another copy. */
export async function assertNoPendingBranchCopy(buildDir: string): Promise<void> {
  await assertSafeParents(buildDir, JOURNAL);
  if (await existsNoFollow(path.join(buildDir, JOURNAL))) {
    throw new Error(`An interrupted branch copy needs manual inspection: ${path.join(buildDir, JOURNAL)}`);
  }
}

/**
 * Copy a versioned full package from one branch into another.
 * With linkDisposableSource the source is a private ZIP extraction and files
 * are hard-linked instead of copied; never use it for an installed game branch.
 */
export async function cloneBranchPackage(
  sourceBuild: string,
  targetBuild: string,
  options: { linkDisposableSource?: boolean; onProgress?: (percent: number, message: string) => void } = {},
): Promise<number> {
  if (path.resolve(sourceBuild).toLowerCase() === path.resolve(targetBuild).toLowerCase()) throw new Error('Cannot copy a branch into itself');
  if (!(await fs.pathExists(targetBuild))) throw new Error('Target game branch is not installed');
  await assertNoPendingBranchCopy(targetBuild);
  const keepPath = path.join(sourceBuild, '_patch', 'keep.que');
  const keep = await fs.readFile(keepPath, 'utf8').catch(() => '');
  const version = [...keep.matchAll(/^-v(\d+(?:\.\d+){1,2})-\s*$/gim)].at(-1)?.[1];
  if (!version) throw new Error('The other branch has no versioned full package');
  const manifestPath = path.join(sourceBuild, '_patch', `qmf-${version}.files.json.gz`);
  const manifestBytes = await fs.readFile(manifestPath).catch(() => null);
  if (!manifestBytes) throw new Error('The other branch has no package file list');
  const manifest = JSON.parse(zlib.gunzipSync(manifestBytes).toString('utf8'));
  if (manifest?.schema !== 1 || manifest?.product !== 'quenching-mod' || manifest?.version !== version || !Array.isArray(manifest.files)) {
    throw new Error('Invalid source package file list');
  }
  if (!Number.isSafeInteger(manifest.sequence) || manifest.sequence < 35) throw new Error('Invalid package sequence');

  const records = new Map<string, { path: string; size: number }>();
  for (const record of manifest.files) {
    if (!safeRelative(record?.path)) throw new Error('Invalid source package record');
    if (!PACKAGE_ROOTS.has(record.path.split('/')[0])) throw new Error(`Unexpected package path: ${record.path}`);
    records.set(record.path.toLowerCase(), { path: record.path, size: Number(record.size) || 0 });
  }

  const report = (percent: number, message: string) => options.onProgress?.(percent, message);
  const items: CopyItem[] = [];
  const ownedFiles: string[] = [];
  let totalOwnedBytes = 0;
  let prepared = 0;
  for (const record of records.values()) {
    const relative = record.path;
    const active = path.join(sourceBuild, ...relative.split('/'));
    const parked = path.join(sourceBuild, 'QMoff', ...relative.split('/'));
    const selected = (await fs.lstat(active).catch(() => null))?.isFile() ? active
      : (await fs.lstat(parked).catch(() => null))?.isFile() ? parked : null;
    if (!selected) throw new Error(`The other branch is missing a full-package file: ${relative}`);
    items.push({ source: selected, relative: selected === parked ? `QMoff/${relative}` : relative });
    ownedFiles.push(relative);
    totalOwnedBytes += record.size;
    prepared++;
    if (prepared % 100 === 0 || prepared === records.size) report(Math.round(prepared / records.size * 30), '正在准备安装文件');
  }
  items.push({ source: keepPath, relative: '_patch/keep.que' });
  items.push({ source: manifestPath, relative: `_patch/qmf-${version}.files.json.gz` });
  const installedState = Buffer.from(JSON.stringify({
    product: 'quenching-mod', sequence: manifest.sequence, version,
    displayVersion: manifest.displayVersion || version,
    installedAt: manifest.generatedAt || new Date().toISOString(),
    files: ownedFiles,
    filesDigest: crypto.createHash('sha256').update(JSON.stringify([...ownedFiles].sort())).digest('hex'),
  }));
  items.push({ content: installedState, relative: '.quenching/installed-mod.json' });

  const totalBytes = totalOwnedBytes + manifestBytes.length + Buffer.byteLength(keep) + installedState.length;
  const disk = await statfs(path.dirname(targetBuild));
  const requiredFreeBytes = (options.linkDisposableSource ? 0 : totalBytes) + 512 * 1024 * 1024;
  if (Number(disk.bavail) * Number(disk.bsize) < requiredFreeBytes) {
    throw new Error('Not enough game-drive space for a branch copy');
  }

  let copied = 0;
  for (const item of items) {
    await assertSafeParents(targetBuild, item.relative);
    const dest = path.join(targetBuild, ...item.relative.split('/'));
    await fs.ensureDir(path.dirname(dest));
    if (item.content) {
      await fs.writeFile(dest, item.content);
    } else if (options.linkDisposableSource) {
      await fs.remove(dest);
      await fs.link(item.source!, dest);
    } else {
      await fs.copy(item.source!, dest, { overwrite: true, preserveTimestamps: true });
    }
    copied++;
    if (copied % 100 === 0 || copied === items.length) report(30 + Math.round(copied / items.length * 70), '正在写入游戏目录');
  }
  return items.length;
}
