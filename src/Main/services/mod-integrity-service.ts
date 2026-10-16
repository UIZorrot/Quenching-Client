import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { resolveRetailDir } from './full-package-service';
import { CurrentModMarker, readCurrentModMarkerAtDir } from './mod-version-detection';

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);
const PRODUCT = 'quenching-mod';
const KEEP_RELATIVE_PATH = '_patch/keep.que';
const BASELINE_BACKUP_RELATIVE_PATH = '_patch/qmf-3.5.files.json.gz';
const MAX_ISSUES = 200;
// Package copies the client deletes on purpose; the water switch recreates them from client assets.
const CLIENT_REMOVED_PREFIXES = ['replaceabletextures/water-rel/', 'replaceabletextures/water-trans/'];

export interface ModIntegrityFileRecord {
  path: string;
  size: number;
  sha256: string;
}

export interface ModIntegrityManifest {
  schema: 1;
  product: typeof PRODUCT;
  version: string;
  displayVersion?: string;
  sequence: number;
  generatedAt: string;
  filesDigest: string;
  files: ModIntegrityFileRecord[];
}

export interface ModIntegrityReport {
  ok: boolean;
  version: string | null;
  sequence: number | null;
  mode: 'presence' | 'full';
  expectedFiles: number;
  checkedFiles: number;
  missing: string[];
  sizeMismatch: string[];
  hashMismatch: string[];
  issueCount: number;
  issuesTruncated: boolean;
  source?: string;
  reason?: string;
}

function normalizeRelative(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || /^[a-z]:\//i.test(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`unsafe integrity path: ${value}`);
  }
  return normalized;
}

function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filePath);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('error', reject);
    input.on('end', () => resolve(hash.digest('hex')));
  });
}

function filesDigest(files: ModIntegrityFileRecord[]): string {
  const canonical = [...files]
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    .map((file) => `${file.path}\0${file.size}\0${file.sha256.toLowerCase()}\n`)
    .join('');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function validateManifest(value: any): ModIntegrityManifest {
  if (!value || value.schema !== 1 || value.product !== PRODUCT || typeof value.version !== 'string' || !Number.isSafeInteger(value.sequence)) {
    throw new Error('unsupported integrity manifest');
  }
  if (!Array.isArray(value.files)) throw new Error('integrity manifest files are missing');
  const seen = new Set<string>();
  const files = value.files.map((item: any) => {
    const relative = normalizeRelative(item?.path);
    if (seen.has(relative)) throw new Error(`duplicate integrity path: ${relative}`);
    seen.add(relative);
    if (!Number.isSafeInteger(item?.size) || item.size < 0 || typeof item?.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(item.sha256)) {
      throw new Error(`invalid integrity record: ${relative}`);
    }
    return { path: relative, size: item.size, sha256: item.sha256.toLowerCase() };
  });
  const digest = filesDigest(files);
  // Accept the original transmitted order for historical locale-sorted lists,
  // just like file-sync-snapshot. New lists have a locale-independent digest.
  const transmittedDigest = crypto.createHash('sha256').update(files
    .map((file) => `${file.path}\0${file.size}\0${file.sha256}\n`).join('')).digest('hex');
  if (typeof value.filesDigest !== 'string' || ![digest, transmittedDigest].includes(value.filesDigest.toLowerCase())) throw new Error('integrity manifest digest mismatch');
  return {
    schema: 1,
    product: PRODUCT,
    version: value.version,
    displayVersion: typeof value.displayVersion === 'string' && value.displayVersion.trim() ? value.displayVersion : value.version,
    sequence: value.sequence,
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : '',
    filesDigest: digest,
    files,
  };
}

function bundledManifestCandidates(version: string): string[] {
  const fileName = `qmf-${version}.files.json.gz`;
  const resourcesPath = (process as any).resourcesPath as string | undefined;
  return Array.from(new Set([
    process.env.QUENCHING_BASELINE_MANIFEST?.trim() || '',
    resourcesPath ? path.join(resourcesPath, 'assets', 'quenching', 'update-baselines', fileName) : '',
    path.join(process.cwd(), 'assets', 'quenching', 'update-baselines', fileName),
  ].filter(Boolean)));
}

export function integrityBackupRelativePath(version: string): string {
  if (!/^\d+(?:\.\d+){1,2}$/.test(version)) throw new Error(`invalid MOD version: ${version}`);
  return `_patch/qmf-${version}.files.json.gz`;
}

async function readGzipManifest(filePath: string): Promise<ModIntegrityManifest> {
  const compressed = await fs.readFile(filePath);
  const value = JSON.parse((await gunzip(compressed)).toString('utf8'));
  return validateManifest(value);
}

export async function loadIntegrityManifest(war3Path: string, version: string): Promise<{ manifest: ModIntegrityManifest; source: string } | null> {
  for (const candidate of bundledManifestCandidates(version)) {
    try {
      const manifest = await readGzipManifest(candidate);
      if (manifest.version === version) return { manifest, source: candidate };
    } catch {
      // Continue to the package-local backup.
    }
  }
  const retailDir = await resolveRetailDir(war3Path);
  const backup = path.join(retailDir, ...integrityBackupRelativePath(version).split('/'));
  try {
    const manifest = await readGzipManifest(backup);
    return manifest.version === version ? { manifest, source: backup } : null;
  } catch {
    return null;
  }
}

export async function prepareUpdatedIntegrityManifest(
  war3Path: string,
  currentVersion: string,
  currentSequence: number,
  targetVersion: string,
  targetDisplayVersion: string,
  targetSequence: number,
  changed: ModIntegrityFileRecord[],
  deleted: string[],
): Promise<Buffer> {
  if (targetVersion === currentVersion || targetSequence <= currentSequence) throw new Error('target integrity version must advance');
  const loaded = await loadIntegrityManifest(war3Path, currentVersion);
  if (!loaded || loaded.manifest.sequence !== currentSequence) throw new Error(`no trusted integrity manifest is available for ${currentVersion}`);
  const files = new Map(loaded.manifest.files.map((file) => [file.path, file]));
  for (const relative of deleted) files.delete(normalizeRelative(relative));
  for (const file of changed) files.set(normalizeRelative(file.path), { path: normalizeRelative(file.path), size: file.size, sha256: file.sha256.toLowerCase() });
  const records = [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
  const manifest: ModIntegrityManifest = {
    schema: 1,
    product: PRODUCT,
    version: targetVersion,
    displayVersion: targetDisplayVersion,
    sequence: targetSequence,
    generatedAt: new Date().toISOString(),
    filesDigest: filesDigest(records),
    files: records,
  };
  return gzip(Buffer.from(JSON.stringify(manifest), 'utf8'), { level: 9 });
}

export async function writeUpdatedIntegrityManifest(war3Path: string, version: string, compressed: Buffer): Promise<void> {
  const retailDir = await resolveRetailDir(war3Path);
  const target = path.join(retailDir, ...integrityBackupRelativePath(version).split('/'));
  await fs.ensureDir(path.dirname(target));
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporary, compressed);
    await fs.move(temporary, target, { overwrite: true });
  } finally {
    await fs.remove(temporary).catch(() => undefined);
  }
}

export async function readKeepVersions(war3Path: string): Promise<string[]> {
  const retailDir = await resolveRetailDir(war3Path);
  const keepPath = path.join(retailDir, ...KEEP_RELATIVE_PATH.split('/'));
  let text: string;
  try {
    text = await fs.readFile(keepPath, 'utf8');
  } catch (error: any) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return [];
    throw error;
  }
  return [...text.matchAll(/^-v(\d+(?:\.\d+){1,2})-\s*$/gim)].map((match) => match[1]);
}

/** Read the tiny version marker only. This must never inspect the resource tree. */
export async function readCurrentModMarker(war3Path: string): Promise<CurrentModMarker | null> {
  const retailDir = await resolveRetailDir(war3Path);
  return readCurrentModMarkerAtDir(retailDir);
}

export async function readCurrentModVersion(war3Path: string): Promise<string | null> {
  return (await readCurrentModMarker(war3Path))?.version ?? null;
}

export async function writeCurrentModVersion(
  war3Path: string,
  version: string,
  sequence?: number,
  displayVersion?: string,
): Promise<void> {
  if (!/^\d+(?:\.\d+){1,2}$/.test(version)) throw new Error(`invalid MOD version: ${version}`);
  if (sequence !== undefined && (!Number.isSafeInteger(sequence) || sequence <= 0)) throw new Error(`invalid MOD sequence: ${sequence}`);
  if (displayVersion !== undefined && !/^\d+(?:\.\d+){1,2}$/.test(displayVersion)) throw new Error(`invalid MOD display version: ${displayVersion}`);
  const retailDir = await resolveRetailDir(war3Path);
  const keepPath = path.join(retailDir, ...KEEP_RELATIVE_PATH.split('/'));
  const marker = await readCurrentModMarker(war3Path);
  if (marker?.version === version &&
      (sequence === undefined || marker.sequence === sequence) &&
      (displayVersion === undefined || marker.displayVersion === displayVersion)) return;
  const existing = await fs.readFile(keepPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return '';
    throw error;
  });
  const lines = marker?.version === version
    ? [sequence === undefined ? '' : `-s${sequence}-`, displayVersion === undefined ? '' : `-d${displayVersion}-`].filter(Boolean)
    : [`-v${version}-`, sequence === undefined ? '' : `-s${sequence}-`, displayVersion === undefined ? '' : `-d${displayVersion}-`].filter(Boolean);
  const next = `${existing.trimEnd()}${existing.trim() ? '\n' : ''}${lines.join('\n')}\n`;
  await fs.ensureDir(path.dirname(keepPath));
  const temporary = `${keepPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporary, next, 'utf8');
    await fs.move(temporary, keepPath, { overwrite: true });
  } finally {
    await fs.remove(temporary).catch(() => undefined);
  }
}

function pushIssue(list: string[], relative: string): void {
  if (list.length < MAX_ISSUES) list.push(relative);
}

export async function verifyModIntegrity(war3Path: string, mode: 'presence' | 'full' = 'presence'): Promise<ModIntegrityReport> {
  const version = await readCurrentModVersion(war3Path);
  if (!version) {
    return { ok: false, version: null, sequence: null, mode, expectedFiles: 0, checkedFiles: 0, missing: [], sizeMismatch: [], hashMismatch: [], issueCount: 1, issuesTruncated: false, reason: '_patch/keep.que has no current version marker' };
  }
  const loaded = await loadIntegrityManifest(war3Path, version);
  if (!loaded) {
    return { ok: false, version, sequence: null, mode, expectedFiles: 0, checkedFiles: 0, missing: [], sizeMismatch: [], hashMismatch: [], issueCount: 1, issuesTruncated: false, reason: `no integrity manifest is available for ${version}` };
  }
  const retailDir = await resolveRetailDir(war3Path);
  const missing: string[] = [];
  const sizeMismatch: string[] = [];
  const hashMismatch: string[] = [];
  let issueCount = 0;
  let checkedFiles = 0;
  const statFile = (absolute: string) => fs.stat(absolute).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  });
  for (const file of loaded.manifest.files) {
    if (CLIENT_REMOVED_PREFIXES.some((prefix) => file.path.toLowerCase().startsWith(prefix))) continue;
    // Graphics/classic switches park package files under QMoff; those still count as installed.
    let absolute = path.join(retailDir, ...file.path.split('/'));
    let stat = await statFile(absolute);
    if (!stat?.isFile()) {
      absolute = path.join(retailDir, 'QMoff', ...file.path.split('/'));
      stat = await statFile(absolute);
    }
    if (!stat?.isFile()) {
      issueCount += 1;
      pushIssue(missing, file.path);
      continue;
    }
    checkedFiles += 1;
    if (mode === 'full' && stat.size !== file.size) {
      issueCount += 1;
      pushIssue(sizeMismatch, file.path);
      continue;
    }
    if (mode === 'full' && await sha256File(absolute) !== file.sha256) {
      issueCount += 1;
      pushIssue(hashMismatch, file.path);
    }
  }
  return {
    ok: issueCount === 0,
    version,
    sequence: loaded.manifest.sequence,
    mode,
    expectedFiles: loaded.manifest.files.length,
    checkedFiles,
    missing,
    sizeMismatch,
    hashMismatch,
    issueCount,
    issuesTruncated: issueCount > missing.length + sizeMismatch.length + hashMismatch.length,
    source: loaded.source,
  };
}

export const MOD_INTEGRITY_PATHS = { keep: KEEP_RELATIVE_PATH, baselineBackup: BASELINE_BACKUP_RELATIVE_PATH } as const;
