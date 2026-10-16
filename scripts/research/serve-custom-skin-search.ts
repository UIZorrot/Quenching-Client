import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import less from 'less';

const bundle = await build({
  entryPoints: ['scripts/research/custom-skin-search-browser.tsx'], platform: 'browser', format: 'esm', bundle: true, write: false,
  plugins: [{ name: 'real-editor-styles', setup(plugin) {
    plugin.onResolve({ filter: /\.module\.less$/ }, args => ({ path: path.resolve(args.resolveDir, args.path), namespace: 'less-module' }));
    plugin.onLoad({ filter: /.*/, namespace: 'less-module' }, async args => {
      const source = await fs.readFile(args.path, 'utf8');
      const result = await less.render(source, { filename: args.path });
      const names = [...new Set([...source.matchAll(/\.([a-zA-Z][\w]*)/g)].map(match => match[1]))];
      return { contents: `const style=document.createElement('style');style.textContent=${JSON.stringify(result.css.replace(/:global\(([^)]+)\)/g, '$1'))};document.head.appendChild(style);${names.map(name => `export const ${name}=${JSON.stringify(name)};`).join('')}`, loader: 'js' };
    });
  } }],
});
const server = http.createServer((request, response) => {
  if (request.url?.startsWith('/bundle.js')) { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
  if (request.url?.startsWith('/assets/')) { response.statusCode = 204; response.end(); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end('<!doctype html><meta charset="utf-8"><title>Custom skin search verification</title><body style="background:#151515;color:white"><div id="root"></div><script type="module" src="/bundle.js"></script>');
});
server.listen(4423, '127.0.0.1', () => console.log('Isolated editor fixture: http://127.0.0.1:4423'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
