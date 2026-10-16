import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import less from 'less';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['scripts/research/news-language-browser.tsx'], platform: 'browser', format: 'esm', bundle: true, write: false,
  plugins: [{ name: 'news-language-fixture', setup(plugin) {
    plugin.onResolve({ filter: /hooks\/useSound$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useSound=()=>({playSmall(){},playHover(){}});' }));
    plugin.onResolve({ filter: /\.module\.less$/ }, args => ({ path: path.resolve(args.resolveDir, args.path), namespace: 'less-module' }));
    plugin.onLoad({ filter: /.*/, namespace: 'less-module' }, async args => {
      const source = await fs.readFile(args.path, 'utf8');
      const result = await less.render(source, { filename: args.path });
      const names = [...new Set([...source.matchAll(/\.([a-zA-Z][\w]*)/g)].map(match => match[1]))];
      return { contents: `const style=document.createElement('style');style.textContent=${JSON.stringify(result.css.replace(/:global\(([^)]+)\)/g, '$1'))};document.head.appendChild(style);const names=${JSON.stringify(Object.fromEntries(names.map(name => [name, name])))};export default names;${names.map(name => `export const ${name}=${JSON.stringify(name)};`).join('')}`, loader: 'js' };
    });
  } }],
});
const server = http.createServer((request, response) => {
  if (request.url?.startsWith('/bundle.js')) { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end('<!doctype html><meta charset="utf-8"><title>News language verification</title><body style="background:#151515;color:white"><div id="root"></div><script type="module" src="/bundle.js"></script>');
});
server.listen(4424, '127.0.0.1', () => console.log('Isolated news language fixture: http://127.0.0.1:4424'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
