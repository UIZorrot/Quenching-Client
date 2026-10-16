// Actual Electron updater processes, isolated tiny ASAR applications, no game or
// player configuration. Runtime hardlinks are read-only; replaced EXEs are copies.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createPackage } from '@electron/asar';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  console.log('SKIP: actual updater fixture requires Windows x64 Electron');
  process.exit(0);
}
const parent = path.resolve('_irys/work');
const work = await fs.mkdtemp(path.join(parent, 'client-unicode-'));
const runtime = path.resolve('node_modules/electron/dist');
const actualHelper = path.resolve(process.argv[2] || 'assets/updater/client-update-helper.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const live = new Set();
const restarted = new Set();
async function hash(file) { const h = crypto.createHash('sha256'); for await (const block of fss.createReadStream(file)) h.update(block); return h.digest('hex'); }
async function waitFor(fn, message, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await fn()) return; await delay(100); }
  throw new Error(message);
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') await promisify(execFile)('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, maxBuffer: 2000 }).catch(() => {});
  else child.kill();
  await waitFor(() => child.exitCode !== null || child.signalCode !== null, 'owned fixture process did not exit');
}
async function linkRuntime(install) {
  await fs.mkdir(install, { recursive: true });
  for (const entry of await fs.readdir(runtime, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    await fs.link(path.join(runtime, entry.name), path.join(install, entry.name === 'electron.exe' ? 'QMClient.exe' : entry.name));
  }
  await fs.mkdir(path.join(install, 'locales'));
  for (const name of await fs.readdir(path.join(runtime, 'locales'))) await fs.link(path.join(runtime, 'locales', name), path.join(install, 'locales', name));
  await fs.mkdir(path.join(install, 'resources'));
}
async function tinyApp(file, kind) {
  const source = await fs.mkdtemp(path.join(work, 'app-'));
  await fs.writeFile(path.join(source, 'package.json'), JSON.stringify({ name: 'unicode-update-fixture', version: '0.0.0', main: 'main.cjs' }));
  await fs.writeFile(path.join(source, 'main.cjs'), `
    const {app}=require('electron'); const fs=require('node:fs'); const path=require('node:path');
    const root=path.dirname(process.execPath); const kind=${JSON.stringify(kind)};
    const config=path.join(root,'用户设置 中文 🔥');fs.mkdirSync(config,{recursive:true});app.setPath('userData',config);
    app.whenReady().then(()=>{
      fs.writeFileSync(path.join(root,'boot-'+kind+'.json'), JSON.stringify({exe:process.execPath,pid:process.pid,args:process.argv,kind}));
      if(kind==='good' && process.env.QUENCHING_CLIENT_UPDATE_ACK)
        fs.writeFileSync(process.env.QUENCHING_CLIENT_UPDATE_ACK,process.env.QUENCHING_CLIENT_UPDATE_TOKEN);
      if(kind==='good') {
        // Keep the fake client alive beyond ACK and the helper's exit. The old
        // test exited it after 100ms and could not catch Windows job inheritance.
        setInterval(()=>{},1000);
        setTimeout(()=>require(path.join(root,'resources','cleanup-fixture.cjs')).cleanupCompletedClientUpdate()
          .catch(error=>fs.writeFileSync(path.join(root,'cleanup-error.txt'),String(error))),2000);
      }
      else if(kind==='old' && process.env.QUENCHING_FIXTURE_KEEP_ALIVE==='1') setInterval(()=>{},1000);
      else setTimeout(()=>app.exit(kind==='bad'?17:0),100);
    });
  `);
  await createPackage(source, file);
}
function child(exe, args, env = {}) {
  const safeEnv = { ...process.env };
  for (const key of Object.keys(safeEnv)) if (/PRIVATE|SECRET|PASSWORD|TOKEN|QUENCHING/i.test(key)) delete safeEnv[key];
  delete safeEnv.ELECTRON_RUN_AS_NODE;
  const proc = spawn(exe, args, { cwd: path.dirname(exe), env: { ...safeEnv, ...env }, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  proc.fixtureLog = '';
  proc.stderr.on('data', chunk => { proc.fixtureLog = (proc.fixtureLog + chunk.toString()).slice(-3000); });
  proc.on('error', error => { proc.fixtureError = error; });
  live.add(proc);
  return proc;
}
const results = [];
try {
  const cleanup = await build({ stdin: { contents: `export { cleanupCompletedClientUpdate } from './src/Main/services/client-update-service';`,
    resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false });
  for (const [folder, mode] of [['中文 空格（淬火）', 'healthy'], ['中文 & (测试) Кириллица 🔥', 'rollback'], ['日本語 用户资料 🔥', 'recover'],
    ['用户临时目录 中文 🔥/quenching-client-fallback-模拟/different-exe', 'rollback']]) {
    const install = path.join(work, folder); await linkRuntime(install);
    await fs.writeFile(path.join(install, 'resources/cleanup-fixture.cjs'), cleanup.outputFiles[0].text);
    const stage = path.join(install, '.quenching-client-update', '0123456789abcdef01234567');
    await fs.mkdir(path.join(stage, 'new', 'resources/assets'), { recursive: true });
    const oldAsar = path.join(install, 'resources/app.asar'); await tinyApp(oldAsar, 'old');
    const newAsar = path.join(stage, 'new/resources/app.asar'); await tinyApp(newAsar, mode === 'healthy' ? 'good' : 'bad');
    const relative = 'resources/assets/中文资源 & (测试) 🔥.txt';
    await fs.writeFile(path.join(stage, 'new', relative), 'new fixture resource');
    await fs.copyFile(path.join(install, 'QMClient.exe'), path.join(stage, 'new/QMClient.exe'));
    const exeHash = await hash(path.join(install, 'QMClient.exe')), asarHash = await hash(oldAsar);
    await fs.writeFile(path.join(install, '自定义文件.txt'), 'must remain');
    const helper = path.join(install, 'resources', '更新助手 中文 🔥.cjs'); await fs.copyFile(actualHelper, helper);
    const next = path.join(install, 'QMClient.next.exe'); await fs.copyFile(path.join(install, 'QMClient.exe'), next);
    const userData = path.join(install, '用户设置 中文 🔥');
    const args = ['--user-data-dir=' + userData];
    const plan = { root: install, stage, token: 'a'.repeat(32), relaunchArgs: args, files: [
      { path: 'QMClient.exe', oldSha256: exeHash, newSha256: exeHash },
      { path: 'resources/app.asar', oldSha256: asarHash, newSha256: await hash(newAsar) },
      { path: relative, oldSha256: null, newSha256: await hash(path.join(stage, 'new', relative)) },
    ] };
    const planPath = path.join(stage, 'plan.json'); await fs.writeFile(planPath, JSON.stringify(plan));
    let oldChild;
    if (mode !== 'recover') {
      oldChild = child(path.join(install, 'QMClient.exe'), args, { QUENCHING_FIXTURE_KEEP_ALIVE: '1' });
      await waitFor(() => fs.stat(path.join(install, 'boot-old.json')).then(() => true).catch(() => false), 'old fixture did not boot: ' + oldChild.fixtureLog);
      await fs.rm(path.join(install, 'boot-old.json'));
    } else {
      // Simulate interruption after selected files were replaced, with backups intact.
      await fs.mkdir(path.join(stage, 'backup/resources'), { recursive: true });
      await fs.copyFile(oldAsar, path.join(stage, 'backup/resources/app.asar'));
      await fs.copyFile(path.join(install, 'QMClient.exe'), path.join(stage, 'backup/QMClient.exe'));
      await fs.copyFile(newAsar, oldAsar);
      await fs.mkdir(path.dirname(path.join(install, relative)), { recursive: true });
      await fs.copyFile(path.join(stage, 'new', relative), path.join(install, relative));
      await fs.writeFile(path.join(stage, 'journal.json'), JSON.stringify({ state: 'installing', replaced: plan.files.map(file => file.path) }));
    }
    await fs.writeFile(path.join(install, '.quenching-client-update/active.json'), JSON.stringify({ stage, token: plan.token, helperPid: 0 }));
    const updater = child(next, [helper, planPath, String(oldChild?.pid || 999999), ...(mode === 'recover' ? ['--recover'] : [])], { ELECTRON_RUN_AS_NODE: '1' });
    if (oldChild) {
      await delay(400);
      assert.equal(await hash(oldAsar), asarHash, 'must not replace files until the old process exits');
      await stop(oldChild);
    }
    // Real EXE backup/hash work can exceed 20s on a busy disk. This is the
    // fixture's observation limit, not a relaxed production health deadline.
    await waitFor(() => updater.exitCode !== null || updater.fixtureError, 'real updater did not finish: ' + updater.fixtureLog, 120000);
    if (updater.fixtureError) throw updater.fixtureError;
    const journal = JSON.parse(await fs.readFile(path.join(stage, 'journal.json'), 'utf8'));
    assert.equal(journal.state, mode === 'healthy' ? 'complete' : 'rolled-back', await fs.readFile(path.join(stage, 'error.txt'), 'utf8').catch(() => updater.fixtureLog));
    const bootFile = path.join(install, mode === 'healthy' ? 'boot-good.json' : 'boot-old.json');
    await waitFor(() => fs.stat(bootFile).then(() => true).catch(() => false), 'restarted fixture did not boot');
    const boot = JSON.parse(await fs.readFile(bootFile, 'utf8'));
    if(mode==='healthy') restarted.add(boot.pid);
    assert.equal(boot.exe.toLowerCase(), path.join(install, 'QMClient.exe').toLowerCase());
    assert.ok(boot.args.includes(args[0]), 'Unicode user-data-dir must survive the restart unchanged');
    assert.equal(await hash(oldAsar), mode === 'healthy' ? plan.files[1].newSha256 : asarHash);
    assert.equal(await hash(path.join(install, 'QMClient.exe')), exeHash);
    assert.equal(await fs.readFile(path.join(install, '自定义文件.txt'), 'utf8'), 'must remain');
    assert.equal(await fs.stat(path.join(install, relative)).then(() => true).catch(() => false), mode === 'healthy');
    if(mode==='healthy') {
      await delay(5000);
      let alive=false;try{process.kill(boot.pid,0);alive=true}catch{}
      assert(alive,'Updated client must remain alive AFTER the update helper exits');
      await waitFor(()=>fs.stat(next).then(()=>false).catch(()=>true),'Client must automatically remove QMClient.next.exe');
      assert.equal(await fs.stat(path.join(stage,'backup')).then(()=>true).catch(()=>false),false,'Successful update removes old rollback binaries');
      console.log('PASS: restarted QMClient.exe survives helper exit; automatic cleanup removes temporary next EXE');
    }
    results.push({ folder, mode, realElectron: true, journal: journal.state, unicodeArgumentsPreserved: true,
      survivesHelperExit: mode==='healthy'?true:undefined, temporaryExeAutomaticallyRemoved:mode==='healthy'?true:undefined });
    await delay(600);
  }
  // Run the service/publisher regressions with Unicode TEMP in the exact client
  // Node runtime. noAsar applies only to this fake-app fixture process, whose ASAR
  // baselines are ordinary text; test-client-update-asar separately tests real archives.
  const temp = path.join(work, '用户临时目录 中文 🔥'); await fs.mkdir(temp, { recursive: true });
  const runner = path.resolve('scripts/test-file-sync-node.mjs');
  const entry = path.resolve('scripts/test-client-update-fallback.ts');
  const code = `process.noAsar=true;process.argv=[process.execPath,${JSON.stringify(runner)},${JSON.stringify(entry)}];import(${JSON.stringify(pathToFileURL(runner).href)}).catch(e=>{console.error(e);process.exitCode=1;});`;
  const scoped = await promisify(execFile)(path.join(runtime, 'electron.exe'), ['-e', code], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', TEMP: temp, TMP: temp, QUENCHING_TEST_PUBLISHER_NODE: process.execPath },
    windowsHide: true, timeout: 45000, maxBuffer: 12000,
  });
  assert.ok(scoped.stdout.includes('"ok":true'), scoped.stderr);
  console.log(JSON.stringify({ ok: true, isolated: true, results, unicodeTempInClientRuntime: true, productionChanged: false }, null, 2));
} finally {
  for(const pid of restarted) await promisify(execFile)('taskkill.exe',['/PID',String(pid),'/T','/F'],{windowsHide:true,maxBuffer:2000}).catch(()=>{});
  for (const proc of live) await stop(proc).catch(() => {});
  if (path.dirname(work) !== parent || !path.basename(work).startsWith('client-unicode-')) throw new Error('unsafe temporary test directory');
  await fs.rm(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}
