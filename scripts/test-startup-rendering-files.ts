import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createWriteStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import archiver from 'archiver';
import { build } from 'esbuild';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-startup-files-'));
const f = { root, assets: path.join(root, 'assets'), channel: 'retail', enabled: true, settings: {} as any };
(globalThis as any).__startupFiles = f;
const mocks: Record<string, string> = {
  electron: 'export const app={getAppPath:()=>f.root};',
  'config-manager': 'export const configManager={get:k=>k==="modSettings"?f.settings:k==="gameChannel"?f.channel:k==="war3Path"?f.root:undefined,set:(k,v)=>{if(k==="modSettings")f.settings=v;}};',
  'game-channel': 'export const getSelectedGameChannel=()=>f.channel;export const getSelectedGameFolder=()=>f.channel==="ptr"?"_ptr_":"_retail_";export const getChannelModEnabled=()=>f.enabled;export const hasGameChannelDirectory=async()=>true;',
  'full-package-service': 'export const resolveRetailDir=async root=>root+"/"+(f.channel==="ptr"?"_ptr_":"_retail_");export const isFullPackageInstalled=async()=>false;',
  'war3-version': 'export const detectWar3Version=async()=>({parts:[3,0,0,24268],version:"3.0.0.24268"});',
  'mod-update-service': 'export const getInstalledModState=async()=>({sequence:35});',
  'mod-integrity-service': 'export const readCurrentModVersion=async()=>"3.5";',
  'third-party-resources': 'export const isThirdPartyQuenchingPaused=async()=>false;export const markKnownQuenching=async()=>{};',
  'unit-skin-profile': 'export const refreshUnitSkinBaseline=async()=>({});export const skinEraForVersion=()=>"modern";export const skinProfileForGraphics=()=>"hd";export const switchUnitSkinProfile=async()=>({});export const unitSkinTemplate=()=>"unused";',
  'destructable-skin-profile': 'export const destructableSkinTemplate=()=>"unused";',
  'webui-assets-service': 'export const syncClientWebUIFiles=async()=>{};',
  'graphics-layout-service': 'export const parkNonHdUnitsAndBuildings=async()=>{};export const restoreHdUnitsAndBuildings=async()=>{};export const restoreSdParkedResources=async()=>{};export const syncGraphicsLayout=async()=>({});',
  'tree-handlers': 'export const applyTreeSettings=async()=>{};',
  'water-handlers': 'export const applyWaterSettings=async()=>{};',
  'ui-service': 'export const UIService={syncConfiguredUI:async()=>{}};',
  'retro-skin-service': 'export const retroSkinService={apply:async()=>{}};',
};
try {
  const bundled = await build({
    stdin: { contents: 'export * from "./src/Main/services/asset-sync";export * from "./src/Main/services/mod-profile";', resolveDir: process.cwd(), loader: 'ts' },
    platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
    plugins: [{ name: 'startup-files-fixture', setup(plugin) {
      plugin.onResolve({ filter: /./ }, args => {
        const key = args.path.split('/').at(-1)!;
        if (mocks[key] && (args.path === 'electron' || !args.path.includes('shared/'))) return { path: key, namespace: 'fixture' };
      });
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: 'const f=globalThis.__startupFiles;' + mocks[args.path] }));
    } }],
  });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  const { AssetSyncService, syncLightingResources, resolveModProfile, getDncResourcePath, getShaderResourcePath, getShaderPackRoot } = module.exports;
  AssetSyncService.getAssetsDir = async () => f.assets;
  const q = path.join(f.assets, 'quenching');
  await fs.ensureDir(q);
  await fs.outputFile(path.join(q, 'PostProcessingConfig.txt'), '[AmbientOcclusion]\nEnabled=0\n[Custom]\nKeep=17\n');
  const zip = archiver('zip');
  const output = createWriteStream(path.join(q, 'env-20-30-public.zip'));
  const closed = new Promise<void>((resolve, reject) => { output.on('close', resolve); zip.on('error', reject); output.on('error', reject); });
  zip.pipe(output); zip.append('fresh-env', { name: 'environmentmap/env.dds' }); zip.append('fresh-sky', { name: 'sky/sky.dds' }); zip.append('must-not-overwrite-selected-foliage', { name: 'foliage/grass.dds' });
  await zip.finalize(); await closed;
  const baseline = 'Light "Sun" {\n static Intensity 1.0,\n static AmbIntensity 0.2,\n static ShadowIntensity 0.5,\n}\n';
  for (const version of ['v1', 'v20', 'v203', 'v30', 'v301']) for (const graphics of ['hd', 'de']) for (const lighting of ['standard', 'battle', 'rpg']) {
    const settings = { versionSelection: version, graphicsSelection: graphics, lighting };
    const profile = await resolveModProfile(root, settings);
    const shaderSource = getShaderResourcePath(q, profile, lighting);
    const hd = profile.shaderPack.includes('hd');
    const ps = hd ? shaderSource : path.join(shaderSource, 'ps');
    const vs = hd ? path.join(getShaderPackRoot(q, profile), 'vs') : path.join(shaderSource, 'vs');
    for (const name of ['hd', 'terrain', 'fog', 'volumetricfog', 'tonemap', 'bloomextract', 'bloomcombine', 'gaussianblur']) await fs.outputFile(path.join(ps, name + '.bls'), `${profile.shaderPack}/${lighting}/${name}`);
    await fs.outputFile(path.join(vs, 'hd.bls'), 'fresh-vs');
    await fs.outputFile(path.join(getDncResourcePath(q, profile), 'lordaeronsummer', 'lordaeronsummerday.mdl'), baseline);
  }
  for (const variant of ['brightness_1', 'brightness_2', 'brightness_3']) {
    for (const family of ['fog_shaders', 'fog_shaders-legacy']) for (const name of ['fog', 'volumetricfog']) await fs.outputFile(path.join(q, 'shaders', family, variant, 'ps', name + '.bls'), variant);
  }
  for (const channel of ['retail', 'ptr']) {
    f.channel = channel;
    const buildDir = path.join(root, channel === 'ptr' ? '_ptr_' : '_retail_');
    await fs.ensureDir(buildDir);
    f.settings = { versionSelection: 'v301', graphicsSelection: 'hd', lighting: 'rpg', lightingBrightness: 4, objectShader: false, postProcessing: true, postProcessingGlow: false, useIntelAmdShaderFix: true };
    const profile = await resolveModProfile(root, f.settings);
    // PTR's pack is distinct; make its small fixture from the matching HD resources.
    if (channel === 'ptr') {
      await fs.copy(path.join(q, 'shaders', 'shaders-300-hd'), path.join(q, 'shaders', 'shaders-ptr-hd'));
      await fs.copy(path.join(q, 'shaders', 'shaders-300-de'), path.join(q, 'shaders', 'shaders-ptr-de'));
    }
    await fs.outputFile(path.join(buildDir, 'shaders', '.quenching-shader-pack'), profile.shaderPack + '\n');
    await fs.outputFile(path.join(buildDir, 'shaders', 'ps', 'fog.bls'), 'stale-shader');
    await fs.outputFile(path.join(buildDir, 'shaders', 'unknown-old.bls'), 'stale-unmanaged-shader');
    await fs.outputFile(path.join(buildDir, 'environment', '.quenching-public-environment'), 'existing marker');
    await fs.outputFile(path.join(buildDir, 'environment', 'environmentmap', 'env.dds'), 'stale-env');
    await fs.outputFile(path.join(buildDir, 'environment', 'custom', 'player.dds'), 'player');
    await fs.outputFile(path.join(buildDir, 'environment', 'foliage', 'grass.dds'), 'selected-foliage');
    await syncLightingResources(root, q, f.settings, undefined, { forceEnvironment: true });
    assert.equal(await fs.readFile(path.join(buildDir, 'environment/environmentmap/env.dds'), 'utf8'), 'fresh-env');
    assert.equal(await fs.readFile(path.join(buildDir, 'environment/custom/player.dds'), 'utf8'), 'player');
    assert.equal(await fs.readFile(path.join(buildDir, 'environment/foliage/grass.dds'), 'utf8'), 'selected-foliage');
    assert(!await fs.pathExists(path.join(buildDir, 'shaders/ps/hd.bls')));
    assert(!await fs.pathExists(path.join(buildDir, 'shaders/ps/bloomextract.bls')), 'Intel fix must not resurrect disabled glow');
    assert(!await fs.pathExists(path.join(buildDir, 'shaders/unknown-old.bls')));
    const dncFile = path.join(buildDir, 'environment/dnc/lordaeronsummer/lordaeronsummerday.mdl');
    const first = await fs.readFile(dncFile, 'utf8');
    await syncLightingResources(root, q, f.settings, undefined, { forceEnvironment: true });
    assert.equal(await fs.readFile(dncFile, 'utf8'), first, 'Repeated refresh must restore DNC baseline, not compound coefficients');
    const fogFile = path.join(buildDir, 'shaders/ps/fog.bls');
    const oldFog = await fs.readFile(fogFile);
    const sourceFog = path.join(q, 'shaders/fog_shaders/brightness_2/ps/fog.bls');
    if (channel === 'retail') {
      await fs.rename(sourceFog, sourceFog + '.test-backup');
      await assert.rejects(syncLightingResources(root, q, f.settings, undefined, { forceEnvironment: true }), /Fog shader missing/);
      assert.deepEqual(await fs.readFile(fogFile), oldFog, 'Preparation failure must retain working shaders');
      await fs.rename(sourceFog + '.test-backup', sourceFog);
      const rename = fs.rename;
      let failSwap = true;
      (fs as any).rename = async (from: string, to: string) => {
        if (failSwap && from.includes('.quenching-rendering-') && path.basename(from) === 'shaders') {
          failSwap = false;
          throw new Error('injected shader swap failure');
        }
        return rename(from, to);
      };
      try {
        await assert.rejects(syncLightingResources(root, q, f.settings, undefined, { forceEnvironment: true }), /shader swap failure/);
        assert.deepEqual(await fs.readFile(fogFile), oldFog, 'Failed directory swap must restore previous shaders');
      } finally { (fs as any).rename = rename; }
    }
    f.settings = { versionSelection: 'v301', graphicsSelection: 'de', lighting: 'standard', postProcessing: false, postProcessingGlow: true };
    await syncLightingResources(root, q, f.settings, undefined, { forceEnvironment: true });
    assert(!await fs.pathExists(path.join(buildDir, 'environment/environmentmap')));
    assert(!await fs.pathExists(path.join(buildDir, 'shaders/ps/fog.bls')));
    assert(await fs.pathExists(path.join(buildDir, 'shaders/ps/bloomextract.bls')));
    assert.equal(await fs.readFile(path.join(buildDir, 'environment/custom/player.dds'), 'utf8'), 'player');
    f.settings = { versionSelection: 'v30', graphicsSelection: 'hd', lighting: 'battle', lightingBrightness: 4 };
    await syncLightingResources(root, q, f.settings, undefined, { forceEnvironment: true });
    assert.equal((await fs.readFile(path.join(buildDir, 'shaders/.quenching-shader-pack'), 'utf8')).trim(), 'shaders-300-legacy-hd');
    f.settings = { versionSelection: 'v203', graphicsSelection: 'hd', lighting: 'standard', useIntelAmdShaderFix: true };
    await syncLightingResources(root, q, f.settings, undefined, { forceEnvironment: true });
    assert.equal((await fs.readFile(path.join(buildDir, 'shaders/.quenching-shader-pack'), 'utf8')).trim(), 'shaders203');
    assert.equal(await fs.readFile(path.join(buildDir, 'environment/foliage/grass.dds'), 'utf8'), 'selected-foliage');
    assert((await fs.readFile(path.join(buildDir, 'PostProcessingConfig.txt'), 'utf8')).includes('Keep=17'));
  }
  console.log('PASS: actual staged shader/env/DNC writes, same-marker refresh, Retail/PTR, HD/DE/2.x, toggle ordering, custom environment/foliage retained, coefficient reset and missing-input protection');
} finally {
  assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
  await fs.remove(root);
}
