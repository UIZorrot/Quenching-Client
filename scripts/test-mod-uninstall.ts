import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { removeVerifiedModFiles } from '../src/Main/services/mod-uninstall-service';
import type { ModIntegrityManifest } from '../src/Main/services/mod-integrity-service';

const hash = (text: string) => crypto.createHash('sha256').update(text).digest('hex');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-uninstall-'));
try {
  await fs.outputFile(path.join(root, 't20', 'owned.txt'), 'package');
  await fs.outputFile(path.join(root, 't20', 'custom.txt'), 'player edit');
  await fs.outputFile(path.join(root, 'shaders', 'ps', 'bloomextract.bls'), 'client variant');
  await fs.writeJson(path.join(root, 'shaders', '.quenching-shader-profile'), {
    schema: 1, files: { 'ps/bloomextract.bls': hash('client variant') },
  });
  const manifest = {
    files: [
      { path: 't20/owned.txt', size: 7, sha256: hash('package') },
      { path: 't20/custom.txt', size: 7, sha256: hash('package') },
    ],
  } as ModIntegrityManifest;
  const result = await removeVerifiedModFiles(root, manifest);
  assert.equal(result.removed, 3);
  assert.deepEqual(result.preserved, []);
  assert.equal(await fs.pathExists(path.join(root, 't20', 'owned.txt')), false);
  assert.equal(await fs.pathExists(path.join(root, 't20', 'custom.txt')), false);
  assert.equal(await fs.pathExists(path.join(root, 'shaders', 'ps', 'bloomextract.bls')), false);
  console.log('Known MOD paths are removed even when modified');
} finally {
  await fs.remove(root);
}
