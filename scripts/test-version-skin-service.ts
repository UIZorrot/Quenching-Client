import assert from 'node:assert/strict';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { parseSkinSections } from '../src/shared/skin-versions';

const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-version-skins-'));
const retail = path.join(fixture, '_retail_');
const target = path.join(retail, 'units', 'unitskin.txt');
const before = '[Hamg]\nfile=existing\nfile:hd=keep-hd\nfile:de=keep-de\n[Hpal]\nfile=paladin\n';
await fs.ensureDir(path.dirname(target));
await fs.writeFile(target, before);
const config: any = { war3Path: fixture, customSkins: [{ id: 'legacy', targetId: 'Hamg', config: [] }] };
(globalThis as any).__skinFixture = { config, assets: path.resolve('assets'), target };
const bundle = await build({ stdin: { contents: 'export {versionSkinService} from "./src/Main/services/version-skin-service"; export {customSkinService} from "./src/Main/services/custom-skin-service";', resolveDir: process.cwd(), loader: 'ts' }, platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'fixture-dependencies', setup(build) {
    build.onResolve({ filter: /(?:config-manager|asset-sync|full-package-service|\/skin-service|@jamiephan\/casclib)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
      const prefix = 'const fixture = globalThis.__skinFixture;';
      const contents = args.path.endsWith('config-manager') ? 'export const configManager = {get: k=>fixture.config[k],set:(k,v)=>{fixture.config[k]=v}};'
        : args.path.endsWith('asset-sync') ? 'export const AssetSyncService={getAssetsDir:async()=>fixture.assets};'
        : args.path.endsWith('full-package-service') ? 'export async function assertFullPackageInstalled(){throw new Error("fixture: full package absent")}'
        : args.path.endsWith('/skin-service') ? 'export const skinService={enableSkins:async()=>{}};export const usesFullPackageSkinResource=c=>c.some(v=>v.value.startsWith("cos\\\\premium"));'
        : 'export class Storage {open(){throw new Error("fixture: no CASC")} close(){}}';
      return { contents: prefix + contents };
    });
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { versionSkinService: service, customSkinService: custom } = module.exports;
try {
  await Promise.all([
    service.apply('sd', [{ unitId: 'Hamg', skinId: 'sd-one', changes: [{ field: 'file', value: 'sd-model' }] }]),
    service.apply('de', [{ unitId: 'Hamg', skinId: 'de-one', changes: [{ field: 'file', value: 'de-model' }] }]),
  ]);
  const content = parseSkinSections(await fs.readFile(target, 'utf8'));
  assert.equal(content.Hamg['file:sd'], undefined);
  assert.equal(content.Hamg['file:de'], 'keep-de');
  assert.equal(content.Hamg['file:hd'], 'keep-hd');
  assert.equal(content.Hpal.file, 'paladin');
  const sdTarget = path.join(retail, 'QMoff', 'skin-profiles', 'sd', 'unitskin.txt');
  const deTarget = path.join(retail, 'QMoff', 'skin-profiles', 'de', 'unitskin.txt');
  assert.equal(parseSkinSections(await fs.readFile(sdTarget, 'utf8')).Hamg['file:sd'], 'sd-model');
  assert.equal(parseSkinSections(await fs.readFile(deTarget, 'utf8')).Hamg['file:de'], 'de-model');
  const panel = await service.panel('sd');
  assert.equal(panel.selections.sd.Hamg, 'sd-one');
  assert.equal(panel.selections.de.Hamg, 'de-one');
  await service.apply('sd', [{ unitId: 'Hamg', skinId: 'original', changes: [] }]);
  assert.equal(parseSkinSections(await fs.readFile(sdTarget, 'utf8')).Hamg['file:sd'], panel.originals.Hamg.find(c => c.field === 'file').value);
  assert.equal(custom.getAll()[0].artSet, 'hd');
  for (const artSet of ['sd','hd','de']) {
    const skin = await custom.create({ artSet, targetId: 'hfoo', name: '相同名称', category: 'unit', source: 'game-paths', modelPath: 'units/human/Footman/Footman' });
    assert.equal(skin.artSet, artSet);
    assert.equal(skin.config[0].value, 'units/human/Footman/Footman');
    assert.equal((await fs.readdir(path.join(retail, 'cos', 'custom', artSet, 'units', 'hfoo'))).length, 1);
  }
  const saved = JSON.stringify(config.skinSelections);
  config.war3Path = path.join(fixture, 'another-install');
  assert.deepEqual((await service.panel('hd')).selections, {});
  assert.equal(JSON.stringify(config.skinSelections), saved);
  console.log('PASS: per-profile skin writes, concurrent version isolation, persistence, reset, legacy migration, custom version folders, installation isolation');
} finally {
  // Only remove the exact temporary fixture allocated above, never a game directory.
  assert(path.dirname(fixture) === os.tmpdir() && path.basename(fixture).startsWith('quenching-version-skins-'));
  await fs.remove(fixture);
  delete (globalThis as any).__skinFixture;
}
