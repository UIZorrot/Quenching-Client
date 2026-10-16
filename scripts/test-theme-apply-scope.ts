import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-theme-scope-'));
const targets = ['mainmenu.webm', 'mainmenu_1.webm', 'mainmenu_fk.webm', 'mainmenu_sd.webm', 'mainmenu_tft.webm', 'mainmenu_tft_sd.webm'];
const fixture: any = { config: { war3Path: root, themeApplyToGame: false, gameChannel: 'retail',
  customThemes: [{ id: 'custom-fixture', videoPath: path.join(root, 'theme.mp4') }] }, enabled: true, writes: 0 };
(globalThis as any).__themeScopeFixture = fixture;
try {
  await fs.writeFile(path.join(root, 'theme.mp4'), 'selected theme');
  for (const channel of ['_retail_', '_ptr_']) {
    await fs.mkdir(path.join(root, channel, 'webui', 'Webms'), { recursive: true });
    for (const name of targets) await fs.writeFile(path.join(root, channel, 'webui', 'Webms', name), 'previous game theme');
  }
  const bundle = await build({ entryPoints: ['src/Main/services/theme-service.ts'], bundle: true,
    platform: 'node', format: 'cjs', packages: 'external', write: false,
    plugins: [{ name: 'isolated-theme', setup(builder) {
      builder.onResolve({ filter: /(?:\/config-manager$|\/game-channel$|\/managed-resource-files$|^electron$)/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        const prefix = 'const f=globalThis.__themeScopeFixture;';
        const code = args.path === 'electron' ? 'export const app={getAppPath:()=>f.config.war3Path};'
          : args.path.endsWith('/config-manager') ? 'export const configManager={get:key=>f.config[key]};'
          : args.path.endsWith('/game-channel') ? 'export const getSelectedGameChannel=()=>f.config.gameChannel;export const getSelectedGameFolder=()=>f.config.gameChannel==="ptr"?"_ptr_":"_retail_";export const getChannelModEnabled=()=>f.enabled;'
          : 'import fs from "node:fs/promises";import path from "node:path";export const installBundledResourceFile=async(root,target,source)=>{f.writes++;await fs.copyFile(source,path.join(root,target));};export const removeBundledResourceFile=async()=>{f.writes++;};';
        return { contents: prefix + code };
      });
    } }],
  });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  const service = module.exports.themeService;
  assert.equal(await service.applyThemeToGame('custom-fixture'), true);
  assert.equal(fixture.writes, 0, 'client-only themes never copy/delete game files');
  for (const channel of ['_retail_', '_ptr_']) for (const name of targets)
    assert.equal(await fs.readFile(path.join(root, channel, 'webui', 'Webms', name), 'utf8'), 'previous game theme');
  delete fixture.config.war3Path;
  assert.equal(await service.applyThemeToGame('missing-theme'), true, 'client-only apply needs no Warcraft path or game asset');
  fixture.config.war3Path = root;
  delete fixture.config.themeApplyToGame;
  assert.equal(await service.applyThemeToGame('custom-fixture'), true, 'missing preference defaults to applying to Warcraft');
  assert.equal(fixture.writes, 6);
  for (const name of targets) {
    assert.equal(await fs.readFile(path.join(root, '_retail_', 'webui', 'Webms', name), 'utf8'), 'selected theme');
    assert.equal(await fs.readFile(path.join(root, '_ptr_', 'webui', 'Webms', name), 'utf8'), 'previous game theme');
  }
  fixture.config.themeApplyToGame = true;
  fixture.config.gameChannel = 'ptr';
  assert.equal(await service.applyThemeToGame('custom-fixture'), true);
  assert.equal(fixture.writes, 12);
  for (const name of targets) assert.equal(await fs.readFile(path.join(root, '_ptr_', 'webui', 'Webms', name), 'utf8'), 'selected theme');
  console.log('PASS: client-only writes zero game files; default-on and enabled themes apply to the selected branch');
} finally { delete (globalThis as any).__themeScopeFixture; await fs.rm(root, { recursive: true, force: true }); }
