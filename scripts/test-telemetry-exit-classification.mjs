// Verify existing event semantics without real hooks, user settings, timers or HTTP.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'quenching-exit-classification-'));
const stateFile=path.join(root,'telemetry/startup-events.json'),require=createRequire(import.meta.url);
const bundle=await build({entryPoints:['src/Main/services/startup-telemetry.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false});
const read=async()=>JSON.parse(await fs.readFile(stateFile,'utf8'));
async function reset(){await fs.rm(stateFile,{force:true});}
function instance(){
  const app=new EventEmitter();app.getPath=()=>root;app.getVersion=()=>'3.6.1';
  const hooks=new Map(),module={exports:{}};
  new Function('require','module','exports','process','fetch','setTimeout',bundle.outputFiles[0].text)(
    name=>name==='electron'?{app}:require(name),module,module.exports,
    {platform:process.platform,arch:process.arch,on:(event,callback)=>hooks.set(event,callback)},
    ()=>{throw Error('Unexpected HTTP');},()=>({unref(){}}));
  return {telemetry:module.exports.startupTelemetry,app,hooks};
}
try{
  await reset();let test=instance();test.telemetry.markStartupSuccess();test.app.emit('before-quit');
  let state=await read();assert.equal(state.currentSession,null);assert(!state.events.some(e=>e.name==='app_crash'));
  instance();state=await read();assert(!state.events.some(e=>e.details?.reason==='unclean_exit'));

  await reset();test=instance();test.app.emit('before-quit');state=await read();
  assert(state.events.some(e=>e.name==='startup_failure'&&e.details?.reason==='quit_before_ready'));
  assert(!state.events.some(e=>e.name==='app_crash'));assert.equal(state.currentSession,null);

  await reset();test=instance();test.telemetry.markStartupSuccess();instance();state=await read();
  const inferred=state.events.find(e=>e.details?.reason==='unclean_exit');assert.equal(inferred.details.inferred,true);
  assert.equal(inferred.details.phase,'runtime');

  await reset();test=instance();const error=new TypeError('Object has been destroyed');
  test.hooks.get('uncaughtExceptionMonitor')(error,'uncaughtException');test.app.emit('before-quit');state=await read();
  const explicit=state.events.find(e=>e.name==='app_crash');assert.equal(explicit.details.errorMessage,error.message);
  assert.equal(explicit.details.process,'main');assert.equal(explicit.details.inferred,undefined);

  await reset();test=instance();test.telemetry.markStartupSuccess();const contents=new EventEmitter();
  test.app.emit('web-contents-created',{},contents);contents.emit('render-process-gone',{}, {reason:'crashed',exitCode:9});
  state=await read();assert(state.events.some(e=>e.details?.reason==='crashed'&&e.details?.exitCode===9));

  await reset();test=instance();test.telemetry.recordStartupFailure(new Error('ERR_FAILED (-2) loading local entry'));
  test.app.emit('before-quit');state=await read();
  assert(state.events.some(e=>e.name==='startup_failure'&&e.details?.phase==='window_load'&&e.details?.errorMessage.includes('ERR_FAILED')));
  assert(!state.events.some(e=>e.name==='app_crash'));
  console.log(JSON.stringify({passed:true,cases:['normal exit/restart','quit before ready','inferred unclean exit','explicit main exception retained','explicit renderer crash retained','window load failure retained'],productionRequests:0,realHooksInstalled:false}));
}finally{await fs.rm(root,{recursive:true,force:true});}
