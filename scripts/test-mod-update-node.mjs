// Run the signed download/apply/commit smoke test under Node without creating an
// Electron store or accessing the real client's persisted configuration.
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const result = await build({
  entryPoints: ['scripts/test-mod-update-smoke.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  plugins: [{ name: 'temporary-update-config', setup(plugin) {
    plugin.onResolve({ filter: /\/config-manager$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const configManager = { get: key => key === "gameChannel" ? "retail" : undefined };' }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
