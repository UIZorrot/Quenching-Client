import { getSelectedGameChannel, getChannelModEnabled, hasGameChannelDirectory } from './game-channel';
import fs from 'fs-extra';
import path from 'path';
import { extractZipArchive } from './zip-extraction';
import { rm } from 'node:fs/promises';
import { app } from 'electron';
import { configManager } from './config-manager';
import { isFullPackageInstalled, resolveRetailDir } from './full-package-service';
import { getQuenchingResourcePath, getShaderResourcePath, resolveModProfile } from './mod-profile';
import { isThirdPartyQuenchingPaused, markKnownQuenching } from './third-party-resources';
import { BundledResourceRoot, createResourceSourceCache, installBundledResourceFile, syncBundledResourceFiles } from './managed-resource-files';
import { getInstalledModState } from './mod-update-service';
import { readCurrentModVersion } from './mod-integrity-service';
import { skinProfileForGraphics, switchUnitSkinProfile, unitSkinTemplate } from './unit-skin-profile';
import { syncClientWebUIFiles } from './webui-assets-service';
import { copyPostProcessingConfigIfMissing, POST_PROCESSING_CONFIG_FILE } from './post-processing-config';
import { gameChannelFolder } from '../../shared/game-channel';
import { normalizeWar3RootPath } from './war3-path';

const PROFILE_ENV_MARKER = '.quenching-public-environment';
const PROFILE_SHADER_MARKER = '.quenching-shader-profile';
const PROFILE_DNC_MARKER = '.quenching-dnc-profile';
const PROFILE_SKIN_MARKER = '.quenching-profile-skin';

async function writeProfileMarker(dir: string, name: string): Promise<void> {
  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, name), `${new Date().toISOString()}\n`, 'utf8');
}

export function getKnownShaderResourceRoots(quenchingDir: string): BundledResourceRoot[] {
  const hd = getQuenchingResourcePath(quenchingDir, 'shaders300Hd');
  return [
    { source: getQuenchingResourcePath(quenchingDir, 'shaders136') },
    { source: getQuenchingResourcePath(quenchingDir, 'shaders200') },
    { source: getQuenchingResourcePath(quenchingDir, 'shaders203') },
    ...(['shaders136', 'shaders200'] as const).flatMap(pack =>
      ['AMDshader', 'NVshader'].map(variant => ({
        source: path.join(getQuenchingResourcePath(quenchingDir, pack), 'ps', variant),
        targetPrefix: 'ps',
      }))),
    { source: getQuenchingResourcePath(quenchingDir, 'shaders300De') },
    { source: path.join(hd, 'vs'), targetPrefix: 'vs' },
    ...['standard', 'melee', 'rpg'].map(name => ({ source: path.join(hd, 'ps', name), targetPrefix: 'ps' })),
  ];
}

export async function syncProfileResources(
  war3Path: string,
  quenchingDir: string,
  modSettings: any,
  onProgress?: (step: string, percent: number) => void,
): Promise<void> {
  const profile = await resolveModProfile(war3Path, {
    versionSelection: modSettings?.versionSelection,
    graphicsSelection: modSettings?.graphicsSelection,
    classicMode: modSettings?.classicMode === true,
  });
  const retailDir = await resolveRetailDir(war3Path);
  const environmentDir = path.join(retailDir, 'environment');
  const dncDir = path.join(environmentDir, 'dnc');
  const shadersDir = path.join(retailDir, 'shaders');
  const unitsDir = path.join(retailDir, 'units');
  const dncSource = getQuenchingResourcePath(
    quenchingDir,
    profile.dncPack === 'dnc20' ? 'dnc20' : profile.dncPack === 'dnc30-hd' ? 'dnc30Hd' : 'dnc30De'
  );
  const shaderSource = getShaderResourcePath(quenchingDir, profile, modSettings?.lighting || 'standard');
  const skinProfile = skinProfileForGraphics(profile.graphics,
    configManager.get('retroSkinUnits') === true, configManager.get('retroSkinBuildings') === true);
  const sourceCache = createResourceSourceCache();

  // A Home profile change must not be reported as successful when its pack is
  // absent. Check before replacing the active profile resources.
  for (const [label, source] of [
    ['DNC', dncSource],
    ['shader', shaderSource],
    ...(profile.shaderPack === 'shaders-300-hd'
      ? [['shader VS', path.join(getQuenchingResourcePath(quenchingDir, 'shaders300Hd'), 'vs')]]
      : []),
    ...(profile.graphics === 'de'
      ? [['DE destructable skin', path.join(quenchingDir, 'skin', 'destructableskin-de.txt')]]
      : []),
    ['unit skin', unitSkinTemplate(quenchingDir, skinProfile)],
  ]) {
    if (!(await fs.pathExists(source))) {
      throw new Error(`Missing ${label} resource for ${profile.version}/${profile.graphics}: ${source}`);
    }
  }

  console.log(`[AssetSync] Applying profile ${profile.version}/${profile.graphics} (${profile.shaderPack}, ${profile.dncPack})`);

  // Change units and buildings first. The two skin tables remain active in SD
  // and DE, and unitskin is selected from a separate template per mode.
  const { parkNonHdUnitsAndBuildings, restoreHdUnitsAndBuildings } = await import('./graphics-layout-service');
  if (profile.graphics === 'hd') await restoreHdUnitsAndBuildings(war3Path);
  else await parkNonHdUnitsAndBuildings(war3Path);
  const skinSwitch = await switchUnitSkinProfile(retailDir, quenchingDir, skinProfile);
  if (skinProfile === 'hd-retro' && skinSwitch.created) {
    const { retroSkinService } = await import('./retro-skin-service');
    await retroSkinService.apply({
      unitsEnabled: configManager.get('retroSkinUnits') === true,
      buildingsEnabled: configManager.get('retroSkinBuildings') === true,
    });
  }
  onProgress?.('environment', 30);

  // The public environment package is shared by every profile except 3.0 DE.
  const environmentMarker = path.join(environmentDir, PROFILE_ENV_MARKER);
  if (profile.usesPublicEnvironment) {
    const { restoreHdPublicEnvironment } = await import('./environment-layout-service');
    const restored = await restoreHdPublicEnvironment(retailDir);
    const environmentZip = getQuenchingResourcePath(quenchingDir, 'environmentPublic');
    if (restored) {
      await writeProfileMarker(environmentDir, PROFILE_ENV_MARKER);
    } else if (await fs.pathExists(environmentZip)) {
      const markerExists = await fs.pathExists(environmentMarker);
      if (!markerExists) {
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
    } else {
      console.warn(`[AssetSync] Public environment package not found: ${environmentZip}`);
    }
  } else {
    // Park the HD environment; these folders can also contain player files.
    const { parkHdPublicEnvironment } = await import('./environment-layout-service');
    await parkHdPublicEnvironment(retailDir);
    if (await fs.pathExists(environmentMarker)) {
      await fs.remove(environmentMarker);
    }
  }

  const knownDncRoots = [
    { source: getQuenchingResourcePath(quenchingDir, 'dnc20') },
    { source: getQuenchingResourcePath(quenchingDir, 'dnc30Hd') },
    { source: getQuenchingResourcePath(quenchingDir, 'dnc30De') },
  ];
  const desiredShaderRoots = profile.shaderPack === 'shaders-300-hd'
    ? [
        { source: path.join(getQuenchingResourcePath(quenchingDir, 'shaders300Hd'), 'vs'), targetPrefix: 'vs' },
        { source: shaderSource, targetPrefix: 'ps' },
      ]
    : [{ source: shaderSource }];
  const knownShaderRoots = getKnownShaderResourceRoots(quenchingDir);

  onProgress?.('dnc', 46);
  await syncBundledResourceFiles(dncDir, [{ source: dncSource }], knownDncRoots, PROFILE_DNC_MARKER, {
    sourceCache,
  });

  onProgress?.('shaders', 60);
  {
    // Shader overlays are exclusively client-managed; replace the directory
    // with the selected bundled profile instead of preserving unknown files.
    await fs.remove(shadersDir);
    await syncBundledResourceFiles(shadersDir, desiredShaderRoots, knownShaderRoots, PROFILE_SHADER_MARKER, { sourceCache });
    await fs.writeFile(path.join(shadersDir, '.quenching-shader-pack'), `${profile.shaderPack}\n`, 'utf8');
  }

  const previousGraphics = modSettings?.resolvedGraphics;
  if (previousGraphics !== profile.graphics && (profile.graphics === 'de' || previousGraphics === 'de')) {
    onProgress?.('skin', 72);
    const skinSource = path.join(quenchingDir, 'skin',
      profile.graphics === 'de' ? 'destructableskin-de.txt' : 'destructableskin.txt');
    await installBundledResourceFile(unitsDir, 'destructableskin.txt', skinSource, [], PROFILE_SKIN_MARKER);
  }

  onProgress?.('layout', 80);
  const { syncGraphicsLayout } = await import('./graphics-layout-service');
  const layout = await syncGraphicsLayout(war3Path, profile.graphics, {
    classicMode: modSettings?.classicMode === true,
    waterMode: modSettings?.water,
    waterAssets: {
      waterRoot: path.join(quenchingDir, 'water'),
      tileRoot: path.join(quenchingDir, 'tile'),
    },
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
   * Basic client file. For each branch whose MOD switch is on, install
   * PostProcessingConfig.txt when that branch does not already have one.
   * An existing file is left untouched, and a missing full package is not required.
   */
  static async ensurePostProcessingConfig(war3Path: string): Promise<void> {
    const root = normalizeWar3RootPath(war3Path);
    if (!root) return;

    const source = path.join(await this.getAssetsDir(), 'quenching', POST_PROCESSING_CONFIG_FILE);
    if (!(await fs.pathExists(source))) {
      throw new Error(`PostProcessingConfig source missing: ${source}`);
    }

    for (const channel of ['retail', 'ptr'] as const) {
      if (!getChannelModEnabled(channel)) continue;
      if (!(await hasGameChannelDirectory(root, channel))) continue;
      const buildDir = path.join(root, gameChannelFolder(channel));
      const copied = await copyPostProcessingConfigIfMissing(buildDir, source);
      if (copied) console.log(`[AssetSync] Installed ${POST_PROCESSING_CONFIG_FILE} into ${gameChannelFolder(channel)}`);
    }
  }

  static async syncConfiguredAssets(
    war3Path: string,
    onProgress?: (step: string, percent: number) => void,
  ): Promise<void> {
    console.log('[AssetSync] Applying explicitly selected resource settings');
    console.log(`[AssetSync] Target War3 Path: ${war3Path}`);

    if (await isThirdPartyQuenchingPaused(war3Path)) {
      console.log('[AssetSync] Third-party support has parked Quenching resources; skipping automatic extraction.');
      return;
    }

    const modSettings = configManager.get('modSettings');
    const isModEnabled = getChannelModEnabled(getSelectedGameChannel());
    const isClassicMode = modSettings?.classicMode === true;

    if (!isModEnabled) {
      console.log('[AssetSync] MOD is disabled for this branch. Skipping automatic resource changes.');
      return;
    }

    if (!(await readCurrentModVersion(war3Path)) && (await getInstalledModState(war3Path))?.sequence === 34) {
      console.log('[AssetSync] Legacy 3.4 package detected; leaving resources unchanged until its 3.5 patch is applied.');
      return;
    }

    if (!(await isFullPackageInstalled(war3Path))) {
      console.log('[AssetSync] No complete package for this branch. Awaiting ZIP installation; leaving existing files untouched.');
      return;
    }

    // WebUI is a client-owned resource, independent of graphics and Classic
    // mode. Keep it current even when profile synchronization exits early.
    await this.syncClientWebUIAssets(war3Path);

    console.log(`[AssetSync] Mod Enabled: ${isModEnabled}`);
    console.log(`[AssetSync] Classic Mode: ${isClassicMode}`);

    if (isClassicMode) {
      // The legacy whole-directory parking routine has no crash journal and
      // cannot distinguish player files. Never run it automatically at launch.
      console.log('[AssetSync] Classic profile: skipping legacy folder parking and automatic extraction.');
      return;
    }

    const assetsDir = await this.getAssetsDir();
    const quenchingDir = path.join(assetsDir, 'quenching');

    console.log(`[AssetSync] Checking core assets in ${war3Path}`);
    console.log(`[AssetSync] Source directory: ${quenchingDir}`);

    // New resource layout is profile-driven. It replaces the old root-level
    // zip assumptions while leaving the legacy loop below available for an
    // older installation whose new resources have not been deployed yet.
    await syncProfileResources(war3Path, quenchingDir, modSettings || {}, onProgress);
    await markKnownQuenching(war3Path);

    if (modSettings?.envRender === true) {
      const { syncEnvironmentScripts } = await import('../ipc/script-handlers');
      await syncEnvironmentScripts(war3Path, true);
    }

    // Profile resources above replace the unsafe legacy whole-directory ZIP loop.

  }
}
