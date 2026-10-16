import http from 'node:http';
import path from 'node:path';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const game = process.argv[2];
if (!game) throw new Error('Usage: tsx scripts/research/serve-de-preview.ts GAME_PATH');
// Keep this read-only Node harness independent of Electron configuration.
const backend = await build({
  stdin: { contents: 'export { ModelResourceService } from "./src/Main/services/model-resource-service";', resolveDir: process.cwd(), loader: 'ts' },
  platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'read-only-branch', setup(plugin) {
    plugin.onResolve({ filter: /\/game-channel$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const getSelectedGameFolder = () => "_retail_";' }));
  } }],
});
const backendModule = { exports: {} as any };
new Function('require', 'module', 'exports', backend.outputFiles[0].text)(createRequire(import.meta.url), backendModule, backendModule.exports);
const resources = new backendModule.exports.ModelResourceService();
const bundle = await build({ entryPoints: [path.resolve('scripts/research/de-preview-browser.ts')], bundle: true,
  platform: 'browser', format: 'iife', write: false, sourcemap: 'inline' });
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url!, 'http://127.0.0.1');
    if (url.pathname === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
    if (url.pathname === '/resource') {
      const name = url.searchParams.get('path') || '', basePath = url.searchParams.get('basePath') || undefined;
      if (path.isAbsolute(name) || (basePath && !basePath.startsWith('casc://'))) throw new Error('Harness serves CASC-relative resources only');
      const data = await resources.read({ path: name, basePath, artSet: 'de' }, game);
      response.setHeader('X-Resource-Path', encodeURIComponent(data.resolvedPath)); response.end(data.bytes); return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><title>DE model rendering verification</title><body style="background:#222;color:#ddd"><input style="width:650px" value="war3.w3mod:_de.w3mod:units/human/footman/footman.mdx"><button>Load</button><br><canvas width="800" height="600"></canvas><pre>Loading…</pre><script src="/bundle.js"></script>');
  } catch (error) { response.statusCode = 404; response.end(String(error)); }
});
server.listen(4419, '127.0.0.1', () => console.log('DE preview: http://127.0.0.1:4419'));
process.on('SIGINT', () => { resources.close(); server.close(); process.exit(0); });
