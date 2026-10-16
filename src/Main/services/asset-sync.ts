import { getSelectedGameChannel, getChannelModEnabled, hasGameChannelDirectory } from './game-channel';
import fs from 'fs-extra';
import path from 'path';
import { extractZipArchive } from './zip-extraction';
import { rm } from 'node:fs/promises';
import { app } from 'electron';
import { configManager } from './config-manager';
import { isFullPackageInstalled, resolveRetailDir } from './full-package-service';
import { effectiveLightingMode, getDncResourcePath, getKnownDncRoots, getQuenchingResourcePath, getShaderPackRoot, getShaderResourcePath, resolveModProfile } from './mod-profile';
import { ModProfile, isHdShaderPack, isVersion30OrLater } from '../../shared/mod-profile';
import { shaderBundlePath, withShaderBundle } from './shader-bundle';
import { applyDncLighting } from './dnc-lighting';
import { applyIntelAmdBloomForProfile, applyShaderToggles } from './fog-shader-override';
import { isThirdPartyQuenchingPaused, markKnownQuenching } from './third-party-resources';
import { BundledResourceRoot, createResourceSourceCache, syncBundledResourceFiles } from './managed-resource-files';
import { getInstalledModState } from './mod-update-service';
import { readCurrentModVersion } from './mod-integrity-service';
import { refreshUnitSkinBaseline, skinEraForVersion, skinProfileForGraphics, switchUnitSkinProfile, unitSkinTemplate } from './unit-skin-profile';
import { destructableSkinTemplate } from './destructable-skin-profile';
import { syncClientWebUIFiles } from './webui-assets-service';
import { copyPostProcessingConfigIfMissing, POST_PROCESSING_CONFIG_FILE, setPostProcessingAoEnabled } from './post-processing-config';
import { gameChannelFolder } from '../../shared/game-channel';
import { normalizeWar3RootPath } from './war3-path';

const PROFILE_ENV_MARKER = '.quenching-public-environment';
const PROFILE_SHADER_MARKER = '.quenching-shader-profile';
const PROFILE_DNC_MARKER = '.quenching-dnc-profile';

async function writeProfileMarker(dir: string, name: string): Promise<void> {
  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, name), `${new Date().toISOString()}\n`, 'utf8');
}

export function getKnownShaderResourceRoots(quenchingDir: string): BundledResourceRoot[] {
  const hd = getQuenchingResourcePath(quenchingDir, 'shaders300Hd');
  const ptrHd = getQuenchingResourcePath(quenchingDir, 'shadersPtrHd');
  return [
    { source: getQuenchingResourcePath(quenchingDir, 'shaders136') },
    { source: getQuenchingResourcePath(quenchingDir, 'shaders200') },
    { source: getQuenchingResourcePath(quenchingDir, 'shaders203') },
    { source: getQuenchingResourcePath(quenchingDir, 'shaders300De') },
    { source: getQuenchingResourcePath(quenchingDir, 'shadersPtrDe') },
    { source: path.join(hd, 'vs'), targetPrefix: 'vs' },
    ...['standard', 'melee', 'rpg'].map(name => ({ source: path.join(hd, 'ps', name), targetPrefix: 'ps' })),
    { source: path.join(ptrHd, 'vs'), targetPrefix: 'vs' },
    ...['standard', 'melee', 'rpg'].map(name => ({ source: path.join(ptrHd, 'ps', name), targetPrefix: 'ps' })),
  ];
}

function lightingResourceSources(quenchingDir: string, profile: ModProfile, lighting: string, shaderQuenchingDir = quenchingDir): Array<[string, string]> {
  return [
    ['DNC', getDncResourcePath(quenchingDir, profile)],
    ['shader', getShaderResourcePath(shaderQuenchingDir, profile, lighting)],
    ...(isHdShaderPack(profile.shaderPack)
      ? [['shader VS', path.join(getShaderPackRoot(shaderQuenchingDir, profile), 'vs')] as [string, string]]
      : []),
  ];
}

/** AO is on for DE standard and RPG; DE battle and every non-DE profile run without it. */
function postProcessingAoFor(profile: ModProfile, lighting: unknown): boolean {
  return profile.graphics === 'de' && lighting !== 'battle';
}

/**
 * Public environment is active for every profile except DE standard/battle.
 * DE RPG uses it too, so switching lighting under DE installs or parks it.
 */
async function syncPublicEnvironment(retailDir: string, quenchingDir: string, profile: ModProfile, force = false): Promise<void> {
  const environmentDir = path.join(retailDir, 'environment');
  const environmentMarker = path.join(environmentDir, PROFILE_ENV_MARKER);
  if (!profile.usesPublicEnvironment) {
    // Park the HD environment; these folders can also contain player files.
    const { parkHdPublicEnvironment } = await import('./environment-layout-service');
    await parkHdPublicEnvironment(retailDir);
    await fs.remove(environmentMarker);
    return;
  }

  const { restoreHdPublicEnvironment } = await import('./environment-layout-service');
  const restored = await restoreHdPublicEnvironment(retailDir);
  const environmentZip = getQuenchingResourcePath(quenchingDir, 'environmentPublic');
  if (restored && !force) {
    await writeProfileMarker(environmentDir, PROFILE_ENV_MARKER);
  } else if (!(await fs.pathExists(environmentZip))) {
    if (force) throw new Error(`Public environment package not found: ${environmentZip}`);
    console.warn(`[AssetSync] Public environment package not found: ${environmentZip}`);
  } else if (force || !(await fs.pathExists(environmentMarker))) {
    const staging = await fs.mkdtemp(path.join(retailDir, '.quenching-public-environment-'));
    try {
      await AssetSyncService.extractZip(environmentZip, staging);
      // Foliage has its own terrain-specific ZIP profile. Installing the
      // public environment ZIP's foliage here would overwrite that choice.
      const publicRoots = ['environmentmap', 'sky'].map(name => ({
        source: path.join(staging, name), targetPrefix: name,
      }));
      await syncBundledResourceFiles(environmentDir, publicRoots, publicRoots, '.quenching-public-environment-files', {
        removeAbsent: false,
      });
      await writeProfileMarker(environmentDir, PROFILE_ENV_MARKER);
    } finally {
      await rm(staging, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
    }
  }
}

/** Public env, shaders and DNC for the profile and lighting mode, with the DNC lighting/brightness patch applied. */
export async function syncLightingResources(
  war3Path: string,
  quenchingDir: string,
  modSettings: any,
  resolvedProfile?: ModProfile,
  options: { forceEnvironment?: boolean } = {},
): Promise<void> {
  if (!getChannelModEnabled(getSelectedGameChannel())) return;
  const lighting = modSettings?.lighting || 'standard';
  const profile = resolvedProfile ?? await resolveModProfile(war3Path, {
    versionSelection: modSettings?.versionSelection,
    graphicsSelection: modSettings?.graphicsSelection,
    classicMode: modSettings?.classicMode === true,
    lighting,
  });
  if (profile.graphics === 'sd') return;
  const retailDir = await resolveRetailDir(war3Path);
  return withShaderBundle(quenchingDir, profile.shaderPack, retailDir, async shaderQuenchingDir => {
  for (const [label, source] of lightingResourceSources(quenchingDir, profile, lighting, shaderQuenchingDir)) {
    if (!(await fs.pathExists(source))) {
      throw new Error(`Missing ${label} resource for ${profile.version}/${profile.graphics}: ${source}`);
    }
  }
  if (options.forceEnvironment && profile.usesPublicEnvironment &&
      !await fs.pathExists(getQuenchingResourcePath(quenchingDir, 'environmentPublic'))) {
    throw new Error('Public environment package is missing');
  }
  const dncDir = path.join(retailDir, 'environment', 'dnc');
  const shadersDir = path.join(retailDir, 'shaders');
  const shaderSource = getShaderResourcePath(shaderQuenchingDir, profile, lighting);
  const sourceCache = createResourceSourceCache();
  const existing = await fs.lstat(shadersDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw new Error('Shader target is not an ordinary directory');

  const desiredShaderRoots = isHdShaderPack(profile.shaderPack)
    ? [
        { source: path.join(getShaderPackRoot(shaderQuenchingDir, profile), 'vs'), targetPrefix: 'vs' },
        { source: shaderSource, targetPrefix: 'ps' },
      ]
    : [{ source: shaderSource }];
  // Build first; invalid inputs must not erase the working shader directory.
  const staging = await fs.mkdtemp(path.join(retailDir, '.quenching-rendering-'));
  const prepared = path.join(staging, 'shaders');
  const previous = path.join(staging, 'previous-shaders');
  let preserveBackup = false;
  try {
    await syncBundledResourceFiles(prepared, desiredShaderRoots, [], PROFILE_SHADER_MARKER, { sourceCache, removeAbsent: false });
    await fs.writeFile(path.join(prepared, '.quenching-shader-pack'), `${profile.shaderPack}\n`, 'utf8');
    await applyShaderToggles(prepared, shaderQuenchingDir, profile, modSettings);
    await applyIntelAmdBloomForProfile(prepared, shaderSource, profile, modSettings);
    await syncPublicEnvironment(retailDir, quenchingDir, profile, options.forceEnvironment);
    await syncBundledResourceFiles(dncDir, [{ source: getDncResourcePath(quenchingDir, profile) }], getKnownDncRoots(quenchingDir), PROFILE_DNC_MARKER, { sourceCache });
    await applyDncLighting(dncDir, effectiveLightingMode(profile, lighting), modSettings?.lightingBrightness, {
      deMode: profile.graphics === 'de', isVersion30: isVersion30OrLater(profile.version),
    });
    await AssetSyncService.ensurePostProcessingConfig(war3Path, postProcessingAoFor(profile, lighting));
    if (existing) await fs.rename(shadersDir, previous);
    try { await fs.rename(prepared, shadersDir); }
    catch (error) {
      if (existing) {
        try { await fs.rename(previous, shadersDir); }
        catch (restoreError) {
          preserveBackup = true;
          console.error(`[AssetSync] Shader backup retained in ${previous}`, restoreError);
        }
      }
      throw error;
    }
  } finally {
    if (!preserveBackup) await rm(staging, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
  }
  console.log(`[AssetSync] Lighting resources: ${profile.shaderPack} + ${profile.dncPack} (${lighting})`);
  });
}

export async function syncProfileResources(
  war3Path: string,
  quenchingDir: string,
  modSettings: any,
  onProgress?: (step: string, percent: number) => void,
): Promise<void> {
  const lighting = modSettings?.lighting || 'standard';
  const profile = await resolveModProfile(war3Path, {
    versionSelection: modSettings?.versionSelection,
    graphicsSelection: modSettings?.graphicsSelection,
    classicMode: modSettings?.classicMode === true,
    lighting,
  });
  const retailDir = await resolveRetailDir(war3Path);
  const skinProfile = skinProfileForGraphics(profile.graphics,
    configManager.get('retroSkinUnits') === true, configManager.get('retroSkinBuildings') === true);
  const skinEra = skinEraForVersion(profile.version);
  const skinOnly = profile.graphics === 'sd';
  const hasShaderBundle = await fs.pathExists(shaderBundlePath(quenchingDir, profile.shaderPack));

  // A Home profile change must not be reported as successful when its pack is
  // absent. Check before replacing the active profile resources.
  for (const [label, source] of [
    ...(skinOnly ? [] : lightingResourceSources(quenchingDir, profile, lighting).filter(([label]) => !hasShaderBundle || !label.startsWith('shader'))),
    ...(!skinOnly
      ? [['destructable skin', destructableSkinTemplate(quenchingDir, profile.graphics, profile.version, modSettings?.tree || 'original')]]
      : []),
    ['unit skin', unitSkinTemplate(quenchingDir, skinProfile, skinEra)],
  ]) {
    if (!(await fs.pathExists(source))) {
      throw new Error(`Missing ${label} resource for ${profile.version}/${profile.graphics}: ${source}`);
    }
  }

  console.log(`[AssetSync] Applying profile ${profile.version}/${profile.graphics} (${profile.shaderPack}, ${profile.dncPack})`);

  // Restore parked resources before the HD/DE profile writes its new shaders
  // and environment. SD instead keeps only the selected skin table active.
  const { parkNonHdUnitsAndBuildings, restoreHdUnitsAndBuildings, restoreSdParkedResources, syncGraphicsLayout } = await import('./graphics-layout-service');
  if (!skinOnly) await restoreSdParkedResources(war3Path);
  if (profile.graphics === 'hd') await restoreHdUnitsAndBuildings(war3Path);
  else if (!skinOnly) await parkNonHdUnitsAndBuildings(war3Path);
  const skinSwitch = await switchUnitSkinProfile(retailDir, quenchingDir, skinProfile, skinEra);
  if (skinProfile === 'hd-retro' && skinSwitch.created) {
    const { retroSkinService } = await import('./retro-skin-service');
    await retroSkinService.apply({
      unitsEnabled: configManager.get('retroSkinUnits') === true,
      buildingsEnabled: configManager.get('retroSkinBuildings') === true,
    });
  }
  if (skinOnly) {
    onProgress?.('layout', 80);
    await syncGraphicsLayout(war3Path, 'sd');
    configManager.set('modSettings', {
      ...modSettings,
      versionSelection: profile.versionSelection,
      graphicsSelection: profile.graphicsSelection,
      resolvedVersion: profile.version,
      resolvedGraphics: profile.graphics,
    });
    return;
  }
  onProgress?.('environment', 30);
  await syncLightingResources(war3Path, quenchingDir, modSettings, profile);

  // Rebuild from this version's table while retaining the player's tree choice.
  // This also replaces tables left by older clients on startup/package install.
  onProgress?.('skin', 72);
  const { applyTreeSettings } = await import('../ipc/tree-handlers');
  await applyTreeSettings(war3Path, modSettings?.tree || 'original', profile, quenchingDir);

  onProgress?.('layout', 80);
  const layout = await syncGraphicsLayout(war3Path, profile.graphics, {
    classicMode: modSettings?.classicMode === true,
    waterMode: modSettings?.water,
  });

  if (layout.waterNeedsReapply && modSettings?.water) {
    onProgress?.('layout-water', 84);
    const { applyWaterSettings } = await import('../ipc/water-handlers');
    await applyWaterSettings(war3Path, modSettings.water);
  }

  // Record the resolved profile only after every requested resource switch succeeds.
  configManager.set('modSettings', {
    ...modSettings,
    versionSelection: profile.versionSelection,
    graphicsSelection: profile.graphicsSelection,
    resolvedVersion: profile.version,
    resolvedGraphics: profile.graphics,
  });
}

export class AssetSyncService {
  static async getAssetsDir(): Promise<string> {
    const appPath = app.getAppPath();
    const resourcesPath = (process as any).resourcesPath as string | undefined;
    const candidates = [
      resourcesPath ? path.join(resourcesPath, 'assets') : '',
      path.join(process.cwd(), 'assets'),
      path.join(process.cwd(), 'public', 'assets'),
      path.join(process.cwd(), 'QuenChing-Electron-Client', 'assets'),
      path.join(process.cwd(), 'projects', 'QuenChing-Mod-Client', 'assets'),
      path.join(appPath, 'assets'),
      path.join(path.dirname(appPath), 'assets'),
      path.join(appPath, 'projects', 'QuenChing-Mod-Client', 'assets'),
    ].filter(Boolean).map(p => path.normalize(p));

    const uniqueCandidates = Array.from(new Set(candidates));
    for (const p of uniqueCandidates) {
      if ((await fs.stat(p).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
        throw error;
      }))?.isDirectory()) {
        return p;
      }
    }

    throw new Error(`Client assets directory not found (searched ${uniqueCandidates.length} locations)`);
  }

  static async extractZip(
    zipPath: string,
    extractPath: string,
    onProgress?: (percent: number, currentFile: string) => void,
    options?: { stripLeadingDirectory?: string | string[] }
  ): Promise<number> {
    return extractZipArchive(zipPath, extractPath, {
      ...options,
      onProgress,
    });
  }

  /** Synchronize client-owned WebUI files independently of graphics/profile settings. */
  static async syncClientWebUIAssets(war3Path: string): Promise<boolean> {
    const settings = configManager.get('modSettings');
    if (settings?.graphicsSelection === 'sd' || settings?.classicMode === true) return false;
    if (await isThirdPartyQuenchingPaused(war3Path)) {
      console.log('[AssetSync] Third-party support has parked Quenching resources; skipping WebUI sync.');
      return false;
    }
    if (!getChannelModEnabled(getSelectedGameChannel())) {
      console.log('[AssetSync] MOD is disabled for this branch. Skipping WebUI sync.');
      return false;
    }
    if (!(await isFullPackageInstalled(war3Path))) {
      console.log('[AssetSync] No complete package for this branch. Skipping WebUI sync.');
      return false;
    }

    const assetsDir = await this.getAssetsDir();
    const quenchingDir = path.join(assetsDir, 'quenching');
    const targetWebUIDir = path.join(await resolveRetailDir(war3Path), 'webui');
    const language = configManager.get('language') || 'zh-CN';
    await syncClientWebUIFiles(targetWebUIDir, quenchingDir, language);
    console.log(`[AssetSync] Updated WebUI assets for ${language}`);
    return true;
  }

  /**
   * Basic client file. When the selected branch's MOD switch is on, install
   * PostProcessingConfig.txt if that branch does not already have one.
   * The other branch stays vanilla. An existing file keeps its values except
   * AO, which follows the profile and lighting. A full package is not required.
   */
  static async ensurePostProcessingConfig(war3Path: string, aoEnabled?: boolean): Promise<void> {
    const root = normalizeWar3RootPath(war3Path);
    if (!root) return;
    const settings = configManager.get('modSettings');
    if (settings?.graphicsSelection === 'sd' || settings?.classicMode === true) return;

    const source = path.join(await this.getAssetsDir(), 'quenching', POST_PROCESSING_CONFIG_FILE);
    if (!(await fs.pathExists(source))) {
      throw new Error(`PostProcessingConfig source missing: ${source}`);
    }

    const channel = getSelectedGameChannel();
    if (!getChannelModEnabled(channel)) return;
    if (!(await hasGameChannelDirectory(root, channel))) return;
    const buildDir = path.join(root, gameChannelFolder(channel));
    const copied = await copyPostProcessingConfigIfMissing(buildDir, source);
    if (copied) console.log(`[AssetSync] Installed ${POST_PROCESSING_CONFIG_FILE} into ${gameChannelFolder(channel)}`);

    let ao = aoEnabled;
    if (ao === undefined) {
      const modSettings = configManager.get('modSettings') || {};
      const profile = await resolveModProfile(root, {
        versionSelection: modSettings.versionSelection,
        graphicsSelection: modSettings.graphicsSelection,
        classicMode: modSettings.classicMode === true,
        lighting: modSettings.lighting,
      });
      ao = postProcessingAoFor(profile, modSettings.lighting || 'standard');
    }
    if (await setPostProcessingAoEnabled(buildDir, ao)) {
      console.log(`[AssetSync] ${POST_PROCESSING_CONFIG_FILE}: AO ${ao ? 'enabled' : 'disabled'}`);
    }
  }

  /** Replace unitskin files built from an older bundled baseline (startup, and forced after a package install). */
  static async refreshUnitSkinBaseline(war3Path: string, options: { force?: boolean } = {}): Promise<void> {
    if (!getChannelModEnabled(getSelectedGameChannel())) return;
    if (await isThirdPartyQuenchingPaused(war3Path)) return;
    if (!(await isFullPackageInstalled(war3Path))) return;
    const modSettings = configManager.get('modSettings') || {};
    const profile = await resolveModProfile(war3Path, {
      versionSelection: modSettings.versionSelection,
      graphicsSelection: modSettings.graphicsSelection,
      classicMode: modSettings.classicMode === true,
      lighting: modSettings.lighting,
    });
    const retroUnits = configManager.get('retroSkinUnits') === true;
    const retroBuildings = configManager.get('retroSkinBuildings') === true;
    const result = await refreshUnitSkinBaseline(
      await resolveRetailDir(war3Path),
      path.join(await this.getAssetsDir(), 'quenching'),
      skinProfileForGraphics(profile.graphics, retroUnits, retroBuildings),
      skinEraForVersion(profile.version),
      options,
    );
    if (result.refreshed && result.profile === 'hd-retro') {
      const { retroSkinService } = await import('./retro-skin-service');
      await retroSkinService.apply({ unitsEnabled: retroUnits, buildingsEnabled: retroBuildings });
    }
  }

  static async syncConfiguredAssets(
    war3Path: string,
    onProgress?: (step: string, percent: number) => void,
    options: { forceUi?: boolean } = {},
  ): Promise<'applied' | 'third-party-paused' | 'mod-disabled' | 'legacy-package' | 'package-missing' | 'classic-mode'> {
    console.log('[AssetSync] Applying explicitly selected resource settings');
    console.log(`[AssetSync] Target War3 Path: ${war3Path}`);

    if (await isThirdPartyQuenchingPaused(war3Path)) {
      console.log('[AssetSync] Third-party support has parked Quenching resources; skipping automatic extraction.');
      return 'third-party-paused';
    }

    const modSettings = configManager.get('modSettings');
    const isModEnabled = getChannelModEnabled(getSelectedGameChannel());

    if (!isModEnabled) {
      console.log('[AssetSync] MOD is disabled for this branch. Skipping automatic resource changes.');
      return 'mod-disabled';
    }

    if (!(await readCurrentModVersion(war3Path)) && (await getInstalledModState(war3Path))?.sequence === 34) {
      console.log('[AssetSync] Legacy 3.4 package detected; leaving resources unchanged until its 3.5 patch is applied.');
      return 'legacy-package';
    }

    if (!(await isFullPackageInstalled(war3Path))) {
      console.log('[AssetSync] No complete package for this branch. Awaiting ZIP installation; leaving existing files untouched.');
      return 'package-missing';
    }

    if (modSettings?.graphicsSelection !== 'sd' && modSettings?.classicMode !== true) {
      await this.syncClientWebUIAssets(war3Path);
    }

    console.log(`[AssetSync] Mod Enabled: ${isModEnabled}`);
    console.log(`[AssetSync] Classic Mode: ${modSettings?.classicMode === true}`);

    const assetsDir = await this.getAssetsDir();
    const quenchingDir = path.join(assetsDir, 'quenching');

    console.log(`[AssetSync] Checking core assets in ${war3Path}`);
    console.log(`[AssetSync] Source directory: ${quenchingDir}`);

    // New resource layout is profile-driven. It replaces the old root-level
    // zip assumptions while leaving the legacy loop below available for an
    // older installation whose new resources have not been deployed yet.
    await syncProfileResources(war3Path, quenchingDir, modSettings || {}, onProgress);
    const { UIService } = await import('./ui-service');
    await UIService.syncConfiguredUI(war3Path, options.forceUi === true);
    await markKnownQuenching(war3Path);

    // Profile resources above replace the unsafe legacy whole-directory ZIP loop.
    return 'applied';
  }
}
