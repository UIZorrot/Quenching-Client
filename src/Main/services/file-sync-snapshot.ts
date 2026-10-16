import crypto from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { FileSnapshot, validateSnapshot } from '../../shared/file-sync';

export function snapshotDigest(files: FileSnapshot['files']): string {
  return orderedDigest([...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
function orderedDigest(files: FileSnapshot['files']): string {
  return crypto.createHash('sha256').update(files
    .map(file => `${file.path}\0${file.size}\0${file.sha256.toLowerCase()}\n`).join('')).digest('hex');
}
export function decodeSnapshot(data: Buffer, product: FileSnapshot['product'], version: string): FileSnapshot {
  const snapshot = validateSnapshot(JSON.parse(gunzipSync(data, { maxOutputLength: 64 * 1024 ** 2 }).toString('utf8')), product, version);
  // Historical publishers hashed the transmitted array in their local language's
  // order. Do not re-sort that array using the player's locale. Its full gzip
  // bytes have already been authenticated by the signed artifact hash.
  if (snapshot.filesDigest !== orderedDigest(snapshot.files) && snapshot.filesDigest !== snapshotDigest(snapshot.files)) {
    throw new Error('Official snapshot digest mismatch');
  }
  return snapshot;
}
export function encodeSnapshot(snapshot: FileSnapshot): Buffer {
  const files = [...snapshot.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return gzipSync(Buffer.from(JSON.stringify({ ...snapshot, files, filesDigest: orderedDigest(files) })), { level: 9 });
}
