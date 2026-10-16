// Actual resolver/argument builder, synthetic install metadata; no game, account, or OS registry access.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const variable = (n: number): Buffer => { const b=[];do { b.push((n&127)|(n>127?128:0));n=Math.floor(n/128); } while(n);return Buffer.from(b); };
const field = (id: number, bytes: Buffer | string) => { const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);return Buffer.concat([variable(id*8+2),variable(b.length),b]); };
const installed = (uid: string, root: string) => field(1,Buffer.concat([field(1,uid),field(2,'w3'),field(3,field(1,root))]));
const f = { platform:'win32', retail:'D:\\游戏\\Warcraft III', ptr:'E:\\PTR\\Warcraft III', db:Buffer.alloc(0), missingDb:false, hasBattle:true,
  processes:[] as any[], queries:[] as string[], reads:[] as string[] };
(globalThis as any).__battlePlatformFixture=f;
const bundle = await build({entryPoints:['src/Main/services/battle-net-launcher.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false,
  plugins:[{name:'isolated-platform',setup(p){
    p.onResolve({filter:/^(?:child_process|fs-extra|path|os)$/},a=>({path:a.path,namespace:'fixture'}));
    p.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:'const f=globalThis.__battlePlatformFixture;'+(
      a.path==='path' ? 'const p=require("node:path");export default {...(f.platform==="darwin"?p.posix:p.win32),posix:p.posix,win32:p.win32};'
      : a.path==='os' ? 'export default {homedir:()=>"/Users/test"};'
      : a.path==='fs-extra' ? 'export default {stat:async()=>{if(f.missingDb)throw Error("ENOENT");return {size:f.db.length}},readFile:async file=>{f.reads.push(file);return f.db},pathExists:async()=>f.hasBattle};'
      : `import {promisify} from 'node:util';import {EventEmitter} from 'node:events';
         const execFile=()=>{throw Error('unmocked registry call')};execFile[promisify.custom]=async(command,args)=>{
           if(f.platform==='darwin')throw Error('Mac must not query the Windows registry');f.queries.push(args.at(-1));
           const script=args.at(-1);return {stdout:script.includes('\\\\Battle.net')?'C:\\\\战网':script.includes('Public Test')?f.ptr:f.retail};
         };export {execFile};export const spawn=(command,args,options)=>{f.processes.push({command,args,options});const c=new EventEmitter();c.unref=()=>{};queueMicrotask(()=>c.emit('spawn'));return c;};`
    )}));
  }}],
});
try {
  for(const platform of ['win32','darwin']) {
    f.platform=platform;f.retail=platform==='darwin'?'/Applications/魔兽 III':'D:\\游戏\\Warcraft III';f.ptr=platform==='darwin'?'/Volumes/Test/魔兽 PTR':'E:\\PTR\\Warcraft III';
    f.db=Buffer.concat([installed('w3',f.retail),installed('w3t',f.ptr)]);f.missingDb=false;f.hasBattle=true;
    const runtime={platform,env:{PROGRAMDATA:'C:\\ProgramData','ProgramFiles(x86)':'C:\\Program Files (x86)'},pid:process.pid};
    const module={exports:{} as any};new Function('require','module','exports','process',bundle.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports,runtime);
    const {launchViaBattleNet,resolveBattleNetExe}=module.exports;
    for(const channel of ['retail','ptr']) {
      f.processes=[];f.queries=[];f.reads=[];
      assert.equal(await launchViaBattleNet(channel==='ptr'?f.ptr:f.retail,channel),true);
      assert.equal(f.processes.length,1);assert.deepEqual(f.processes[0].args,[platform==='darwin'?`--exec=launch ${channel==='ptr'?'W3T':'W3'}`:`--exec="launch ${channel==='ptr'?'W3T':'W3'}"`]);
      assert.equal(f.processes[0].options.shell,undefined);
      if(platform==='darwin') { assert.equal(f.queries.length,0);assert.equal(f.processes[0].command,'/Applications/Battle.net.app/Contents/MacOS/Battle.net');assert.equal(f.reads[0],'/Users/Shared/Battle.net/Agent/product.db'); }
      else assert.ok(f.processes[0].command.endsWith('Battle.net.exe'));
    }
    f.queries=[];assert.equal(await resolveBattleNetExe(f.retail,'ptr'),null,'PTR must not use the Retail registered folder');assert.equal(f.queries.length,0);
    f.hasBattle=false;assert.equal(await resolveBattleNetExe(f.retail,'retail'),null);f.hasBattle=true;
    f.missingDb=true;
    assert.equal(Boolean(await resolveBattleNetExe(f.retail,'retail')),platform==='win32');
    assert.equal(Boolean(await resolveBattleNetExe(f.ptr,'ptr')),platform==='win32');
    f.missingDb=false;
  }
  console.log('PASS: real resolver with Windows/Mac Retail/PTR metadata; fixed product arguments; registered-root match; no Shell; missing-client/metadata fallback; no real processes or credentials');
} finally { delete (globalThis as any).__battlePlatformFixture; }
