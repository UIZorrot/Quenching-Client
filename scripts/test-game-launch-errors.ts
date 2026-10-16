// Real GameLauncher with isolated resource stubs and asynchronous OS spawn outcomes.
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const work = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-launch-errors-'));
const fixture = { root: path.join(work, '魔兽 测试'), channel: 'retail', platform: 'win32',
  error: undefined as NodeJS.ErrnoException | undefined, children: [] as any[], syncError: false, calls: [] as any[], realCommand: '', realArgs: [] as string[] };
(globalThis as any).__launchErrorFixture = fixture;
const mocks: Record<string, string> = {
  'electron': 'export const app={getPath:()=>f.root};',
  'game-channel': 'export const getSelectedGameChannel=()=>f.channel,getSelectedGameFolder=()=>f.channel==="ptr"?"_ptr_":"_retail_",hasGameChannelDirectory=async()=>true,getChannelModEnabled=()=>true;',
  'config-manager': 'export const configManager={get:k=>k==="war3Path"?f.root:{}};',
  'asset-sync': 'export const AssetSyncService={getAssetsDir:async()=>f.root};',
  'managed-resource-files': 'export const syncBundledResourceFiles=async()=>{};',
  'full-package-service': 'export const isFullPackageInstalled=async()=>false;',
  'mod-profile': 'export const resolveModProfile=async()=>({shaderPack:"hd"});',
  'war3-version': 'export const readShaderPackMarker=async()=>"hd";export const detectWar3Version=async()=>({source:"test",parts:[2,0,4]});',
  'ui-service': 'export const UIService={syncConfiguredUI:async()=>{}};',
  'branch-mod-toggle': 'export const setBranchModEnabledOnDisk=async()=>{};',
  'battle-net-launcher': 'export const resolveBattleNetExe=async()=>null;export const launchViaBattleNet=async()=>false;',
  'map-name': 'export const writeMapName=async()=>{};',
  'child_process': `import {EventEmitter} from 'node:events';import {spawn as nativeSpawn} from 'node:child_process';export const spawn=(command,args,options)=>{
    f.calls.push({command,args,options});if(f.syncError)throw f.error;
    if(f.realCommand){const child=nativeSpawn(f.realCommand,f.realArgs,options);f.children.push(child);return child;}
    const child=new EventEmitter();child.unref=()=>{child.unreferenced=true;};f.children.push(child);
    setImmediate(()=>child.emit(f.error?'error':'spawn',f.error));return child;
  };`,
};
const require = createRequire(import.meta.url);
const errors: Error[] = [];
const monitor = (error: Error) => errors.push(error); // Fixture only, never installed in the client.
const pause = () => new Promise(resolve => setImmediate(resolve));
try {
  for (const branch of ['_retail_', '_ptr_']) {
    await fs.outputFile(path.join(fixture.root, branch, 'x86_64/Warcraft III.exe'), 'not executed');
    await fs.ensureDir(path.join(fixture.root, branch, 'x86_64/Warcraft III.app'));
  }
  await fs.outputFile(path.join(fixture.root, 'quenching/camp/cfix.w3x'), 'fixture map');
  const bundled = await build({ entryPoints: ['src/Main/services/game-launcher.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
    plugins: [{ name: 'no-real-game', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        const key = args.path.replace(/^\.\//, '');
        return key in mocks ? { path: key, namespace: 'fixture' } : undefined;
      });
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: 'const f=globalThis.__launchErrorFixture;' + mocks[args.path] }));
    } }],
  });
  const module = { exports: {} as any }, runtime = { platform: 'win32' };
  new Function('require','module','exports','process',bundled.outputFiles[0].text)(require,module,module.exports,runtime);
  const { GameLauncher } = module.exports;
  const routes = [() => GameLauncher.launchGame(), () => GameLauncher.launchMap(path.join(work,'地图.w3x'),2), () => GameLauncher.unlockCampaign()];
  if (process.argv.includes('--expect-existing-error')) {
    fixture.error = Object.assign(new Error('spawn fixture EACCES'), {code:'EACCES'});
    process.on('uncaughtException',monitor);
    assert.equal(await routes[0](),true);
    await pause();assert.equal(errors.length,1);assert.equal(errors[0],fixture.error);
    console.log('REPRODUCED: launch returns success before asynchronous EACCES escapes to uncaughtException');
  } else {
    let cases = 0;
    for (const platform of ['win32','darwin']) for (const channel of ['retail','ptr']) for (const launch of routes) {
      runtime.platform=platform;fixture.channel=channel;fixture.error=undefined;fixture.syncError=false;
      assert.equal(await launch(),true);assert.equal(fixture.children.at(-1).unreferenced,true);cases++;
      assert.equal(fixture.calls.at(-1).command,platform==='darwin'?'open':path.join(fixture.root,channel==='ptr'?'_ptr_':'_retail_','x86_64/Warcraft III.exe'));
      for (const code of ['EACCES','ENOENT']) {
        fixture.error=Object.assign(new Error('spawn fixture '+code),{code});
        await assert.rejects(launch,error=>error===fixture.error);
        assert.notEqual(fixture.children.at(-1).unreferenced,true);cases++;
      }
      fixture.syncError=true;await assert.rejects(launch,error=>error===fixture.error);cases++;
    }
    // Let the service handle actual OS startup outcomes, without executing Warcraft.
    runtime.platform='win32';fixture.channel='retail';fixture.syncError=false;fixture.error=undefined;
    fixture.realCommand=path.join(work,'不存在.exe');
    await assert.rejects(routes[0],(error: NodeJS.ErrnoException)=>error.code==='ENOENT');
    fixture.realCommand=work;
    let invalidExecutableCode: string | undefined;
    await assert.rejects(routes[0],(error: NodeJS.ErrnoException)=>{
      invalidExecutableCode=error.code;return ['ENOENT','EACCES'].includes(error.code || '');
    });
    fixture.realCommand=process.execPath;fixture.realArgs=['-e',''];
    assert.equal(await routes[0](),true);
    const nodeChild=fixture.children.at(-1);
    nodeChild.ref(); // Test teardown waits for its dummy process to release the temporary cwd.
    await new Promise(resolve=>nodeChild.once('close',resolve));
    console.log(JSON.stringify({passed:true,serviceCases:cases,realMissingExecutable:'ENOENT',realInvalidExecutable:invalidExecutableCode,realNodeProcessStarted:true,
      noGameLaunched:true,realUserSettingsModified:false}));
  }
} finally {
  process.removeListener('uncaughtException',monitor);delete (globalThis as any).__launchErrorFixture;
  assert.equal(path.dirname(work),os.tmpdir());assert(path.basename(work).startsWith('quenching-launch-errors-'));
  await fs.remove(work);
}
