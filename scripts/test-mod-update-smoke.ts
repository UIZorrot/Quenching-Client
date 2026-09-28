import archiver from 'archiver';
import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import http from 'http';
import zlib from 'zlib';
import {
  applyModUpdate,
  getInstalledModState,
  getModUpdateStatus,
  writeInstalledModState,
} from '../src/Main/services/mod-update-service';
import { readCurrentModVersion, verifyModIntegrity } from '../src/Main/services/mod-integrity-service';

async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function createZip(sourceDir: string, outputPath: string): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize().catch(reject);
  });
}

function canonicalJson(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

async function startStaticServer(root: string): Promise<{ origin: string; close: () => Promise<void> }> {
  const server = http.createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname).replace(/^\/+/, '');
      const target = path.resolve(root, requestPath);
      const resolvedRoot = path.resolve(root);
      if (!target.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error('unsafe request path');
      const stat = await fs.stat(target);
      response.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': target.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
      fs.createReadStream(target).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('cannot resolve test server address');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function main() {
  const previousBaselineManifest = process.env.QUENCHING_BASELINE_MANIFEST;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-update-smoke-'));
  const war3Path = path.join(root, 'Warcraft III');
  const retail = path.join(war3Path, '_retail_');
  const publish = path.join(root, 'publish');
  const patchRoot = path.join(root, 'patch-source');
  const patchArchive = path.join(publish, 'delta-35-to-36.qdelta');
  const manifestPath = path.join(publish, 'manifest.json');
  let server: Awaited<ReturnType<typeof startStaticServer>> | null = null;

  try {
    await fs.outputFile(path.join(retail, 'textures', 'changed.txt'), 'version 3.5\n');
    await fs.outputFile(path.join(retail, 'textures', 'removed.txt'), 'remove me\n');
    await fs.outputFile(path.join(retail, 'textures', 'untouched.txt'), 'must remain unchanged\n');
    await fs.outputFile(path.join(retail, '_patch', 'keep.que'), '-v3.0-\n-v3.5-\n');
    const baselineFiles = await Promise.all(['textures/changed.txt', 'textures/removed.txt', 'textures/untouched.txt'].map(async (relative) => {
      const absolute = path.join(retail, ...relative.split('/'));
      return { path: relative, size: (await fs.stat(absolute)).size, sha256: await hashFile(absolute) };
    }));
    const baselineDigest = crypto.createHash('sha256').update(baselineFiles.map((file) => `${file.path}\0${file.size}\0${file.sha256}\n`).join('')).digest('hex');
    const baselinePath = path.join(retail, '_patch', 'qmf-3.5.files.json.gz');
    await fs.outputFile(baselinePath, zlib.gzipSync(JSON.stringify({
      schema: 1, product: 'quenching-mod', version: '3.5', sequence: 35,
      generatedAt: new Date().toISOString(), filesDigest: baselineDigest, files: baselineFiles,
    })));
    process.env.QUENCHING_BASELINE_MANIFEST = baselinePath;

    const changedPath = path.join(patchRoot, 'payload', 'textures', 'changed.txt');
    const addedPath = path.join(patchRoot, 'payload', 'textures', 'added.txt');
    await fs.outputFile(changedPath, 'version 3.51 pulled from delta\n');
    await fs.outputFile(addedPath, 'new in internal 3.51\n');
    const previousChangedSha256 = await hashFile(path.join(retail, 'textures', 'changed.txt'));
    const previousRemovedSha256 = await hashFile(path.join(retail, 'textures', 'removed.txt'));
    await fs.writeJson(path.join(patchRoot, 'patch.json'), {
      schema: 1,
      product: 'quenching-mod',
      fromSequence: 35,
      toSequence: 36,
      files: [
        { path: 'textures/changed.txt', size: (await fs.stat(changedPath)).size, sha256: await hashFile(changedPath), acceptedPreviousSha256: [previousChangedSha256], allowMissing: false },
        { path: 'textures/added.txt', size: (await fs.stat(addedPath)).size, sha256: await hashFile(addedPath), acceptedPreviousSha256: [], allowMissing: true },
      ],
      deleted: [{ path: 'textures/removed.txt', acceptedPreviousSha256: [previousRemovedSha256], allowMissing: false }],
    }, { spaces: 2 });
    await createZip(patchRoot, patchArchive);
    const archiveBytes = await fs.readFile(patchArchive);
    const split = Math.floor(archiveBytes.length / 2);
    const chunks = [archiveBytes.subarray(0, split), archiveBytes.subarray(split)];
    const partNames = ['delta-35-to-36.qdelta.part000', 'delta-35-to-36.qdelta.part001'];
    await Promise.all(chunks.map((chunk, index) => fs.writeFile(path.join(publish, partNames[index]), chunk)));

    server = await startStaticServer(publish);
    const manifest: any = {
      schema: 1,
      product: 'quenching-mod',
      sequence: 36,
      version: '3.51',
      displayVersion: '3.5',
      generatedAt: new Date().toISOString(),
      patches: [{
        id: 'smoke-35-to-36',
        fromSequence: 35,
        toSequence: 36,
        size: (await fs.stat(patchArchive)).size,
        sha256: await hashFile(patchArchive),
        sources: [
          `${server.origin}/missing-mirror.qdelta`,
          { parts: chunks.map((chunk, index) => ({
            url: `${server.origin}/${partNames[index]}`,
            size: chunk.length,
            sha256: crypto.createHash('sha256').update(chunk).digest('hex'),
          })) },
        ],
      }],
    };
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    manifest.signature = {
      algorithm: 'ed25519',
      keyId: 'smoke-test',
      value: crypto.sign(null, Buffer.from(canonicalJson(manifest), 'utf8'), privateKey).toString('base64'),
    };
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    const options = {
      manifestUrls: [`${server.origin}/manifest.json`],
      stagingRoot: path.join(root, 'staging'),
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    };
    const tampered = { ...manifest, displayVersion: '3.6' };
    await fs.writeJson(manifestPath, tampered, { spaces: 2 });
    let tamperRejected = false;
    try {
      await getModUpdateStatus(war3Path, options);
    } catch (error: any) {
      tamperRejected = String(error?.message || error).includes('signature verification failed');
    }
    if (!tamperRejected) throw new Error('tampered manifest was not rejected');
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    const before = await getModUpdateStatus(war3Path, options);
    if (before.decision !== 'patch' || before.patch?.fromSequence !== 35 || before.target?.sequence !== 36 || before.target.displayVersion !== '3.5') {
      throw new Error(`unexpected pre-update status: ${JSON.stringify(before)}`);
    }

    const result = await applyModUpdate(war3Path, options);
    if (!result.applied) throw new Error(`update was not applied: ${result.error || JSON.stringify(result.status)}`);
    if (!result.downloadedFrom?.startsWith('chunked:')) throw new Error('chunked mirror fallback was not used');

    const changed = await fs.readFile(path.join(retail, 'textures', 'changed.txt'), 'utf8');
    const added = await fs.readFile(path.join(retail, 'textures', 'added.txt'), 'utf8');
    const untouched = await fs.readFile(path.join(retail, 'textures', 'untouched.txt'), 'utf8');
    const removedExists = await fs.pathExists(path.join(retail, 'textures', 'removed.txt'));
    const installed = await getInstalledModState(war3Path);
    const keepVersion = await readCurrentModVersion(war3Path);
    const after = await getModUpdateStatus(war3Path, options);

    if (changed !== 'version 3.51 pulled from delta\n') throw new Error('changed file was not replaced');
    if (added !== 'new in internal 3.51\n') throw new Error('new file was not installed');
    if (untouched !== 'must remain unchanged\n') throw new Error('untouched file was modified');
    if (removedExists) throw new Error('deleted file still exists');
    if (installed?.sequence !== 36 || installed.version !== '3.51' || installed.displayVersion !== '3.5') throw new Error('installed version marker was not advanced');
    if (keepVersion !== '3.51') throw new Error('keep.que version marker was not advanced');
    if (after.decision !== 'upToDate') throw new Error(`unexpected post-update status: ${after.decision}`);
    const integrity = await verifyModIntegrity(war3Path, 'full');
    if (!integrity.ok || integrity.version !== '3.51' || integrity.expectedFiles !== 3) throw new Error(`3.51 integrity failed: ${JSON.stringify(integrity)}`);

    const oldPath = path.join(root, 'old-install');
    await writeInstalledModState(oldPath, { product: 'quenching-mod', sequence: 34, version: '3.4', installedAt: new Date().toISOString(), files: [], filesDigest: '' });
    const oldStatus = await getModUpdateStatus(oldPath, options);
    if (oldStatus.decision !== 'requiresFullPackage') throw new Error('pre-3.5 installation must not receive a patch');

    console.log(JSON.stringify({
      ok: true,
      route: '3.5 -> internal 3.51',
      publicVersion: installed.displayVersion,
      before: before.decision,
      after: after.decision,
      downloadedFrom: result.downloadedFrom,
      changed: true,
      added: true,
      deleted: true,
      untouched: true,
      installedSequence: installed.sequence,
      keepVersion,
      integrityVerified: true,
      oldInstallation: oldStatus.decision,
      tamperedManifestRejected: true,
    }, null, 2));
  } finally {
    if (previousBaselineManifest === undefined) delete process.env.QUENCHING_BASELINE_MANIFEST;
    else process.env.QUENCHING_BASELINE_MANIFEST = previousBaselineManifest;
    if (server) await server.close();
    await fs.remove(root);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
