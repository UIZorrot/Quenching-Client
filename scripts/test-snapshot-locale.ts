import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { decodeSnapshot, encodeSnapshot, snapshotDigest } from '../src/Main/services/file-sync-snapshot';
import type { FileSnapshot } from '../src/shared/file-sync';

const files = ['resources/阿.txt', 'resources/Z.txt', 'resources/中.txt', 'resources/a.txt'].map(path =>
  ({ path, size: 1, sha256: 'a'.repeat(64) }));
const base: FileSnapshot = { schema: 1, product: 'quenching-mod', version: '3.6', generatedAt: '', filesDigest: '', files };
const original = String.prototype.localeCompare;
try {
  for (const publisherLocale of ['zh-CN', 'en-US', 'ru-RU', 'ko-KR']) {
    const ordered = [...files].sort((a, b) => original.call(a.path, b.path, publisherLocale));
    const filesDigest = crypto.createHash('sha256').update(ordered.map(f => `${f.path}\0${f.size}\0${f.sha256}\n`).join('')).digest('hex');
    const bytes = gzipSync(Buffer.from(JSON.stringify({ ...base, files: ordered, filesDigest })));
    for (const playerLocale of ['zh-CN', 'en-US', 'ru-RU', 'ko-KR']) {
      String.prototype.localeCompare = function(other: string) { return original.call(this, other, playerLocale); };
      assert.equal(decodeSnapshot(bytes, base.product, base.version).filesDigest, filesDigest);
    }
  }
  String.prototype.localeCompare = function() { throw new Error('Protocol must not use language sorting'); };
  const bytes = encodeSnapshot(base);
  assert.equal(decodeSnapshot(bytes, base.product, base.version).filesDigest, snapshotDigest(files));
  assert.throws(() => decodeSnapshot(gzipSync(Buffer.from(JSON.stringify({ ...base, filesDigest: 'b'.repeat(64) }))), base.product, base.version), /digest mismatch/);
  const frozen = '_irys/releases/3.6-candidate-20261008';
  let official = 0;
  for (const group of ['mod-sync', 'client-sync']) {
    const dir = path.join(frozen, group);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.json.gz'))) {
      const version = name.match(/^snapshot-(\d+(?:\.\d+){1,2})-/)![1];
      decodeSnapshot(fs.readFileSync(path.join(dir, name)), group === 'mod-sync' ? 'quenching-mod' : 'quenching-client', version);
      official++;
    }
  }
  console.log(`PASS snapshot locale independence, legacy wire order, tamper rejection; ${official} frozen official snapshots`);
} finally {
  String.prototype.localeCompare = original;
}
