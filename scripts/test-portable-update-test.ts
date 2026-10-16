import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quenching-portable-test-'));
const names = ['QUENCHING_UPDATE_TEST', 'QUENCHING_UPDATE_TEST_BASE', 'QUENCHING_TEST_CONFIG_DIR'];
const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
const fixture = { exe: path.join(root, 'QMClient.exe'), suppliedUserData: false, paths: {} as Record<string, string> };
(globalThis as any).__portableUpdateFixture = fixture;
const clear = () => { for (const name of names) delete process.env[name]; fixture.paths = {}; };
try {
  clear();
  const result = await build({
    stdin: { contents: `export { initializePortableUpdateTest } from './src/Main/services/update-test-init';`, loader: 'ts', resolveDir: process.cwd() },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
    define: { 'process.execPath': 'globalThis.__portableUpdateFixture.exe' },
    plugins: [{ name: 'portable-app', setup(plugin) {
      plugin.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `const f=globalThis.__portableUpdateFixture;
        export const app={commandLine:{hasSwitch:()=>f.suppliedUserData},setPath:(key,value)=>{f.paths[key]=value}};` }));
    } }],
  });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  assert.equal(process.env.QUENCHING_UPDATE_TEST, undefined, 'Production without marker is untouched');
  assert.deepEqual(fixture.paths, {});
  const marker = path.join(root, 'quenching-update-test.json');
  fs.writeFileSync(marker, JSON.stringify({ schema: 1, enabled: true, baseUrl: 'https://qm.txzy.net/quenching/update-test/3.6.1/' }));
  module.exports.initializePortableUpdateTest();
  assert.equal(process.env.QUENCHING_UPDATE_TEST, '1');
  assert.equal(process.env.QUENCHING_UPDATE_TEST_BASE, 'https://qm.txzy.net/quenching/update-test/3.6.1/');
  assert.equal(process.env.QUENCHING_TEST_CONFIG_DIR, path.join(root, '.test-config'));
  assert.equal(fixture.paths.userData, path.join(root, '.test-user-data'));
  assert.equal(fixture.paths.sessionData, fixture.paths.userData);
  assert(fs.existsSync(fixture.paths.userData));
  // Reopening the updated portable gets the same flag from the preserved file.
  clear(); module.exports.initializePortableUpdateTest(); assert.equal(process.env.QUENCHING_UPDATE_TEST, '1');
  clear(); process.env.QUENCHING_UPDATE_TEST = '0'; module.exports.initializePortableUpdateTest();
  assert.deepEqual(fixture.paths, {}, 'Explicit disabled flag overrides local test marker');
  clear(); fixture.suppliedUserData = true;
  process.env.QUENCHING_UPDATE_TEST_BASE = 'http://127.0.0.1:12345/test/';
  process.env.QUENCHING_TEST_CONFIG_DIR = path.join(root, 'isolated-fixture');
  module.exports.initializePortableUpdateTest();
  assert.equal(process.env.QUENCHING_UPDATE_TEST_BASE, 'http://127.0.0.1:12345/test/');
  assert.deepEqual(fixture.paths, {}, 'Explicit isolated userData is respected');
  clear(); fs.writeFileSync(marker, JSON.stringify({ schema: 1, enabled: false }));
  module.exports.initializePortableUpdateTest(); assert.equal(process.env.QUENCHING_UPDATE_TEST, undefined);
  const windowSource = fs.readFileSync('src/Main/initialize-main-window.ts', 'utf8');
  assert.match(windowSource, /show:\s*process\.env\.QUENCHING_AUTOMATED_TEST_HEADLESS\s*!==\s*'1'/);
  assert(!windowSource.includes('show: !process.env.QUENCHING_TEST_CONFIG_DIR'));
  console.log('PASS portable marker: direct/reopened EXE, isolated settings, explicit overrides, disabled/absent flag, interactive window not hidden');
} finally {
  for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
  delete (globalThis as any).__portableUpdateFixture;
  fs.rmSync(root, { recursive: true, force: true });
}
