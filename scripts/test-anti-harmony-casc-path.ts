import assert from 'node:assert/strict';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-vio-path-test-'));
const game = path.join(work, '魔兽争霸');
const fixture = { opened: [] as string[], closed: 0, config: {} as Record<string, unknown> };
(globalThis as any).__vioPathFixture = fixture;
try {
    await fs.ensureDir(path.join(game, '_retail_'));
    const bundle = await build({
        stdin: { contents: 'export {setAntiHarmonyEnabled} from "./src/Main/services/anti-harmony-service";', resolveDir: process.cwd(), loader: 'ts' },
        platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
        plugins: [{ name: 'vio-path', setup(plugin) {
            plugin.onResolve({ filter: /(?:config-manager|game-channel)$|^@jamiephan\/casclib$/ }, args => ({ path: args.path, namespace: 'fixture' }));
            plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: 'const f=globalThis.__vioPathFixture;' + (
                args.path.endsWith('config-manager') ? 'export const configManager={get:key=>f.config[key],set:(key,value)=>f.config[key]=value};'
                : args.path.endsWith('game-channel') ? 'export const getSelectedGameFolder=()=>"_retail_";'
                : `export class Storage {
                    open(name){f.opened.push(name);}close(){f.closed++;}
                    findFirstFile(){return {fileName:'war3.w3mod:_hd.w3mod:_teen.w3mod:units\\\\human\\\\footman.mdx'};}
                    findNextFile(){return null;}findClose(){}fileExists(){return true;}
                    openFile(){return {readAll:()=>Buffer.from('uncensored-model'),close(){}};}
                }`
            ) }));
        } }],
    });
    const module = { exports: {} as any };
    new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
    const active = path.join(game, '_retail_', 'units/human/footman.mdx');
    await module.exports.setAntiHarmonyEnabled(game, true);
    assert.equal(await fs.readFile(active, 'utf8'), 'uncensored-model');
    assert.equal(fixture.opened.length, 1);
    assert(fixture.opened[0].endsWith('*w3'));
    if (process.platform === 'win32') {
        assert.match(fixture.opened[0], /^[\x00-\x7f]+$/);
        assert.equal(await fs.pathExists(fixture.opened[0].slice(0, -3)), false);
    }
    assert.equal(fixture.closed, 1);
    await module.exports.setAntiHarmonyEnabled(game, false);
    assert.equal(await fs.pathExists(active), false);
    assert.equal(await fs.readFile(path.join(game, '_retail_/QMoff/vio/units/human/footman.mdx'), 'utf8'), 'uncensored-model');
    assert.equal(fixture.config.antiHarmony, false);
    console.log('PASS: anti-harmony extracts via the shared Unicode CASC path, releases the handle/junction and parks only its fixture files');
} finally {
    delete (globalThis as any).__vioPathFixture;
    assert(path.basename(work).startsWith('quenching-vio-path-test-'));
    await fs.remove(work);
}
