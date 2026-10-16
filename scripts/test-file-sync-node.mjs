// Real services, isolated temporary installs, local HTTP; no production keys or configuration.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const result = await build({
  entryPoints: [process.argv[2] || 'scripts/test-file-sync.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  plugins: [{ name: 'isolated-config-and-electron', setup(plugin) {
    // Plain Node already treats ASAR as a normal file; Electron provides original-fs.
    plugin.onResolve({ filter: /^original-fs$/ }, () => ({ path: 'node:fs', external: true }));
    // These fixtures are temporary installations, never the running real game.
    // Keep the production game-running guard intact; isolate only its OS process query.
    plugin.onResolve({ filter: /^child_process$/ }, args => args.importer.endsWith('mod-update-service.ts')
      ? { path: 'virtual-game-processes', namespace: 'process-fixture' } : undefined);
    plugin.onLoad({ filter: /.*/, namespace: 'process-fixture' }, () => ({ contents: `
      import childProcess from 'node:child_process'; import { promisify } from 'node:util';
      const execFile = (...args) => childProcess.execFile(...args);
      execFile[promisify.custom] = (command, ...args) => command === 'tasklist.exe' || command === 'ps'
        ? Promise.resolve({ stdout: '', stderr: '' }) : promisify(childProcess.execFile)(command, ...args);
      export default { ...childProcess, execFile };
    ` }));
    plugin.onResolve({ filter: /(?:\/config-manager$|\/release-gate-service$|^electron$)/ }, args =>
      process.argv.includes('--real-gate') && args.path.endsWith('/release-gate-service') ? undefined : ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'electron'
      ? 'export const app = { isPackaged: true, getVersion: () => "3.5.0", getPath: () => process.cwd() };'
      : args.path.endsWith('/release-gate-service') ? 'export const fetchReleaseGate = async () => ({gate:{allowed:1,version:"3.8",modVersion:"3.8"}}); export const previewUpdatesEnabled = () => false;'
      : 'export const configManager = { get: key => key === "gameChannel" ? (globalThis.__updateFixtureChannel || "retail") : undefined };' }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
await module.exports.run();
