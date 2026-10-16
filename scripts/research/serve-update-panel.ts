import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['scripts/research/update-panel-browser.tsx'], platform: 'browser', format: 'esm', bundle: true, write: false,
  plugins: [{ name: 'update-panel-fixture', setup(plugin) {
    // Keep all dialogs and state hooks real, even while hidden, to catch
    // renders triggered by the post-installation state refresh.
    plugin.onResolve({ filter: /\/MainWindow$|^\.\/MainWindow$/ }, args => ({ path: path.resolve(args.resolveDir, args.path, 'index.tsx') }));
    plugin.onResolve({ filter: /^\.\/BackgroundVideo$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
      const name = path.basename(args.path);
      return { contents: `const ${name}=()=>null;export {${name}};export default ${name};` };
    });
    plugin.onResolve({ filter: /\.less$/ }, args => ({ path: path.resolve(args.resolveDir, args.path), namespace: 'style-fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'style-fixture' }, async args => {
      const source = await fs.readFile(args.path, 'utf8');
      const names = [...new Set([...source.matchAll(/\.([a-zA-Z][\w]*)/g)].map(match => match[1]))];
      return { contents: `export default new Proxy({}, {get:(_,key)=>key});${names.map(name => `export const ${name}=${JSON.stringify(name)};`).join('')}`, loader: 'js' };
    });
  } }],
});
const server = http.createServer((request, response) => {
  if (request.url === '/global.css') {
    response.setHeader('Content-Type', 'text/css');
    fs.readFile('src/Renderer/styles/global.css').then(css => response.end(css));
    return;
  }
  if (request.url === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
  if (request.url?.split('?')[0] !== '/') { response.statusCode = 404; response.end(); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (request.url?.includes('installLayout=1')) {
    response.end('<!doctype html><meta charset="utf-8"><title>Install layout verification</title><link rel="stylesheet" href="/global.css"><div id="root"></div><script type="module" src="/bundle.js"></script>');
    return;
  }
  response.end('<!doctype html><meta charset="utf-8"><title>Update completion verification</title><style>.global-loading-overlay{position:fixed;inset:0;z-index:9999;background:#000b;display:grid;place-items:center}.global-loading-card{background:#222;padding:30px;color:white}.global-loading-track{background:#444;height:10px}.global-loading-fill{background:gold;height:10px}</style><div id="root"></div><script type="module" src="/bundle.js"></script>');
});
server.listen(4421, '127.0.0.1', () => console.log('Isolated update fixture: http://127.0.0.1:4421'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
