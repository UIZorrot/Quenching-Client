import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ClientUpdateFile, stageClientFileSync, stageLegacyClientUpdate, validateClientUpdateManifest } from '../src/Main/services/client-update-service';
import { encodeSnapshot, snapshotDigest } from '../src/Main/services/file-sync-snapshot';

const hash = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');
const canonical = (value: any): string => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;

export async function run() {
  // Electron tests use its actual updater runtime; publishing still runs under Node.
  const publisherRuntime = process.env.QUENCHING_TEST_PUBLISHER_NODE || process.execPath;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-client-fallback-'));
  const requests: string[] = [];
  const publish = path.join(root, 'http');
  const keys = crypto.generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const sign = (value: any) => ({ ...value, signature: { algorithm: 'ed25519', value: crypto.sign(null, Buffer.from(canonical(value)), keys.privateKey).toString('base64') } });
  const server = http.createServer(async (req, res) => {
    const name = new URL(req.url || '/', 'http://localhost').pathname.slice(1);
    requests.push(name);
    try { const bytes = await fs.readFile(path.join(publish, path.basename(name))); res.writeHead(200, { 'Content-Length': bytes.length }).end(bytes); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const oldTest = process.env.QUENCHING_CLIENT_UPDATE_TEST;
  const oldResources = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
  // Electron's real resourcesPath is read-only, unlike the plain Node fixture.
  const setResources = (value: string) => Object.defineProperty(process, 'resourcesPath', { value, writable: true, configurable: true });
  process.env.QUENCHING_CLIENT_UPDATE_TEST = '1';
  setResources(path.join(root, 'no-zstd'));
  const artifact = async (name: string, bytes: string | Buffer) => {
    await fs.outputFile(path.join(publish, name), bytes);
    return { size: Buffer.byteLength(bytes), sha256: hash(bytes), sources: [`${origin}/${name}`] };
  };
  const binaries = ['QMClient.exe', 'resources/app.asar'];
  const entries: ClientUpdateFile[] = [];
  const old = (relative: string) => `official old ${relative}`;
  const target = (relative: string) => `signed latest ${relative}`;
  try {
    for (const [i, relative] of binaries.entries()) entries.push({ path: relative, oldSha256: hash(old(relative)),
      newSha256: hash(target(relative)), newSize: Buffer.byteLength(target(relative)), method: 'zstd-delta',
      artifact: await artifact(`delta-${i}.zst`, 'invalid optional zstd'), fullArtifact: await artifact(`full-${i}.bin`, target(relative)) });
    for (const relative of ['resources/assets/changed.txt', 'resources/assets/new.txt', 'resources/assets/missing.txt']) entries.push({
      path: relative, oldSha256: relative.endsWith('new.txt') ? null : hash(old(relative)), newSha256: hash(target(relative)),
      newSize: Buffer.byteLength(target(relative)), method: 'replace', artifact: await artifact(path.basename(relative), target(relative)) });
    const raw = { schema: 1, product: 'quenching-client', platform: 'win32-x64', baseVersion: '3.5.0', targetVersion: '3.5.1', files: entries };
    const manifest = validateClientUpdateManifest(sign(raw), publicKey);
    const scenarios = ['different-exe', 'missing-exe', 'already-target', 'missing-zstd', 'failed-delta'];
    for (const name of scenarios) {
      const install = path.join(root, name); const stage = path.join(install, '.quenching-client-update', '0123456789abcdef01234567');
      for (const relative of binaries) await fs.outputFile(path.join(install, relative), old(relative));
      if (name === 'different-exe') await fs.outputFile(path.join(install, 'QMClient.exe'), 'legitimate differently-built EXE');
      if (name === 'missing-exe') await fs.remove(path.join(install, 'QMClient.exe'));
      if (name === 'already-target') for (const relative of binaries) await fs.outputFile(path.join(install, relative), target(relative));
      if (name === 'failed-delta' && await fs.pathExists('assets/updater/zstd.exe')) setResources(process.cwd());
      else setResources(path.join(root, 'no-zstd'));
      await fs.outputFile(path.join(install, 'resources/assets/changed.txt'), 'user changed old resource');
      await fs.outputFile(path.join(install, 'resources/assets/new.txt'), 'already exists but publisher oldSha256 is null');
      await fs.outputFile(path.join(install, 'resources/assets/custom.txt'), 'unmanaged custom');
      const actualBefore = new Map<string, string | null>();
      for (const file of entries) actualBefore.set(file.path, await fs.readFile(path.join(install, file.path)).then(hash).catch(() => null));
      requests.length = 0;
      const progress: number[] = [];
      const files = await stageLegacyClientUpdate(manifest, install, stage, (_message, completed) => progress.push(completed));
      for (const file of files) {
        assert.equal(file.oldSha256, actualBefore.get(file.path), 'rollback must use actual pre-update content');
        assert.equal(await fs.readFile(path.join(stage, 'new', file.path), 'utf8'), target(file.path));
        assert.equal(await fs.readFile(path.join(install, file.path)).then(hash).catch(() => null), actualBefore.get(file.path), 'staging must not change the running installation');
      }
      assert.ok(progress.every((value, i) => !i || value >= progress[i - 1]));
      assert.equal(requests.includes('delta-0.zst'), ['missing-zstd', 'failed-delta'].includes(name));
      assert.equal(requests.includes('full-0.bin'), name !== 'already-target');
      assert.equal(requests.includes('full-1.bin'), name !== 'already-target');
      const helperText = await fs.readFile('assets/updater/client-update-helper.cjs', 'utf8');
      const module = { exports: {} as any }; let healthy = name !== 'different-exe';
      const actualRequire = createRequire(path.join(process.cwd(), 'package.json'));
      const testRequire = (name: string) => name !== 'node:child_process' ? actualRequire(name) : {
        spawn: (_exe: string, _args: string[], options: any) => {
          if (options.env.QUENCHING_CLIENT_UPDATE_ACK && healthy) fs.writeFileSync(options.env.QUENCHING_CLIENT_UPDATE_ACK, options.env.QUENCHING_CLIENT_UPDATE_TOKEN);
          return { unref() {}, pid: 123, exitCode: healthy ? null : 1 };
        }, spawnSync() {},
      };
      new Function('require', 'module', 'process', helperText.slice(0, helperText.indexOf('(process.argv[4]')) + '\nmodule.exports = { run };')
        (testRequire, module, { env: { QUENCHING_CLIENT_UPDATE_TEST: '1' }, kill() { throw new Error('not alive'); } });
      const planPath = path.join(stage, 'plan.json');
      await fs.writeJson(planPath, { root: install, stage, token: 'a'.repeat(32), relaunchArgs: [], files: files.map(({ path, oldSha256, newSha256 }) => ({ path, oldSha256, newSha256 })) });
      if (!healthy) {
        await assert.rejects(() => module.exports.run(planPath, 555), /healthy/);
        for (const file of entries) assert.equal(await fs.readFile(path.join(install, file.path)).then(hash).catch(() => null), actualBefore.get(file.path), `failed launch must restore the real nonstandard baseline: ${file.path}`);
      } else {
        await module.exports.run(planPath, 555);
        for (const file of entries) assert.equal(await fs.readFile(path.join(install, file.path), 'utf8'), target(file.path));
      }
      assert.equal(await fs.readFile(path.join(install, 'resources/assets/custom.txt'), 'utf8'), 'unmanaged custom');
    }
    const corrupt = path.join(root, 'corrupt');
    await fs.outputFile(path.join(corrupt, 'QMClient.exe'), 'different EXE');
    await fs.outputFile(path.join(publish, 'full-0.bin'), 'tampered');
    await assert.rejects(() => stageLegacyClientUpdate(manifest, corrupt, path.join(corrupt, 'stage')), /全部下载源失败/);
    assert.equal(await fs.readFile(path.join(corrupt, 'QMClient.exe'), 'utf8'), 'different EXE');
    await artifact('full-0.bin', target('QMClient.exe'));
    assert.throws(() => validateClientUpdateManifest(sign({ ...raw, files: [{ ...entries[0], fullArtifact: { ...entries[0].fullArtifact, sha256: hash('wrong target') } }, ...entries.slice(1)] }), publicKey), /full-file fallback/);
    assert.throws(() => validateClientUpdateManifest(sign({ ...raw, files: [{ ...entries[0], fullArtifact: { ...entries[0].fullArtifact, sources: ['http://untrusted.example/file'] } }, ...entries.slice(1)] }), publicKey), /full-file fallback/);
    const noFallback = validateClientUpdateManifest(sign({ ...raw, files: entries.map(({ fullArtifact, ...file }) => file) }), publicKey);
    await assert.rejects(() => stageLegacyClientUpdate(noFallback, corrupt, path.join(corrupt, 'no-fallback')), /此旧补丁仅提供差分/);
    // A signed full EXE/ASAR replacement is valid; it does not need an old dictionary.
    const fullOnly = validateClientUpdateManifest(sign({ ...raw, files: entries.map(({ fullArtifact, ...file }) => fullArtifact ? { ...file, method: 'replace', artifact: fullArtifact } : file) }), publicKey);
    await stageLegacyClientUpdate(fullOnly, corrupt, path.join(corrupt, 'full-only'));
    const zstd = path.resolve('assets/updater/zstd.exe');
    if (await fs.pathExists(zstd) && await fs.pathExists('_irys/build-client-update.mjs')) {
      const oldRoot = path.join(root, '旧基线 Кириллица 🔥'), newRoot = path.join(root, '新版候选 日本語 🔥'), output = path.join(root, '发布目录 中文 & (测试) 🔥');
      for (const relative of binaries) {
        await fs.outputFile(path.join(oldRoot, relative), old(relative).repeat(2000));
        // Unchanged EXE must still accompany a changed ASAR.
        await fs.outputFile(path.join(newRoot, relative), (relative === 'QMClient.exe' ? old(relative) : target(relative)).repeat(2000));
      }
      const keyFile = path.join(root, '隔离测试签名 日本語 🔥.pem');
      await fs.writeFile(keyFile, keys.privateKey.export({ type: 'pkcs8', format: 'pem' }));
      await promisify(execFile)(publisherRuntime, ['_irys/build-client-update.mjs', '--old', oldRoot, '--new', newRoot, '--out', output,
        '--base-version', '3.5.0', '--target-version', '3.5.1', '--private-key', keyFile, '--zstd', zstd, '--url-base', 'https://github.com/example/releases/download/test'], { maxBuffer: 5000 });
      const generated = await fs.readJson(path.join(output, '3.5.0.json'));
      validateClientUpdateManifest(generated, publicKey);
      const syncOutput = path.join(root, '新协议发布候选 日本語 🔥');
      await promisify(execFile)(publisherRuntime, ['_irys/build-file-sync.mjs', '--product', 'quenching-client', '--root', newRoot,
        '--version', '3.5.1', '--runtime-version', '33.1.0', '--output', syncOutput, '--store', path.join(root, '隔离发布缓存 中文 🔥'),
        '--url-base', 'https://github.com/example/releases/download/test', '--seed-root', oldRoot, '--seed-version', '3.5.0',
        '--seed-runtime-version', '33.1.0', '--delta-base', oldRoot, '--zstd', zstd, '--private-key', keyFile], { maxBuffer: 5000 });
      const syncPublished = validateClientUpdateManifest(await fs.readJson(path.join(syncOutput, 'latest.json')), publicKey);
      assert.ok(syncPublished.fileSync?.deltas?.length, 'file-sync publisher must generate real deltas from Unicode release directories');
      assert.ok(!(await fs.readdir(output)).some(name => name.startsWith('.zstd-')));
      assert.ok(!(await fs.readdir(syncOutput)).some(name => name.startsWith('.zstd-')), 'private delta scratch copies must be removed');
      for (const file of generated.files) {
        assert.ok(file.fullArtifact, 'publisher must retain signed full targets for both binaries');
        const fullName = new URL(file.fullArtifact.sources[0]).pathname.split('/').pop()!;
        assert.equal(hash(await fs.readFile(path.join(output, fullName))), file.newSha256);
        const deltaName = new URL(file.artifact.sources[0]).pathname.split('/').pop()!;
        await fs.copy(path.join(output, deltaName), path.join(publish, deltaName));
        await fs.copy(path.join(output, fullName), path.join(publish, fullName));
        file.artifact.sources = [`${origin}/${deltaName}`]; file.fullArtifact.sources = [`${origin}/${fullName}`];
      }
      delete generated.signature;
      const liveManifest = validateClientUpdateManifest(sign(generated), publicKey);
      setResources(process.cwd());
      requests.length = 0;
      const realStage = path.join(root, 'real-delta');
      await stageLegacyClientUpdate(liveManifest, oldRoot, realStage);
      assert.ok(requests.some(name => name.endsWith('.zst')), 'matching baseline uses a real delta');
      assert.ok(!requests.some(name => name.endsWith('.full.bin')), 'matching baseline need not download the full target');
      for (const folder of ['中文 空格（淬火）', '日本語 Кириллица 🔥', '中文 & (测试) [资料] 🔥']) {
      const unicodeRoot = path.join(root, folder);
      await fs.copy(oldRoot, unicodeRoot);
      await fs.copy(zstd, path.join(unicodeRoot, 'resources/assets/updater/zstd.exe'));
      setResources(path.join(unicodeRoot, 'resources'));
      const unicodeStage = path.join(unicodeRoot, '.quenching-client-update', '0123456789abcdef01234567');
      requests.length = 0;
      await stageLegacyClientUpdate(liveManifest, unicodeRoot, unicodeStage);
      assert.ok(requests.some(name => name.endsWith('.zst')));
      assert.ok(!requests.some(name => name.endsWith('.full.bin')), 'Unicode installation path must not force a full-file fallback');
      for (const file of generated.files) assert.equal(hash(await fs.readFile(path.join(unicodeStage, 'new', file.path))), file.newSha256);
      const snapshot = async (dir: string, version: string) => {
        const files = await Promise.all(binaries.map(async relative => {
          const bytes = await fs.readFile(path.join(dir, relative));
          return { path: relative, size: bytes.length, sha256: hash(bytes) };
        }));
        return { schema: 1 as const, product: 'quenching-client' as const, version, runtimeVersion: '33.1.0',
          generatedAt: new Date().toISOString(), filesDigest: snapshotDigest(files), files };
      };
      const previous = await snapshot(oldRoot, '3.5.0'), latest = await snapshot(newRoot, '3.5.1');
      const fileSync = { inventory: await artifact('unicode-latest.gz', encodeSnapshot(latest)),
        baselines: { '3.5.0': await artifact('unicode-old.gz', encodeSnapshot(previous)) },
        objects: [origin + '/objects/{sha256}.bin'], deltas: generated.files.map((file: any) => ({ path: file.path, oldSha256: file.oldSha256, artifact: file.artifact })) };
      const syncManifest = validateClientUpdateManifest(sign({ schema: 2, product: 'quenching-client', platform: 'win32-x64',
        runtimeVersion: '33.1.0', targetVersion: '3.5.1', fileSync }), publicKey);
      requests.length = 0;
      const syncStage = path.join(unicodeRoot, '.quenching-client-update', 'abcdef0123456789abcdef01');
      await stageClientFileSync(syncManifest, unicodeRoot, syncStage, '3.5.0');
      assert.ok(requests.some(name => name.endsWith('.zst')));
      assert.ok(!requests.some(name => name.startsWith('objects/')), 'file-sync must also decode real deltas in Unicode installation paths');
      for (const file of generated.files) assert.equal(hash(await fs.readFile(path.join(syncStage, 'new', file.path))), file.newSha256);
      }
    }
    console.log(JSON.stringify({ ok: true, scenarios, ordinaryReplaceAcceptsChangedOrMissingLocal: true, signedTargetAndSourcesValidated: true,
      binaryPair: true, actualBaselineRollback: true, realZstdAndPublisher: await fs.pathExists(zstd), unicodeDeltaBothSchemas: await fs.pathExists(zstd), productionChanged: false }));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (oldTest === undefined) delete process.env.QUENCHING_CLIENT_UPDATE_TEST; else process.env.QUENCHING_CLIENT_UPDATE_TEST = oldTest;
    if (oldResources) Object.defineProperty(process, 'resourcesPath', oldResources);
    else delete (process as any).resourcesPath;
    await fs.remove(root);
  }
}
