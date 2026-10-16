import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { withShaderBundle } from '../src/Main/services/shader-bundle';

// Services run against isolated paths; the real game/registry/processes are not used.
const fixture = { parts: [3, 0, 0, 24268], channel: 'retail', settings: { lighting: 'standard', lightingBrightness: 3 }, handlers: new Map(), assets: '' };
(globalThis as any).__shader301Fixture = fixture;
const result = await build({
  stdin: { contents: `export { resolveModProfile, getShaderResourcePath } from './src/Main/services/mod-profile';
    export { skinEraForVersion } from './src/Main/services/unit-skin-profile';
    export { syncLightingResources, AssetSyncService } from './src/Main/services/asset-sync';
    export { registerShaderHandlers } from './src/Main/ipc/shader-handlers';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  plugins: [{ name: 'shader-fixture', setup(plugin) {
    plugin.onResolve({ filter: /^original-fs$/ }, () => ({ path: 'node:fs', external: true }));
    plugin.onResolve({ filter: /^electron$|\/(?:config-manager|game-channel|war3-version|full-package-service)$/ }, args =>
      args.path.endsWith('shared/game-channel') ? undefined : ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: `const f=globalThis.__shader301Fixture;` + (
      args.path === 'electron' ? `export const app={getAppPath:()=>process.cwd(),getVersion:()=>"3.6.1",getPath:()=>process.cwd()};
        export const ipcMain={handle:(name,fn)=>f.handlers.set(name,fn)};`
      : args.path.endsWith('config-manager') ? `export const configManager={get:key=>key==='gameChannel'?f.channel:key==='modSettings'?f.settings:undefined,set:(key,value)=>{if(key==='modSettings')f.settings=value}};`
      : args.path.endsWith('game-channel') ? `export const getSelectedGameChannel=()=>f.channel; export const getSelectedGameFolder=()=>f.channel==='ptr'?'_ptr_':'_retail_';
        export const getChannelModEnabled=()=>true;export const hasGameChannelDirectory=async()=>true;`
      : args.path.endsWith('full-package-service') ? `const path=require('node:path');export const isFullPackageInstalled=async()=>true;
        export const assertFullPackageInstalled=async()=>{};export const assertTreeModeAvailable=async()=>{};
        export const resolveRetailDir=async root=>path.join(root,f.channel==='ptr'?'_ptr_':'_retail_');`
      : `export const detectWar3Version=async()=>({parts:f.parts,version:f.parts.join('.'),source:'fixture'});
        export const resolveUiZipName=async()=>'';
        export const isShaderPackCurrent=async()=>false;export const normalizeShaderExtractLayout=async()=>{};
        export const resolveShaderZipName=async()=>'';export const writeShaderPackMarker=async()=>{};`
    ) }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const api = module.exports;
const quenching = path.resolve(process.argv[3] || path.join(process.cwd(), 'assets/quenching'));
const knownGood = process.argv[2];
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-shader-301-'));
const hashFile = async (file: string) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
async function sameTree(installed: string, source: string) {
  for (const item of await fs.readdir(source, { withFileTypes: true })) {
    if (item.isDirectory()) await sameTree(path.join(installed, item.name), path.join(source, item.name));
    else assert.equal(await hashFile(path.join(installed, item.name)), await hashFile(path.join(source, item.name)), item.name);
  }
}
try {
  for (const channel of ['retail', 'ptr']) {
    fixture.channel = channel;
    for (const [parts, version] of [[[3,0,0,24268], 'v30'], [[3,0,1,24342], 'v301'], [[3,1,0], 'v301'], [[2,0,4], 'v203']] as const) {
      fixture.parts = [...parts];
      for (const graphics of ['hd', 'de'] as const) {
        const profile = await api.resolveModProfile(root, { versionSelection: 'auto', graphicsSelection: graphics });
        assert.equal(profile.version, version);
        const expected = version === 'v30' ? `shaders-300-legacy-${graphics}` : version === 'v301'
          ? `shaders-${channel === 'ptr' ? 'ptr' : '300'}-${graphics}` : 'shaders203';
        assert.equal(profile.shaderPack, expected);
        assert.equal(profile.graphics, version === 'v203' ? 'hd' : graphics);
      }
    }
    fixture.parts = [3,0,1,24342];
    assert.equal((await api.resolveModProfile(root, { versionSelection: 'v30', graphicsSelection: 'hd' })).shaderPack, 'shaders-300-legacy-hd');
    fixture.parts = [3,0,0,24268];
    assert.equal((await api.resolveModProfile(root, { versionSelection: 'v301', graphicsSelection: 'hd' })).version, 'v301');
  }
  assert.equal(api.skinEraForVersion('v301'), 'v30', '3.0.1 keeps modern skins/DNC, not 2.x templates');
  const fixtureAssets = path.join(root, 'assets'); fixture.assets = fixtureAssets;
  await fs.ensureDir(path.join(fixtureAssets, 'quenching'));
  for (const archive of ['shaders.zip', 'shaders-300-legacy.zip']) await fs.copyFile(path.join(quenching, archive), path.join(fixtureAssets, 'quenching', archive));
  const fixtureQuenching = path.join(fixtureAssets, 'quenching');
  for (const pack of ['dnc30-hd', 'dnc30-de', 'dnc30-de-rpg']) await fs.outputFile(path.join(fixtureQuenching, 'dnc', pack, 'test.mdl'), 'Version { FormatVersion 800, }');
  await fs.outputFile(path.join(fixtureQuenching, 'PostProcessingConfig.txt'), 'UseAmbientOcclusion=0');
  api.AssetSyncService.getAssetsDir = async () => fixtureAssets;
  api.AssetSyncService.ensurePostProcessingConfig = async () => {};

  for (const [channel, parts, graphics] of [
    ['retail', [3,0,0,24268], 'hd'], ['ptr', [3,0,0,24268], 'de'],
    ['retail', [3,0,1,24342], 'hd'], ['ptr', [3,0,1,24342], 'hd'], ['retail', [3,0,1,24342], 'de'],
  ] as const) {
    fixture.channel = channel; fixture.parts = [...parts];
    const profile = await api.resolveModProfile(root, { versionSelection: 'auto', graphicsSelection: graphics });
    const branch = path.join(root, channel === 'ptr' ? '_ptr_' : '_retail_'); await fs.ensureDir(branch);
    await api.syncLightingResources(root, fixtureQuenching, { lighting: 'standard', lightingBrightness: 3 }, profile);
    await withShaderBundle(quenching, profile.shaderPack, root, async selected => {
      const target = path.join(branch, 'shaders');
      const ps = api.getShaderResourcePath(selected, profile, 'standard');
      if (graphics === 'hd') {
        await sameTree(path.join(target, 'ps'), ps);
        await sameTree(path.join(target, 'vs'), path.join(selected, 'shaders', profile.shaderPack, 'vs'));
      } else await sameTree(target, ps);
      assert.equal(await fs.pathExists(path.join(selected, 'shaders', profile.shaderPack === 'shaders-ptr-hd' ? 'shaders-300-hd' : 'shaders-ptr-hd')), false, 'unselected packs are not expanded');
      if (knownGood && profile.version === 'v30') {
        const oldPack = path.join(knownGood, 'shaders', `shaders-300-${graphics}`);
        await sameTree(path.join(selected, 'shaders', profile.shaderPack), oldPack);
      }
    });
    assert.equal((await fs.readdir(branch)).some(name => name.startsWith('.quenching-shader-assets-')), false, 'staging cleaned after success');
  }
  await assert.rejects(() => withShaderBundle(quenching, 'shaders-300-hd', root, async () => { throw new Error('injected failure'); }), /injected failure/);
  assert.equal((await fs.readdir(root)).some(name => name.startsWith('.quenching-shader-assets-')), false, 'staging cleaned after failure');
  api.registerShaderHandlers(); fixture.parts = [3,0,0,24268]; fixture.channel = 'retail';
  for (const method of ['shader:update-object-shader', 'shader:update-post-processing', 'shader:update-post-processing-glow', 'shader:update-intel-amd']) {
    assert.equal(await fixture.handlers.get(method)({}, root, true), true, method + ' from ZIP-only assets');
  }
  const current = path.join(root, '_retail_/shaders');
  assert.ok(await fs.pathExists(path.join(current, 'ps/terrain.bls')));
  assert.ok(await fs.pathExists(path.join(current, 'ps/bloomextract.bls')));
  console.log('PASS: 3.0 / 3.0.1+ auto/manual selection, Retail/PTR, HD/DE, ZIP-only installs, known-good legacy hashes, effect toggles, selected-pack expansion and cleanup');
} finally {
  delete (globalThis as any).__shader301Fixture;
  await fs.remove(root);
}
