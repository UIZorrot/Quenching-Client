// Exercise real Electron ownership/teardown, with local pages and isolated userData only.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-window-lifecycle-'));
const server = createServer((request, response) => {
  if (request.url === '/slow') return; // The test closes the window before this navigation completes.
  response.setHeader('Content-Type', 'text/html');
  response.end('<html><title>Local lifecycle fixture</title><body>fixture</body></html>');
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const url = `http://127.0.0.1:${server.address().port}`;
try {
  const bundle = await build({ stdin: { loader: 'ts', resolveDir: process.cwd(), contents: `
    import assert from 'node:assert/strict';import path from 'node:path';
    import {app,BrowserWindow,WebContentsView} from 'electron';
    import {showForum,hideForum} from './src/Main/ipc/forum-handlers';
    import {setSlowForumURL} from './src/shared/forum';
    app.setPath('userData',path.join(process.env.LIFECYCLE_TEST_ROOT,'userData'));
    app.on('window-all-closed',()=>{});
    const errors=[];
    // Fixture-only observer: fail assertions on unexpected errors; never installed in the client.
    process.on('uncaughtException',error=>errors.push({message:error.message,stack:error.stack}));
    const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    async function until(fn){for(let i=0;i<200;i++){if(fn())return;await pause(10);}throw Error('Timed out');}
    const bounds={x:0,y:0,width:300,height:200};
    const child=w=>w.contentView.children.find(v=>v instanceof WebContentsView && v.webContents!==w.webContents);
    async function window(){const w=new BrowserWindow({show:false});await w.loadURL(process.env.LIFECYCLE_TEST_URL);return w;}
    async function run(){await app.whenReady();
      const normal=await window();const baseline=normal.webContents.listenerCount('did-start-loading');
      for(let i=0;i<3;i++){
        await showForum(normal,bounds);const view=child(normal),contents=view.webContents;
        hideForum(normal);await until(()=>contents.isDestroyed());
        assert.equal(child(normal),undefined);assert.equal(normal.webContents.listenerCount('did-start-loading'),baseline);
      }
      normal.destroy();await pause(30);assert.equal(errors.length,0);
      const destroyed=await window();await showForum(destroyed,bounds);
      const contents=child(destroyed).webContents;destroyed.destroy();
      await until(()=>contents.isDestroyed());await pause(30);
      if(process.env.LIFECYCLE_EXPECT_OLD_ERROR==='1'){
        assert.equal(errors.length,1);assert.match(errors[0].message,/Object has been destroyed/);
        assert.match(errors[0].stack,/onceWrapper/);
        console.log(JSON.stringify({reproduced:true,scenario:'owner destroyed with forum open',error:errors[0]}));
        app.quit();return;
      }
      assert.equal(errors.length,0,JSON.stringify(errors));
      const reload=await window();await showForum(reload,bounds);
      const reloadContents=child(reload).webContents;await reload.loadURL(process.env.LIFECYCLE_TEST_URL+'/?reload');
      await until(()=>reloadContents.isDestroyed());assert.equal(child(reload),undefined);reload.destroy();
      const loading=await window();setSlowForumURL();
      const pending=showForum(loading,bounds).then(()=>null,error=>error);
      const loadingContents=child(loading).webContents;loading.close();
      await until(()=>loadingContents.isDestroyed());const aborted=await pending;
      assert(aborted instanceof Error,'closing during navigation must retain the load rejection');
      await pause(30);assert.equal(errors.length,0,JSON.stringify(errors));
      const local=new BrowserWindow({show:false});
      const localPending=local.loadFile(path.join(process.env.LIFECYCLE_TEST_ROOT,'client.html')).then(()=>null,error=>error);
      local.destroy();const localAbort=await localPending;
      assert(localAbort instanceof Error);assert(localAbort.message.includes('ERR_FAILED (-2)'));
      await pause(30);assert.equal(errors.length,0,JSON.stringify(errors));
      console.log(JSON.stringify({passed:true,cases:['repeated hide','owner destroy with forum open','owner reload','close during load','close during existing local file load'],abortedLoadError:aborted.message,localLoadError:localAbort.message,uncaughtExceptions:errors.length,productionRequests:0}));
      app.quit();
    }
    run().catch(error=>{console.error(error);app.exit(1);});
  ` }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
    plugins: [{ name: 'local-forum-only', setup(builder) {
      builder.onResolve({ filter: /shared\/forum$/ }, () => ({ path: 'forum-fixture', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents:
        'export const FORUM_SESSION_PARTITION="persist:lifecycle-fixture";export let FORUM_URL=process.env.LIFECYCLE_TEST_URL+"/";export function setSlowForumURL(){FORUM_URL=process.env.LIFECYCLE_TEST_URL+"/slow";}' }));
    } }],
  });
  await fs.writeFile(path.join(root, 'main.cjs'), bundle.outputFiles[0].text);
  await fs.writeFile(path.join(root, 'client.html'), '<html><body>Existing local entry</body></html>');
  const env = { ...process.env, LIFECYCLE_TEST_ROOT: root, LIFECYCLE_TEST_URL: url,
    LIFECYCLE_EXPECT_OLD_ERROR: process.argv.includes('--expect-existing-error') ? '1' : '0' };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(path.resolve('node_modules/electron/dist/electron.exe'), [path.join(root, 'main.cjs')], { env, windowsHide: true });
  let output = '';
  const append = chunk => { output = (output + chunk).slice(-7000); };
  child.stdout.on('data', append);child.stderr.on('data', append);
  const timer = setTimeout(() => child.kill(), 15000);
  let code;
  try { [code] = await once(child, 'exit'); } finally { clearTimeout(timer); }
  console.log(output);assert.equal(code,0,'Lifecycle fixture failed');
} finally {
  server.closeAllConnections();server.close();
  await fs.rm(root, { recursive: true, force: true });
}
