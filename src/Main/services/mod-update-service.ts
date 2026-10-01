import crypto from 'crypto';
import childProcess from 'child_process';
import fs from 'fs-extra';
import { statfs } from 'node:fs/promises';
import http from 'http';
import https from 'https';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { extractZipArchive } from './zip-extraction';
import { isFullPackageInstalled, resolveRetailDir } from './full-package-service';
import { fetchReleaseGate, previewUpdatesEnabled } from './release-gate-service';
import { hasLegacy34Sentinels, resolveManagedSequence } from './mod-version-detection';
import {
  loadIntegrityManifest,
  MOD_INTEGRITY_PATHS,
  ModIntegrityReport,
  integrityBackupRelativePath,
  prepareUpdatedIntegrityManifest,
  readCurrentModMarker,
  readCurrentModVersion,
  writeCurrentModVersion,
  writeUpdatedIntegrityManifest,
} from './mod-integrity-service';

const PRODUCT = 'quenching-mod';
const MAX_PATCH_GAP = 6;
const MIN_MANAGED_SEQUENCE = 35;
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const execFile = promisify(childProcess.execFile);

export interface ModUpdatePart {
  url: string;
  size: number;
  sha256: string;
}

export type ModUpdateSource = string | { parts: ModUpdatePart[] };

export interface ModUpdateArtifact {
  id?: string;
  size: number;
  sha256: string;
  /** Ordered from preferred to fallback; full packages use external hosts. */
  sources: ModUpdateSource[];
}

export interface ModPatchArtifact extends ModUpdateArtifact {
  fromSequence: number;
  toSequence: number;
}

export interface ModUpdateManifest {
  schema: 1;
  product: typeof PRODUCT;
  sequence: number;
  version: string;
  /** Public-facing MOD version. Internal version may be 3.51 while this remains 3.5. */
  displayVersion?: string;
  generatedAt?: string;
  minClientVersion?: string;
  fullPackage?: ModUpdateArtifact;
  patches?: ModPatchArtifact[];
  /** Optional detached signature. Verification is enabled when a public key is configured. */
  signature?: { algorithm: 'ed25519'; keyId?: string; value: string };
}

export interface InstalledModState {
  product: typeof PRODUCT;
  sequence: number;
  version: string;
  displayVersion?: string;
  installedAt: string;
  files: string[];
  filesDigest: string;
}

export type ModUpdateDecision =
  | 'upToDate'
  | 'patch'
  | 'requiresFullPackage'
  | 'unknownInstallation'
  | 'unavailable';

export interface ModUpdateStatus {
  decision: ModUpdateDecision;
  current: InstalledModState | null;
  target: { sequence: number; version: string; displayVersion: string } | null;
  patch?: ModPatchArtifact;
  fullPackage?: ModUpdateArtifact;
  reason: string;
  manifestSource?: string;
  integrity?: ModIntegrityReport;
}

export interface ModUpdateOptions {
  manifestUrls?: string[];
  /** Test-only override. Production should use the manifest's source URLs. */
  stagingRoot?: string;
  /** Test/publisher integration override. Never expose this through renderer IPC. */
  publicKeyPem?: string;
  /** Runtime-only progress callback. It is supplied by the main-process IPC handler. */
  onProgress?: (progress: ModUpdateProgress) => void;
}

export interface ModUpdateProgress {
  phase: 'preparing' | 'downloading' | 'verifying' | 'extracting' | 'installing' | 'finalizing' | 'complete';
  percent: number;
  message: string;
  completedBytes?: number;
  totalBytes?: number;
}

export interface ModUpdateResult {
  status: ModUpdateStatus;
  applied: boolean;
  downloadedFrom?: string;
  error?: string;
  configurationError?: string;
}

const DEFAULT_MANIFEST_URLS = [
  'https://qm.txzy.net/api/quenching/manifest.json',
  'https://qm.txzy.net/quenching/manifest.json',
];

function manifestUrls(options?: ModUpdateOptions): string[] {
  const configured = process.env.QUENCHING_MANIFEST_URL?.trim();
  return Array.from(new Set([
    ...(configured ? [configured] : []),
    ...(options?.manifestUrls ?? DEFAULT_MANIFEST_URLS),
  ]));
}

function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function stableFilesDigest(files: string[]): string {
  return crypto.createHash('sha256').update(JSON.stringify([...files].sort())).digest('hex');
}

function parseJsonObject(text: string, label: string): any {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('must be an object');
    return value;
  } catch (error: any) {
    throw new Error(`${label} is not valid JSON: ${error?.message || String(error)}`);
  }
}

function canonicalJson(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

async function updatePublicKey(publicKeyPem?: string): Promise<string> {
  if (publicKeyPem?.trim()) return publicKeyPem;
  const configured = process.env.QUENCHING_UPDATE_PUBLIC_KEY?.replace(/\\n/g, '\n').trim();
  if (configured) return configured;
  const resourcesPath = (process as any).resourcesPath as string | undefined;
  const candidates = [
    resourcesPath ? path.join(resourcesPath, 'assets', 'quenching', 'update-public-key.pem') : '',
    path.join(process.cwd(), 'assets', 'quenching', 'update-public-key.pem'),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = await fs.readFile(candidate, 'utf8').catch(() => '');
    if (key.trim()) return key;
  }
  throw new Error('update public key is not configured');
}

function verifyManifestSignature(value: any, key: string): void {
  const signature = value?.signature;
  if (!signature || signature.algorithm !== 'ed25519' || typeof signature.value !== 'string') {
    throw new Error('manifest signature is missing or invalid');
  }
  const unsigned = { ...value };
  delete unsigned.signature;
  let signatureBytes: Buffer;
  try { signatureBytes = Buffer.from(signature.value, 'base64'); } catch { throw new Error('manifest signature is not base64'); }
  if (!crypto.verify(null, Buffer.from(canonicalJson(unsigned), 'utf8'), key, signatureBytes)) {
    throw new Error('manifest signature verification failed');
  }
}

function validateArtifact(value: any, label: string): ModUpdateArtifact {
  if (!value || typeof value !== 'object') throw new Error(`${label} is missing`);
  if (!Number.isSafeInteger(value.size) || value.size < 0) throw new Error(`${label}.size is invalid`);
  if (typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(value.sha256)) throw new Error(`${label}.sha256 is invalid`);
  if (!Array.isArray(value.sources) || value.sources.length === 0) throw new Error(`${label}.sources is invalid`);
  const sources: ModUpdateSource[] = value.sources.map((source: any, sourceIndex: number) => {
    if (typeof source === 'string' && /^https?:\/\//i.test(source)) return source;
    if (!source || typeof source !== 'object' || Array.isArray(source) || !Array.isArray(source.parts) || source.parts.length === 0 || source.parts.length > 256) {
      throw new Error(`${label}.sources[${sourceIndex}] is invalid`);
    }
    let total = 0;
    const parts: ModUpdatePart[] = source.parts.map((part: any, partIndex: number) => {
      if (!part || typeof part.url !== 'string' || !/^https?:\/\//i.test(part.url) || !Number.isSafeInteger(part.size) || part.size <= 0 || typeof part.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(part.sha256)) {
        throw new Error(`${label}.sources[${sourceIndex}].parts[${partIndex}] is invalid`);
      }
      total += part.size;
      if (!Number.isSafeInteger(total) || total > value.size) throw new Error(`${label}.sources[${sourceIndex}] exceeds artifact size`);
      return { url: part.url, size: part.size, sha256: part.sha256.toLowerCase() };
    });
    if (total !== value.size) throw new Error(`${label}.sources[${sourceIndex}] has wrong total size`);
    return { parts };
  });
  return { id: typeof value.id === 'string' ? value.id : undefined, size: value.size, sha256: value.sha256.toLowerCase(), sources };
}

function validateManifest(value: any): ModUpdateManifest {
  if (value.schema !== 1 || value.product !== PRODUCT) throw new Error('unsupported manifest schema or product');
  if (!Number.isSafeInteger(value.sequence) || value.sequence < MIN_MANAGED_SEQUENCE || typeof value.version !== 'string' || !/^\d+(?:\.\d+){1,2}$/.test(value.version)) {
    throw new Error('manifest sequence/version is invalid');
  }
  if (value.displayVersion !== undefined && (typeof value.displayVersion !== 'string' || !value.displayVersion.trim())) throw new Error('manifest displayVersion is invalid');
  const manifest: ModUpdateManifest = {
    schema: 1,
    product: PRODUCT,
    sequence: value.sequence,
    version: value.version,
    displayVersion: value.displayVersion ?? value.version,
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : undefined,
    minClientVersion: typeof value.minClientVersion === 'string' ? value.minClientVersion : undefined,
    fullPackage: value.fullPackage ? validateArtifact(value.fullPackage, 'fullPackage') : undefined,
    patches: [],
    signature: value.signature,
  };
  if (!Array.isArray(value.patches)) throw new Error('manifest.patches is missing');
  manifest.patches = value.patches.map((patch: any, index: number) => {
    const artifact = validateArtifact(patch, `patches[${index}]`);
    if (!Number.isSafeInteger(patch.fromSequence) || !Number.isSafeInteger(patch.toSequence) || patch.toSequence <= patch.fromSequence) {
      throw new Error(`patches[${index}] sequence is invalid`);
    }
    return { ...artifact, fromSequence: patch.fromSequence, toSequence: patch.toSequence };
  });
  return manifest;
}

async function requestText(url: string, redirects = 0): Promise<string> {
  if (url.startsWith('file://')) return fs.readFile(new URL(url), 'utf8');
  // Node's HTTP stack connects directly; Electron's net.fetch inherits the system proxy.
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, { headers: { Accept: 'application/json' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= MAX_REDIRECTS) return reject(new Error('too many redirects'));
        return requestText(new URL(response.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode || 0}`));
      }
      let size = 0;
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_MANIFEST_BYTES) {
          request.destroy(new Error('manifest too large'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      response.on('error', reject);
    });
    request.setTimeout(20_000, () => request.destroy(new Error('request timeout')));
    request.on('error', reject);
  });
}

export async function fetchModManifest(options?: ModUpdateOptions): Promise<{ manifest: ModUpdateManifest; source: string }> {
  const publicKey = await updatePublicKey(options?.publicKeyPem);
  const errors: string[] = [];
  for (const url of manifestUrls(options)) {
    try {
      const value = parseJsonObject(await requestText(url), 'manifest');
      verifyManifestSignature(value, publicKey);
      const manifest = validateManifest(value);
      return { manifest, source: url };
    } catch (error: any) {
      errors.push(`${url}: ${error?.message || String(error)}`);
    }
  }
  throw new Error(`all manifest sources failed: ${errors.join('; ')}`);
}

function lightweightState(sequence: number, version: string, displayVersion = version): InstalledModState {
  const files: string[] = [];
  return { product: PRODUCT, sequence, version, displayVersion, installedAt: '', files, filesDigest: stableFilesDigest(files) };
}

/**
 * Automatic checks read only _patch/keep.que. The 3.5 full package predates
 * sequence lines, so its one known sequence is supplied here.
 */
async function readMarkedState(war3Path: string): Promise<InstalledModState | null> {
  const marker = await readCurrentModMarker(war3Path);
  if (!marker) return null;
  const sequence = resolveManagedSequence(marker);
  if (sequence === null) return null;
  return lightweightState(sequence, marker.version, marker.displayVersion || marker.version);
}

/** 3.4 has no modern marker. Detect it with three fixed folder sentinels only. */
async function readLegacy34State(war3Path: string): Promise<InstalledModState | null> {
  if (await readCurrentModVersion(war3Path)) return null;
  const retailDir = await resolveRetailDir(war3Path);
  return await hasLegacy34Sentinels(retailDir) ? lightweightState(34, '3.4') : null;
}

export async function writeInstalledModState(war3Path: string, state: InstalledModState): Promise<void> {
  const retailDir = await resolveRetailDir(war3Path);
  const statePath = path.join(retailDir, '.quenching', 'installed-mod.json');
  await fs.ensureDir(path.dirname(statePath));
  const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeJson(temporaryPath, state, { spaces: 2 });
    await fs.move(temporaryPath, statePath, { overwrite: true });
  } finally {
    await fs.remove(temporaryPath).catch(() => undefined);
  }
}

function normalizeRelativePath(value: string): string {
  if (typeof value !== 'string') throw new Error('path must be a string');
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || /^[a-z]:\//i.test(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`unsafe relative path: ${value}`);
  }
  if (normalized.split('/').some((segment) => segment.toLowerCase() === '.quenching')) {
    throw new Error(`patch cannot modify updater management files: ${value}`);
  }
  return normalized;
}

function assertPatchResourcePath(relative: string): void {
  const lower = relative.toLowerCase();
  if (lower === MOD_INTEGRITY_PATHS.keep.toLowerCase() || /^_patch\/qmf-[^/]+\.files\.json\.gz$/.test(lower)) {
    throw new Error(`patch cannot modify updater metadata: ${relative}`);
  }
}

export async function assertWarcraftNotRunning(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFile('tasklist.exe', ['/FI', 'IMAGENAME eq Warcraft III.exe', '/FO', 'CSV', '/NH'], {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      });
      if (stdout.toLowerCase().includes('warcraft iii.exe')) throw new Error('Warcraft III is running; close the game before updating');
      return;
    }
    const { stdout } = await execFile('ps', ['-A', '-o', 'comm='], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    const running = stdout.split(/\r?\n/).some((command) => path.basename(command.trim()).toLowerCase().replace(/\.exe$/, '') === 'warcraft iii');
    if (running) throw new Error('Warcraft III is running; close the game before updating');
  } catch (error: any) {
    if (String(error?.message || error).includes('Warcraft III is running')) throw error;
    throw new Error(`cannot verify whether Warcraft III is running: ${error?.message || String(error)}`);
  }
}

function resolveSafe(root: string, relative: string): string {
  const normalized = normalizeRelativePath(relative);
  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, normalized);
  if (target !== rootResolved && !target.startsWith(`${rootResolved}${path.sep}`)) throw new Error(`unsafe target path: ${relative}`);
  return target;
}

export async function getModUpdateStatus(war3Path: string, options?: ModUpdateOptions): Promise<ModUpdateStatus> {
  let fetched: { manifest: ModUpdateManifest; source: string };
  try {
    fetched = await fetchModManifest(options);
  } catch (error: any) {
    const reason = String(error?.message || error);
    if (/manifest signature (?:verification failed|is missing or invalid|is not base64)/.test(reason)) {
      throw error;
    }
    if (reason === 'update public key is not configured' || reason.startsWith('all manifest sources failed:')) {
      return { decision: 'unavailable', current: await readMarkedState(war3Path) || await readLegacy34State(war3Path), target: null, reason };
    }
    throw error;
  }
  const { manifest, source } = fetched;
  // The signed manifest authenticates patch contents; version.que separately
  // controls when that already-staged release becomes publicly actionable.
  // Explicit test options and internal preview launches are the only bypasses.
  if (!options?.manifestUrls && !options?.publicKeyPem && !previewUpdatesEnabled()) {
    try {
      const { gate } = await fetchReleaseGate();
      const displayVersion = manifest.displayVersion || manifest.version;
      if (gate.allowed === 0 || gate.modVersion !== displayVersion) {
        return {
          decision: 'unavailable', current: await readMarkedState(war3Path) || await readLegacy34State(war3Path), target: null,
          reason: gate.allowed === 0 ? `${gate.version} is staged but not public` :
            `version.que allows MOD ${gate.modVersion}, not ${displayVersion}`,
          manifestSource: source,
        };
      }
    } catch (error: any) {
      return { decision: 'unavailable', current: await readMarkedState(war3Path) || await readLegacy34State(war3Path), target: null,
        reason: `release gate unavailable: ${error?.message || String(error)}`, manifestSource: source };
    }
  }
  let current = await readMarkedState(war3Path);
  if (!current) current = await readLegacy34State(war3Path);
  const target = { sequence: manifest.sequence, version: manifest.version, displayVersion: manifest.displayVersion || manifest.version };
  if (!current) {
    const complete = await isFullPackageInstalled(war3Path);
    return {
      decision: complete ? 'unknownInstallation' : 'requiresFullPackage',
      current: null,
      target,
      fullPackage: manifest.fullPackage,
      reason: complete ? 'full package exists but its managed version is unknown' : 'no managed full package is installed',
      manifestSource: source,
    };
  }
  if (current.sequence < MIN_MANAGED_SEQUENCE && current.sequence !== 34) {
    return { decision: 'requiresFullPackage', current, target, fullPackage: manifest.fullPackage, reason: 'no migration exists for this MOD version', manifestSource: source };
  }
  if (current.sequence >= manifest.sequence) {
    return { decision: 'upToDate', current, target, reason: 'installed MOD is current', manifestSource: source };
  }
  if (manifest.sequence - current.sequence > MAX_PATCH_GAP) {
    return { decision: 'requiresFullPackage', current, target, fullPackage: manifest.fullPackage, reason: `version gap exceeds ${MAX_PATCH_GAP}`, manifestSource: source };
  }
  const patch = manifest.patches
    ?.filter((item) => item.fromSequence <= current.sequence && item.toSequence === manifest.sequence)
    .sort((a, b) => b.fromSequence - a.fromSequence)[0];
  if (!patch) {
    return { decision: 'requiresFullPackage', current, target, fullPackage: manifest.fullPackage, reason: 'no compatible cumulative patch is published for this installed sequence', manifestSource: source };
  }
  return { decision: 'patch', current, target, patch, reason: `cumulative patch from baseline ${patch.fromSequence} is available`, manifestSource: source };
}

async function downloadArtifact(
  artifact: ModUpdateArtifact,
  destination: string,
  onDownload?: (completed: number, total: number) => void,
  onVerifying?: () => void,
): Promise<string> {
  const errors: string[] = [];
  const partPath = `${destination}.part`;
  for (const source of artifact.sources) {
    const label = typeof source === 'string' ? source : `chunked:${source.parts[0].url}`;
    try {
      await fs.ensureDir(path.dirname(destination));
      if (typeof source === 'string' && source.startsWith('file://')) {
        await fs.copyFile(fileURLToPath(source), destination);
        onDownload?.(artifact.size, artifact.size);
      } else if (typeof source === 'string') {
        await downloadUrl(source, destination, artifact.size, 0, (received) => onDownload?.(received, artifact.size));
      } else {
        let completed = 0;
        for (const part of source.parts) {
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
              await downloadUrl(part.url, partPath, part.size, 0, (received) => onDownload?.(completed + received, artifact.size));
              const partStat = await fs.stat(partPath);
              if (partStat.size !== part.size) throw new Error(`part size mismatch: expected ${part.size}, got ${partStat.size}`);
              const partHash = await sha256File(partPath);
              if (partHash !== part.sha256) throw new Error(`part sha256 mismatch: expected ${part.sha256}, got ${partHash}`);
              break;
            } catch (error) {
              await fs.remove(partPath).catch(() => undefined);
              if (attempt === 3) throw error;
              await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            }
          }
          await pipeline(fs.createReadStream(partPath), fs.createWriteStream(destination, { flags: 'a' }));
          await fs.remove(partPath);
          completed += part.size;
          onDownload?.(completed, artifact.size);
        }
      }
      const stat = await fs.stat(destination);
      if (stat.size !== artifact.size) throw new Error(`size mismatch: expected ${artifact.size}, got ${stat.size}`);
      onVerifying?.();
      const hash = await sha256File(destination);
      if (hash !== artifact.sha256.toLowerCase()) throw new Error(`sha256 mismatch: expected ${artifact.sha256}, got ${hash}`);
      return label;
    } catch (error: any) {
      const detail = `${label}: ${error?.message || String(error)}`;
      errors.push(detail);
      console.warn(`[mod-update] source failed; trying next source if available: ${detail}`);
      await fs.remove(destination).catch(() => undefined);
      await fs.remove(partPath).catch(() => undefined);
    }
  }
  throw new Error(`all artifact sources failed: ${errors.join('; ')}`);
}

async function downloadUrl(
  url: string,
  destination: string,
  expectedSize: number,
  redirects = 0,
  onProgress?: (received: number) => void,
): Promise<void> {
  // Keep patch downloads on the same direct connection path as manifest requests.
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, { headers: { 'User-Agent': 'Quenching-Mod-Updater/1' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= MAX_REDIRECTS) return reject(new Error('too many redirects'));
        return downloadUrl(new URL(response.headers.location, url).toString(), destination, expectedSize, redirects + 1, onProgress).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode || 0}`));
      }
      const declared = Number(response.headers['content-length'] || 0);
      if (declared > expectedSize) {
        response.resume();
        return reject(new Error(`download exceeds declared artifact size: ${declared} > ${expectedSize}`));
      }
      let received = 0;
      let lastReportAt = 0;
      let lastReportedPercent = -1;
      const limiter = new Transform({
        transform(chunk, _encoding, callback) {
          received += chunk.length;
          if (received > expectedSize) return callback(new Error(`download exceeds declared artifact size: ${received} > ${expectedSize}`));
          const now = Date.now();
          const percent = Math.floor(received / Math.max(expectedSize, 1) * 100);
          if (received === expectedSize || (percent !== lastReportedPercent && now - lastReportAt >= 200)) {
            lastReportAt = now;
            lastReportedPercent = percent;
            onProgress?.(received);
          }
          callback(null, chunk);
        },
      });
      const output = fs.createWriteStream(destination);
      response.pipe(limiter).pipe(output);
      output.on('finish', () => output.close(() => resolve()));
      output.on('error', reject);
      limiter.on('error', reject);
      response.on('error', reject);
    });
    request.setTimeout(60_000, () => request.destroy(new Error('download timeout')));
    request.on('error', reject);
  });
}

interface PatchFileRecord {
  path: string;
  size: number;
  sha256: string;
  previousSha256?: string | null;
  acceptedPreviousSha256?: string[];
  allowMissing?: boolean;
}
interface PatchDeleteRecord {
  path: string;
  previousSha256?: string;
  acceptedPreviousSha256?: string[];
  allowMissing?: boolean;
}
interface PatchDocument { schema: 1; product: typeof PRODUCT; fromSequence: number; toSequence: number; files: PatchFileRecord[]; deleted?: PatchDeleteRecord[] }

async function assertPatchSpace(unpackedBytes: number, gameDir: string): Promise<void> {
  const stats = await statfs(gameDir);
  const freeBytes = Number(stats.bavail) * Number(stats.bsize);
  // The archive has already been unpacked; reserve one more copy for
  // originals/rollback, plus a fixed safety margin.
  const requiredBytes = unpackedBytes + 512 * 1024 ** 2;
  if (!Number.isSafeInteger(requiredBytes) || freeBytes < requiredBytes) {
    throw new Error(`Insufficient game-drive space for MOD update: need at least ${
      (requiredBytes / 1024 ** 3).toFixed(1)} GiB free after download; available ${
      (freeBytes / 1024 ** 3).toFixed(1)} GiB`);
  }
}

async function applyPatchArchive(
  archivePath: string,
  war3Path: string,
  current: InstalledModState,
  target: { sequence: number; version: string; displayVersion: string },
  stagingRoot: string,
  checkSpace: boolean,
  onProgress?: (percent: number, message: string) => void,
): Promise<void> {
  let lastProgressPercent = -1;
  let lastProgressMessage = '';
  const progress = (percent: number, message: string) => {
    const rounded = Math.max(0, Math.min(100, Math.round(percent)));
    if (rounded === lastProgressPercent && message === lastProgressMessage) return;
    lastProgressPercent = rounded;
    lastProgressMessage = message;
    onProgress?.(rounded, message);
  };
  const legacy34 = current.sequence === 34 && current.version === '3.4';
  const patchRoot = path.join(stagingRoot, 'patch');
  await fs.remove(patchRoot);
  progress(0, '正在解压 MOD 更新包');
  const unpackedBytes = await extractZipArchive(archivePath, patchRoot, {
    onProgress: (percent) => progress(percent * 0.3, '正在解压 MOD 更新包'),
  });
  progress(34, '正在校验更新内容');
  if (checkSpace) await assertPatchSpace(unpackedBytes, await resolveRetailDir(war3Path));
  const patchPath = path.join(patchRoot, 'patch.json');
  const document = JSON.parse(await fs.readFile(patchPath, 'utf8')) as PatchDocument;
  if (document.schema !== 1 || document.product !== PRODUCT || document.fromSequence > current.sequence || document.toSequence !== target.sequence) {
    throw new Error('patch metadata does not match installed and target sequences');
  }
  if (!Array.isArray(document.files)) throw new Error('patch files are missing');
  const retailDir = await resolveRetailDir(war3Path);
  const payloadRoot = path.join(patchRoot, 'payload');
  const files = document.files.map((item) => ({ ...item, path: normalizeRelativePath(item.path) }));
  for (const item of files) {
    assertPatchResourcePath(item.path);
    if (!(await fs.pathExists(resolveSafe(payloadRoot, item.path)))) throw new Error(`patch payload is missing: ${item.path}`);
  }
  const deletedRecords = (document.deleted ?? []).map((item) => ({ ...item, path: normalizeRelativePath(item.path) }));
  for (const item of deletedRecords) assertPatchResourcePath(item.path);
  const deleted = deletedRecords.map((item) => item.path);
  const deleteOnDisk: string[] = [];
  for (const item of deletedRecords) {
    const absolute = resolveSafe(retailDir, item.path);
    const stat = await fs.lstat(absolute).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
      throw error;
    });
    if (!stat) continue;
    if (!stat.isFile() || stat.isSymbolicLink()) {
      console.warn(`[ModUpdate] Preserved non-file at deleted managed path: ${item.path}`);
      continue;
    }
    const accepted = new Set([item.previousSha256, ...(item.acceptedPreviousSha256 ?? [])]
      .filter((hash): hash is string => typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash))
      .map((hash) => hash.toLowerCase()));
    if (accepted.size === 0) throw new Error(`patch deletion has no trusted previous hash: ${item.path}`);
    const existingHash = await sha256File(absolute);
    if (accepted.has(existingHash)) deleteOnDisk.push(item.path);
    else console.warn(`[ModUpdate] Preserved player-modified file removed from the official package: ${item.path}`);
  }
  const nextIntegrity = await prepareUpdatedIntegrityManifest(
    war3Path,
    current.version,
    current.sequence,
    target.version,
    target.displayVersion,
    target.sequence,
    files.map(({ path: filePath, size, sha256 }) => ({ path: filePath, size, sha256 })),
    deleted,
  );
  // Re-check immediately before the first write, so a running game never sees a partial MOD tree.
  await assertWarcraftNotRunning();
  const updateRoot = path.join(retailDir, '.quenching', 'updates');
  const backupRoot = path.join(updateRoot, `backup-${current.sequence}-${target.sequence}-${Date.now()}`);
  const journalPath = path.join(updateRoot, 'apply-journal.json');
  const touched = [...new Set([...files.map((item) => item.path), ...deleteOnDisk, MOD_INTEGRITY_PATHS.keep, integrityBackupRelativePath(target.version), ...(legacy34 ? ['patch/keep.que'] : [])])];
  const existedBefore = new Set<string>();
  await fs.ensureDir(backupRoot);
  await fs.writeJson(journalPath, { product: PRODUCT, fromSequence: current.sequence, toSequence: target.sequence, touched, backupRoot, createdAt: new Date().toISOString() }, { spaces: 2 });
  try {
    for (let index = 0; index < touched.length; index += 1) {
      const relative = touched[index];
      const existing = resolveSafe(retailDir, relative);
      if (await fs.pathExists(existing)) {
        existedBefore.add(relative);
        const backup = resolveSafe(backupRoot, relative);
        await fs.ensureDir(path.dirname(backup));
        await fs.copy(existing, backup, { overwrite: true });
      }
      progress(40 + (index + 1) / Math.max(touched.length, 1) * 25, '正在备份将被更新的文件');
    }
    for (let index = 0; index < files.length; index += 1) {
      const item = files[index];
      const targetPath = resolveSafe(retailDir, item.path);
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(resolveSafe(payloadRoot, item.path), targetPath, { overwrite: true });
      progress(65 + (index + 1) / Math.max(files.length, 1) * 30, '正在安装 MOD 更新');
    }
    for (const relative of deleteOnDisk) await fs.remove(resolveSafe(retailDir, relative));
    if (legacy34) await fs.remove(resolveSafe(retailDir, 'patch/keep.que'));
    await writeUpdatedIntegrityManifest(war3Path, target.version, nextIntegrity);
    await writeCurrentModVersion(war3Path, target.version, target.sequence, target.displayVersion);
    progress(98, '正在写入版本信息');
    const nextFiles = [...new Set([...current.files.map(normalizeRelativePath), ...files.map((item) => item.path)].filter((item) => !deleted.includes(item)))].sort();
    await writeInstalledModState(war3Path, { product: PRODUCT, sequence: target.sequence, version: target.version, displayVersion: target.displayVersion, installedAt: new Date().toISOString(), files: nextFiles, filesDigest: stableFilesDigest(nextFiles) });
    // The transaction is committed once the state marker is atomically moved.
    // Cleanup failures are harmless and must not roll files back behind the new marker.
    await fs.remove(journalPath).catch(() => undefined);
    if (legacy34) await fs.rmdir(path.join(retailDir, 'patch')).catch(() => undefined);
    else await fs.remove(backupRoot).catch(() => undefined);
  } catch (error) {
    for (const relative of touched) {
      const backup = resolveSafe(backupRoot, relative);
      const targetPath = resolveSafe(retailDir, relative);
      if (await fs.pathExists(backup)) await fs.copy(backup, targetPath, { overwrite: true });
      else if (!existedBefore.has(relative)) await fs.remove(targetPath);
    }
    throw error;
  }
}

export async function applyModUpdate(war3Path: string, options?: ModUpdateOptions): Promise<ModUpdateResult> {
  const report = (phase: ModUpdateProgress['phase'], percent: number, message: string, completedBytes?: number, totalBytes?: number) => {
    options?.onProgress?.({ phase, percent: Math.max(0, Math.min(100, Math.round(percent))), message, completedBytes, totalBytes });
  };
  report('preparing', 0, '正在准备 MOD 更新');
  const status = await getModUpdateStatus(war3Path, options);
  if (status.decision !== 'patch' || !status.patch || !status.current || !status.target) return { status, applied: false };
  // A portable Warcraft install may live on a roomy game drive while the
  // system drive is nearly full. Keep download/extraction staging beside the
  // selected branch, and never spill a large patch into os.tmpdir by default.
  const retailDir = await resolveRetailDir(war3Path);
  const base = options?.stagingRoot || path.join(retailDir, '.quenching', 'update-staging');
  const runRoot = path.join(base, `${status.current.sequence}-to-${status.target.sequence}-${Date.now()}`);
  const archivePath = path.join(runRoot, 'patch.qdelta');
  try {
    await assertWarcraftNotRunning();
    report('preparing', 3, '正在读取已安装版本');
    // The full file list is deliberately loaded only after the player has
    // accepted the update. It never participates in automatic version checks.
    const baseline = await loadIntegrityManifest(war3Path, status.current.version);
    if (!baseline || baseline.manifest.sequence !== status.current.sequence) {
      throw new Error(`no trusted file list is available for installed MOD ${status.current.version}`);
    }
    const managedFiles = baseline.manifest.files.map((file) => file.path);
    const current = {
      ...status.current,
      installedAt: baseline.manifest.generatedAt,
      files: managedFiles,
      filesDigest: stableFilesDigest(managedFiles),
    };
    const downloadedFrom = await downloadArtifact(
      status.patch,
      archivePath,
      (completed, total) => report('downloading', 5 + completed / Math.max(total, 1) * 65, '正在下载 MOD 更新', completed, total),
      () => report('verifying', 72, '正在校验下载文件', status.patch?.size, status.patch?.size),
    );
    await applyPatchArchive(
      archivePath,
      war3Path,
      current,
      status.target,
      runRoot,
      !options?.stagingRoot,
      (percent, message) => report(percent < 34 ? 'extracting' : percent < 98 ? 'installing' : 'finalizing', 74 + percent * 0.25, message),
    );
    report('complete', 100, 'MOD 更新完成');
    return { status, applied: true, downloadedFrom };
  } catch (error: any) {
    return { status, applied: false, error: error?.message || String(error) };
  } finally {
    await fs.remove(runRoot).catch(() => undefined);
  }
}

export async function getInstalledModState(war3Path: string): Promise<InstalledModState | null> {
  return await readMarkedState(war3Path) || await readLegacy34State(war3Path);
}

export const MOD_UPDATE_DEFAULTS = { product: PRODUCT, minManagedSequence: MIN_MANAGED_SEQUENCE, maxPatchGap: MAX_PATCH_GAP, manifestUrls: DEFAULT_MANIFEST_URLS } as const;
