// Real Electron ASAR reads; isolated fixtures only, no player settings or network.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { build } from 'esbuild';
import { createPackage } from '@electron/asar';

const parent = path.resolve('_irys/work');
await fs.mkdir(parent, { recursive: true });
const work = await fs.mkdtemp(path.join(parent, 'client-asar-'));
try {
  const source = path.join(work, 'source');
  const install = path.join(work, '中文客户端 🔥');
  await fs.mkdir(source);
  await fs.mkdir(path.join(install, 'resources'), { recursive: true });
  const result = await build({
    stdin: { contents: `
      import assert from 'node:assert/strict';
      import crypto from 'node:crypto';
      import path from 'node:path';
      import http from 'node:http';
      import { stageLegacyClientUpdate, prepareClientUpdate } from './src/Main/services/client-update-service';
      const fs = require('original-fs');
      exports.run = async () => {
        const archive = __dirname;
        const root = path.dirname(path.dirname(archive));
        const stage = path.join(root, '.quenching-client-update', 'stage');
        const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
        const before = process.noAsar;
        fs.writeFileSync(path.join(root, 'QMClient.exe'), 'isolated fake launcher');
        const files = ['QMClient.exe', 'resources/app.asar'].map(relative => {
          const bytes = fs.readFileSync(path.join(root, relative));
          return { path: relative, method: 'replace', oldSha256: null, newSha256: hash(bytes), newSize: bytes.length,
            artifact: { size: bytes.length, sha256: hash(bytes), sources: ['https://invalid.example/not-needed'] } };
        });
        await stageLegacyClientUpdate({ schema: 1, files }, root, stage);
        assert.equal(process.noAsar, before, 'staging must not change global ASAR support');
        assert.deepEqual(fs.readFileSync(path.join(stage, 'new/resources/app.asar')), fs.readFileSync(archive), 'copy and hash raw archive bytes');
        assert.equal((await Promise.resolve().then(() => require('./926.cjs'))).value, 'environment fixture');
        const target = fs.readFileSync(process.env.QUENCHING_ASAR_TEST_TARGET);
        const server = http.createServer((_req, res) => res.writeHead(200, { 'Content-Length': target.length }).end(target));
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        try {
          const downloaded = files.map(file => file.path !== 'resources/app.asar' ? file : { ...file,
            newSha256: hash(target), newSize: target.length,
            artifact: { size: target.length, sha256: hash(target), sources: ['http://127.0.0.1:' + server.address().port + '/target'] } });
          const downloadStage = path.join(root, '.quenching-client-update', 'download');
          await stageLegacyClientUpdate({ schema: 1, files: downloaded }, root, downloadStage);
          assert.deepEqual(fs.readFileSync(path.join(downloadStage, 'new/resources/app.asar')), target);
          assert.equal(process.noAsar, before);
        } finally { await new Promise(resolve => server.close(resolve)); }
        delete require.cache[require.resolve('./926.cjs')];
        await assert.rejects(() => prepareClientUpdate(), /尚未公开/);
        assert.equal(process.noAsar, before, 'failed update must not change global ASAR support');
        assert.equal((await Promise.resolve().then(() => require('./926.cjs'))).value, 'environment fixture');
        console.log(JSON.stringify({ ok: true, actualElectron: true, rawArchiveHashAndCopy: true, realArchiveDownload: true, chunkAfterStaging: true, chunkAfterFailedUpdate: true }));
      };
    `, resolveDir: process.cwd(), sourcefile: 'asar-fixture.ts', loader: 'ts' },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', external: ['./926.cjs'], write: false,
    plugins: [{ name: 'isolated-release-gate', setup(plugin) {
      plugin.onResolve({ filter: /\/release-gate-service$/ }, () => ({ path: 'gate', namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents:
        'export const fetchReleaseGate = async () => ({gate:{allowed:0}}); export const previewUpdatesEnabled = () => false;' }));
    } }],
  });
  await fs.writeFile(path.join(source, 'service.cjs'), result.outputFiles[0].text);
  await fs.writeFile(path.join(source, '926.cjs'), "exports.value = 'environment fixture';");
  const archive = path.join(install, 'resources/app.asar');
  await createPackage(source, archive);
  await fs.writeFile(path.join(source, 'release-marker.txt'), 'isolated next target');
  const target = path.join(work, 'target.asar');
  await createPackage(source, target);
  const { stdout, stderr } = await promisify(execFile)(path.resolve('node_modules/electron/dist/electron.exe'),
    ['-e', `require(${JSON.stringify(path.join(archive, 'service.cjs'))}).run().catch(e=>{console.error(e);process.exitCode=1;})`],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', QUENCHING_CLIENT_UPDATE_TEST: '1', QUENCHING_ASAR_TEST_TARGET: target }, windowsHide: true, timeout: 30000, maxBuffer: 6000 });
  assert.equal(stderr.trim(), '', stderr);
  console.log(stdout.trim());
} finally {
  if (path.dirname(work) !== parent || !path.basename(work).startsWith('client-asar-')) throw new Error('unsafe fixture cleanup');
  await fs.rm(work, { recursive: true, force: true });
}
