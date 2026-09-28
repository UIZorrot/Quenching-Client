import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { parseReleaseGate } from '../src/shared/release-gate';
import { getModUpdateStatus } from '../src/Main/services/mod-update-service';

assert.deepEqual(parseReleaseGate('v3.4\n'), {
  version: 'v3.4', modVersion: '3.4', allowed: 1, legacyPlainText: true,
});
assert.deepEqual(parseReleaseGate('{"schema":1,"version":"v3.5","modVersion":"3.5","allowed":0}'), {
  version: 'v3.5', modVersion: '3.5', allowed: 0, legacyPlainText: false,
});
for (const invalid of ['<html>no</html>', '{"version":"v3.5","allowed":0}',
  '{"schema":1,"version":"v3.5","modVersion":"3.5","allowed":2}']) {
  assert.throws(() => parseReleaseGate(invalid));
}

function canonicalJson(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-release-gate-'));
const game = path.join(root, 'Warcraft III');
await fs.ensureDir(path.join(game, '_retail_'));
const keys = crypto.generateKeyPairSync('ed25519');
const unsigned = { schema: 1, product: 'quenching-mod', sequence: 35, version: '3.5', displayVersion: '3.5', patches: [] };
const signed = { ...unsigned, signature: { algorithm: 'ed25519',
  value: crypto.sign(null, Buffer.from(canonicalJson(unsigned)), keys.privateKey).toString('base64') } };
let versionText = JSON.stringify({ schema: 1, version: 'v3.5', modVersion: '3.5', allowed: 0 });
const server = http.createServer((request, response) => {
  if (request.url === '/manifest.json') return response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(signed));
  if (request.url === '/version.que') return response.writeHead(200, { 'Content-Type': 'application/json' }).end(versionText);
  response.writeHead(404).end();
});
const oldEnv = {
  manifest: process.env.QUENCHING_MANIFEST_URL,
  version: process.env.QUENCHING_VERSION_URL,
  key: process.env.QUENCHING_UPDATE_PUBLIC_KEY,
  preview: process.env.QUENCHING_PREVIEW_UPDATES,
};
try {
  await new Promise<void>((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no local test port');
  process.env.QUENCHING_MANIFEST_URL = `http://127.0.0.1:${address.port}/manifest.json`;
  process.env.QUENCHING_VERSION_URL = `http://127.0.0.1:${address.port}/version.que`;
  process.env.QUENCHING_UPDATE_PUBLIC_KEY = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  delete process.env.QUENCHING_PREVIEW_UPDATES;

  const staged = await getModUpdateStatus(game);
  assert.equal(staged.decision, 'unavailable');
  assert.match(staged.reason, /staged but not public/);

  versionText = JSON.stringify({ schema: 1, version: 'v3.5', modVersion: '3.5', allowed: 1 });
  assert.equal((await getModUpdateStatus(game)).decision, 'requiresFullPackage');

  versionText = JSON.stringify({ schema: 1, version: 'v3.6', modVersion: '3.6', allowed: 1 });
  const mismatch = await getModUpdateStatus(game);
  assert.equal(mismatch.decision, 'unavailable');
  assert.match(mismatch.reason, /not 3\.5/);

  versionText = JSON.stringify({ schema: 1, version: 'v3.5', modVersion: '3.5', allowed: 0 });
  process.env.QUENCHING_PREVIEW_UPDATES = '1';
  assert.equal((await getModUpdateStatus(game)).decision, 'requiresFullPackage');
  console.log('Version.que staged/public gate, version binding, and internal preview bypass passed');
} finally {
  for (const [name, value] of [
    ['QUENCHING_MANIFEST_URL', oldEnv.manifest], ['QUENCHING_VERSION_URL', oldEnv.version],
    ['QUENCHING_UPDATE_PUBLIC_KEY', oldEnv.key], ['QUENCHING_PREVIEW_UPDATES', oldEnv.preview],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await new Promise<void>(resolve => server.close(() => resolve()));
  await fs.remove(root);
}
