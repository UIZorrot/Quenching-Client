import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { Storage } from '@jamiephan/casclib';
import { ModelResourceService } from '../../src/Main/services/model-resource-service';
import { parseSkinSections } from '../../src/shared/skin-versions';
import less from 'less';
const game = process.argv[2];
if (!game) throw new Error('Usage: tsx scripts/research/serve-skin-panel.ts GAME_PATH');
const storage = new Storage(); storage.open(game + '*w3');
const file = storage.openFile('war3.w3mod:units\\unitskin.txt');
const baseline = parseSkinSections(file.readAll().toString('utf8')); file.close(); storage.close();
const resources = new ModelResourceService();
const bundle = await build({ entryPoints: [path.resolve('scripts/research/skin-panel-browser.tsx')], bundle: true, platform: 'browser', format: 'esm', write: false,
  plugins: [{ name: 'fixture-hooks', setup(build) {
    build.onResolve({ filter: /hooks\/(useWar3Detector|useWar3Settings|useSound)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('useWar3Detector')
      ? 'export const useWar3Detector = () => ({ currentInstallation: { path: "fixture" } });'
      : args.path.endsWith('useWar3Settings')
        ? 'export const useWar3Settings = () => ({modSettings:{graphicsSelection:new URLSearchParams(location.search).get("mode")||"hd",classicMode:false},settings:{hd:true}});'
        : 'export const useSound = () => ({playSmall(){},playHover(){},playMain(){}});' }));
    build.onResolve({ filter: /\.module\.less$/ }, args => ({ path: path.resolve(args.resolveDir, args.path), namespace: 'less-module' }));
    build.onLoad({ filter: /.*/, namespace: 'less-module' }, async args => {
      const source = await fs.readFile(args.path, 'utf8');
      const result = await less.render(source, { filename: args.path });
      const names = [...source.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => match[1]).filter(name => /^[a-zA-Z][\w]*$/.test(name));
      const css = result.css.replace(/:global\(([^)]+)\)/g, '$1');
      return { contents: `const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.appendChild(style);${[...new Set(names)].map(name => `export const ${name}=${JSON.stringify(name)};`).join('')}`, loader: 'js' };
    });
  } }],
});
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url!, 'http://127.0.0.1');
    if (url.pathname === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
    if (url.pathname === '/baseline') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(baseline)); return; }
    if (url.pathname === '/resource') {
      const name = url.searchParams.get('path') || '', basePath = url.searchParams.get('basePath') || undefined;
      const relativeBase = basePath && path.isAbsolute(basePath) ? path.relative(path.resolve(game), path.resolve(basePath)) : undefined;
      if (path.isAbsolute(name) || (relativeBase !== undefined && (relativeBase.startsWith('..') || path.isAbsolute(relativeBase)))) throw new Error('Read-only fixture: game resources only');
      const data = await resources.read({ path: name, basePath, artSet: url.searchParams.get('artSet') as any }, game);
      response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ data: data.bytes.toString('base64'), resolvedPath: data.resolvedPath })); return;
    }
    if (url.pathname.startsWith('/assets/quenching/')) {
      const fileName = path.basename(url.pathname);
      response.setHeader('Content-Type', fileName.endsWith('.mp4') ? 'video/mp4' : fileName.endsWith('.svg') ? 'image/svg+xml' : 'image/png'); response.end(await fs.readFile(path.join('public','assets','quenching',fileName))); return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><meta charset="utf-8"><title>Skin panel verification</title><body style="background:#151515;color:#ddd"><div id="root"></div><script type="module" src="/bundle.js"></script>');
  } catch (error) { response.statusCode = 404; response.end(String(error)); }
});
server.listen(4420, '127.0.0.1', () => console.log('Read-only skin panel fixture: http://127.0.0.1:4420'));
process.on('SIGINT', () => { resources.close(); server.close(); process.exit(0); });
