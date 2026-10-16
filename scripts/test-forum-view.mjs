// Real Electron views and the real ForumPanel, using an isolated local forum.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const workspace = process.cwd();
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-forum-view-'));
const client = await build({ stdin: { loader: 'tsx', resolveDir: workspace, contents: `
  import React,{useState} from 'react'; import {createRoot} from 'react-dom/client';
  import {ConfigProvider,theme} from 'antd'; import {ForumPanel} from './src/Renderer/components/MainWindow/ForumPanel';
  function App(){const [open,setOpen]=useState(false);return <ConfigProvider theme={{algorithm:theme.darkAlgorithm}}><button id="open" onClick={()=>setOpen(true)}>Forum</button><ForumPanel open={open} onClose={()=>setOpen(false)}/></ConfigProvider>;}
  createRoot(document.getElementById('root')).render(<App/>);
` }, bundle: true, platform: 'browser', format: 'iife', write: false, define: { 'process.env.NODE_ENV': '"production"' } });
const css = await fs.readFile('src/Renderer/styles/global.css', 'utf8');
const server = createServer((request, response) => {
  if (request.url === '/client') {
    response.setHeader('content-type', 'text/html');
    response.end(`<html><style>${css}</style><body><div id="root"></div><script src="/client.js"></script></body></html>`);
  } else if (request.url === '/client.js') {
    response.setHeader('content-type', 'text/javascript'); response.end(client.outputFiles[0].text);
  } else if (request.url === '/login') {
    response.setHeader('set-cookie', 'forum_fixture_session=fixture; HttpOnly; SameSite=Lax; Max-Age=86400'); response.end('Logged in');
  } else {
    response.setHeader('content-type', 'text/html'); response.end('<html><title>Forum fixture</title><body><p>Isolated forum</p></body></html>');
  }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const url = `http://127.0.0.1:${server.address().port}`;
await fs.writeFile(path.join(root, 'preload.cjs'), `
  const {contextBridge,ipcRenderer}=require('electron');
  contextBridge.exposeInMainWorld('electronAPI',{
    showForum:b=>ipcRenderer.invoke('forum:show',b),setForumBounds:b=>ipcRenderer.invoke('forum:bounds',b),
    hideForum:()=>ipcRenderer.invoke('forum:hide'),reloadForum:()=>ipcRenderer.invoke('forum:reload'),
    getConfig:async()=> 'zh-CN',openExternal:async()=>{}
  });
`);
const main = await build({ stdin: { loader: 'ts', resolveDir: workspace, contents: `
  import assert from 'node:assert/strict'; import path from 'node:path';
  import {app,BrowserWindow,WebContentsView,session} from 'electron';
  import {registerForumHandlers} from './src/Main/ipc/forum-handlers';
  app.setPath('userData',path.join(process.env.FORUM_TEST_ROOT,'userData'));app.disableHardwareAcceleration();
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn){for(let n=0;n<200;n++){if(await fn())return;await pause(30);}throw new Error('Timed out');}
  const child=w=>w.contentView.children.find(v=>v instanceof WebContentsView && v.webContents!==w.webContents);
  async function run(){await app.whenReady();registerForumHandlers();
    const w=new BrowserWindow({show:false,width:960,height:640,webPreferences:{preload:path.join(process.env.FORUM_TEST_ROOT,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
    await w.loadURL(process.env.FORUM_TEST_URL+'/client');const main=script=>w.webContents.executeJavaScript(script);
    await until(()=>main("!!document.querySelector('#open')"));const baseline=w.webContents.listenerCount('did-start-loading');
    for(let n=0;n<3;n++){
      await main("document.querySelector('#open').click()");await until(()=>!!child(w));const view=child(w);
      await until(()=>view.webContents.executeJavaScript("document.title==='Forum fixture'"));
      assert.equal(await view.webContents.executeJavaScript('typeof window.electronAPI'),'undefined');
      assert.equal(await view.webContents.executeJavaScript('typeof require'),'undefined');
      assert.ok(view.getBounds().width>500);assert.ok(view.getBounds().height>200);
      if(n===0&&!process.env.FORUM_TEST_RESTORE){await view.webContents.executeJavaScript("fetch('/login').then(r=>r.text())");}
      assert.equal((await view.webContents.session.cookies.get({url:process.env.FORUM_TEST_URL,name:'forum_fixture_session'})).length,1);
      const width=view.getBounds().width;w.setSize(n%2===0?800:960,640);await until(()=>view.getBounds().width!==width);
      assert.ok(view.getBounds().x+view.getBounds().width<=w.getContentSize()[0]);
      await main("[...document.querySelectorAll('.forum-panel-actions button')].find(b=>b.textContent.includes('刷新')).click()");
      await until(()=>view.webContents.executeJavaScript("document.title==='Forum fixture'"));
      const closing=view.webContents;await main("document.querySelector('[aria-label=\\\"关闭论坛\\\"]').click()");
      await until(()=>closing.isDestroyed());assert.equal(child(w),undefined);
      assert.equal(w.webContents.listenerCount('did-start-loading'),baseline);
    }
    await session.fromPartition('persist:forum-test').cookies.flushStore();w.destroy();
    console.log(process.env.FORUM_TEST_RESTORE?'PASS: forum session survives Electron restart':'PASS: embedded forum, resize, refresh, isolated page and repeated close cleanup');app.quit();
  }run().catch(error=>{console.error(error);process.exit(1);});
` }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  plugins: [{ name: 'isolated-forum-session', setup(builder) {
    builder.onResolve({ filter: /shared\/forum$/ }, () => ({ path: 'forum-fixture', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const FORUM_URL=process.env.FORUM_TEST_URL+"/?feed=boards";export const FORUM_SESSION_PARTITION="persist:forum-test";' }));
  } }],
});
await fs.writeFile(path.join(root, 'main.cjs'), main.outputFiles[0].text);
const env = { ...process.env, FORUM_TEST_ROOT: root, FORUM_TEST_URL: url }; delete env.ELECTRON_RUN_AS_NODE;
try {
  for (const restart of [false, true]) {
    const process = spawn(path.resolve('node_modules/electron/dist/electron.exe'), [path.join(root, 'main.cjs')], {
      env: { ...env, ...(restart ? { FORUM_TEST_RESTORE: '1' } : {}) }, windowsHide: true,
    });
    let output = ''; const append = chunk => { output = (output + chunk).slice(-5000); };
    process.stdout.on('data', append); process.stderr.on('data', append);
    const timer = setTimeout(() => process.kill(), 30000); const [code] = await once(process, 'exit'); clearTimeout(timer);
    console.log(output); if (code !== 0) throw new Error('Forum view fixture failed: ' + code);
  }
} finally { server.close(); await fs.rm(root, { recursive: true, force: true }); }
