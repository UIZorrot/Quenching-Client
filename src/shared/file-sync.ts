/** Official snapshots are metadata, not a scan of the player's installation. */
export interface SyncFile { path: string; size: number; sha256: string }
export type SyncSource = string | { parts: { url: string; size: number; sha256: string }[] };
export interface SyncArtifact { size: number; sha256: string; sources: SyncSource[] }
export interface FileSnapshot {
  schema: 1;
  product: 'quenching-mod' | 'quenching-client';
  version: string;
  displayVersion?: string;
  sequence?: number;
  runtimeVersion?: string;
  generatedAt: string;
  filesDigest: string;
  files: SyncFile[];
}
export interface FileSyncDescriptor {
  inventory: SyncArtifact;
  /** Signed, ordered optional GitHub Release proxy prefixes. Empty/absent means no implicit mirrors. */
  githubMirrors?: string[];
  /** Content-addressed Release/object-storage URLs; never a directory listing. */
  objects: string[];
  /** Optional per-object transport, e.g. GitLawb chunks plus Release fallback. */
  artifacts?: Record<string, SyncArtifact>;
  /** One snapshot per older release, not one patch per version pair. */
  baselines?: Record<string, SyncArtifact>;
  /** Deletions are explicit and ownership is checked separately before applying. */
  deleted?: { path: string; acceptedSha256: string[] }[];
  deltas?: { path: string; oldSha256: string; artifact: SyncArtifact }[];
}
const HASH = /^[a-f0-9]{64}$/i;
const VERSION = /^\d+(?:\.\d+){1,2}$/;
export function validateGithubMirrors(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) throw new Error('Invalid GitHub mirror policy');
  return [...new Set(value.map(prefix => {
    if (typeof prefix !== 'string') throw new Error('Invalid GitHub mirror prefix');
    let url: URL;
    try { url = new URL(prefix); } catch { throw new Error('Invalid GitHub mirror prefix'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !prefix.endsWith('/')) {
      throw new Error('Invalid GitHub mirror prefix');
    }
    return prefix;
  }))];
}
export function syncPath(path: unknown): string {
  if (typeof path !== 'string' || !path || /[\\:\0]/.test(path) || path.startsWith('/') ||
      path.split('/').some(segment => !segment || segment === '.' || segment === '..' || segment.toLowerCase() === '.quenching')) {
    throw new Error(`Unsafe synchronization path: ${String(path)}`);
  }
  return path;
}
export function validateSyncArtifact(value: any): SyncArtifact {
  if (!value || !Number.isSafeInteger(value.size) || value.size < 0 || !HASH.test(value.sha256) ||
      !Array.isArray(value.sources) || !value.sources.length || value.sources.length > 8 ||
      value.sources.some((source: any) => typeof source === 'string' ? !/^https?:\/\//.test(source) :
        !Array.isArray(source?.parts) || !source.parts.length || source.parts.length > 2048 ||
        source.parts.some((part: any) => typeof part.url !== 'string' || !/^https?:\/\//.test(part.url) ||
          !Number.isSafeInteger(part.size) || part.size <= 0 || !HASH.test(part.sha256)) ||
        source.parts.reduce((total: number, part: any) => total + part.size, 0) !== value.size)) throw new Error('Invalid synchronization artifact');
  return { size: value.size, sha256: value.sha256.toLowerCase(), sources: value.sources.map((source: any) =>
    typeof source === 'string' ? source : { parts: source.parts.map((part: any) => ({ ...part, sha256: part.sha256.toLowerCase() })) }) };
}
export function syncSourceUrls(artifact: SyncArtifact): string[] {
  return artifact.sources.flatMap(source => typeof source === 'string' ? [source] : source.parts.map(part => part.url));
}
export function validateFileSync(value: any): FileSyncDescriptor {
  const inventory = validateSyncArtifact(value?.inventory);
  if (inventory.size > 16 * 1024 ** 2 || !Array.isArray(value.objects) || !value.objects.length || value.objects.length > 8 ||
      value.objects.some((url: unknown) => typeof url !== 'string' || !/^https?:\/\//.test(url) || !url.includes('{sha256}'))) throw new Error('Invalid content-addressed file sources');
  const baselines: Record<string, SyncArtifact> = {};
  for (const [version, artifact] of Object.entries(value.baselines || {})) {
    if (!VERSION.test(version)) throw new Error('Invalid snapshot version');
    baselines[version] = validateSyncArtifact(artifact);
    if (baselines[version].size > 16 * 1024 ** 2) throw new Error('Snapshot is too large');
  }
  const artifacts: Record<string, SyncArtifact> = {};
  for (const [hash, artifact] of Object.entries(value.artifacts || {})) {
    if (!HASH.test(hash)) throw new Error('Invalid content-addressed artifact key');
    const validated = validateSyncArtifact(artifact);
    if (validated.sha256 !== hash.toLowerCase()) throw new Error('Artifact hash differs from object key');
    artifacts[hash.toLowerCase()] = validated;
  }
  if ((value.deleted && !Array.isArray(value.deleted)) || (value.deltas && !Array.isArray(value.deltas))) throw new Error('Invalid file synchronization actions');
  const deleted = (value.deleted || []).map((entry: any) => {
    if (!Array.isArray(entry.acceptedSha256) || !entry.acceptedSha256.length || entry.acceptedSha256.some((hash: unknown) => typeof hash !== 'string' || !HASH.test(hash))) throw new Error('Deletion lacks official ownership hashes');
    return { path: syncPath(entry.path), acceptedSha256: entry.acceptedSha256.map((hash: string) => hash.toLowerCase()) };
  });
  const deltas = (value.deltas || []).map((entry: any) => {
    if (!['QMClient.exe', 'resources/app.asar'].includes(entry.path) || !HASH.test(entry.oldSha256)) throw new Error('Invalid optional binary delta');
    return { path: entry.path, oldSha256: entry.oldSha256.toLowerCase(), artifact: validateSyncArtifact(entry.artifact) };
  });
  return { inventory, objects: value.objects, artifacts, baselines, deleted, deltas, githubMirrors: validateGithubMirrors(value.githubMirrors) };
}
export function validateSnapshot(value: any, product: FileSnapshot['product'], version: string): FileSnapshot {
  if (value?.schema !== 1 || value.product !== product || value.version !== version || !Array.isArray(value.files) || value.files.length > 200000) throw new Error('Official file snapshot does not match release');
  const seen = new Set<string>();
  const files = value.files.map((file: any) => {
    const path = syncPath(file.path);
    if (seen.has(path.toLowerCase()) || !Number.isSafeInteger(file.size) || file.size < 0 || !HASH.test(file.sha256)) throw new Error(`Invalid snapshot record: ${path}`);
    seen.add(path.toLowerCase());
    return { path, size: file.size, sha256: file.sha256.toLowerCase() };
  });
  return { ...value, files };
}
export function planFileSync(previous: readonly SyncFile[], latest: readonly SyncFile[]) {
  const before = new Map(previous.map(file => [file.path.toLowerCase(), file]));
  const changed = latest.filter(file => {
    const old = before.get(file.path.toLowerCase());
    return !old || old.sha256.toLowerCase() !== file.sha256.toLowerCase() || old.size !== file.size;
  });
  // Absence from latest does NOT authorize deleting a directory or player file.
  return { changed, unchanged: latest.length - changed.length, downloadBytes: changed.reduce((sum, file) => sum + file.size, 0) };
}
export function syncFileArtifact(file: SyncFile, descriptor: FileSyncDescriptor): SyncArtifact {
  const artifact = descriptor.artifacts?.[file.sha256];
  if (artifact) {
    if (artifact.size !== file.size) throw new Error('Object size differs from official snapshot');
    return artifact;
  }
  return { size: file.size, sha256: file.sha256, sources: descriptor.objects.map(url => url.replaceAll('{sha256}', file.sha256)) };
}
