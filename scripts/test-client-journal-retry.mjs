import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'quenching-journal-retry-'));
const file=path.join(root,'journal.json');
const original={state:'installing',replaced:[]},next={state:'installing',replaced:['QMClient.exe']};
fs.writeFileSync(file,JSON.stringify(original));
let blocked=0;
const fileSystem={...fs,renameSync(source,target){
  if(target===file && blocked++<2){
    assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),original,'Original journal must stay intact while locked');
    const error=new Error('Simulated Windows reader lock');error.code='EPERM';throw error;
  }
  return fs.renameSync(source,target);
}};
const source=fs.readFileSync('assets/updater/client-update-helper.cjs','utf8');
const context={require:name=>name==='node:fs'?fileSystem:importRequire(name),setTimeout,Buffer,process:{},module:{exports:{}}};
import { createRequire } from 'node:module';
const importRequire=createRequire(import.meta.url);
try{
  vm.runInNewContext(source.slice(0,source.indexOf('(process.argv[4]'))+'\nmodule.exports={writeJournal};',context);
  await context.module.exports.writeJournal(file,next);
  assert.equal(blocked,3);
  assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),next);
  assert(!fs.existsSync(file+'.tmp'));
  console.log('PASS: transient Windows journal locks retried; before-replace atomic record preserved');
}finally{fs.rmSync(root,{recursive:true,force:true});}
