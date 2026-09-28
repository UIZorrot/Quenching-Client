import { getSelectedGameFolder } from '../services/game-channel';
import { ipcMain } from 'electron';
import path from 'path';
import { rm } from 'node:fs/promises';
import fs from 'fs-extra';
import { AssetSyncService, getKnownShaderResourceRoots } from '../services/asset-sync';
import { extractZipArchive } from '../services/zip-extraction';
import { configManager } from '../services/config-manager';
import {
    detectWar3Version,
    isShaderPackCurrent,
    normalizeShaderExtractLayout,
    resolveShaderZipName,
    writeShaderPackMarker,
    type War3VersionInfo,
} from '../services/war3-version';
import { getQuenchingResourcePath, getShaderResourcePath, resolveModProfile } from '../services/mod-profile';
import { syncProfileResources } from '../services/asset-sync';
import { syncBundledResourceFiles } from '../services/managed-resource-files';
import { getInstalledModState } from '../services/mod-update-service';
import { readCurrentModVersion } from '../services/mod-integrity-service';
const SHADER_PROFILE_MARKER = '.quenching-shader-profile';

const OBJECT_SHADER_FILES = [
    'ps/cliffblightmiscterrain.bls',
    'ps/foliage.bls',
    'ps/hd.bls',
    'ps/sd_on_hd.bls',
    'ps/terrain.bls',
    'vs/cliffblightmiscterrain.bls',
    'vs/foliage.bls',
    'vs/hd.bls',
    'vs/terrain.bls',
];

const POST_PROCESSING_FILES = [
    'ps/fog.bls',
    'ps/volumetricfog.bls',
    'ps/bloomcombine.bls',
    'ps/bloomextract.bls',
    'ps/gaussianblur.bls',
    // Kept for supported legacy packs which use tonemap instead.
    'ps/tonemap.bls',
];

const INTEL_AMD_BLOOM_FILE = 'bloomextract.bls';

async function resolveShadersBaseDir(war3Path: string): Promise<string> {
    const retailPath = path.join(war3Path, getSelectedGameFolder());
    return (await fs.pathExists(retailPath)) ? retailPath : war3Path;
}

async function resolveVersionedShaderZipPath(war3Path: string): Promise<{ zipName: string; zipPath: string; isDirectory: boolean } | null> {
    const assetsDir = await AssetSyncService.getAssetsDir();
    const modSettings = configManager.get('modSettings') || {};
    const profile = await resolveModProfile(war3Path, {
        versionSelection: modSettings.versionSelection,
        graphicsSelection: modSettings.graphicsSelection,
        classicMode: modSettings.classicMode === true,
    });
    const quenchingDir = path.join(assetsDir, 'quenching');
    const sourceDir = getShaderResourcePath(quenchingDir, profile, modSettings.lighting || 'standard');
    if (await fs.pathExists(sourceDir)) {
        return { zipName: profile.shaderPack, zipPath: sourceDir, isDirectory: true };
    }
    const zipName = await resolveShaderZipName(war3Path);
    const zipPath = path.join(assetsDir, 'quenching', zipName);
    if (!(await fs.pathExists(zipPath))) {
        console.warn(`[Shader] Versioned shader zip not found: ${zipPath}`);
        return null;
    }
    return { zipName, zipPath, isDirectory: false };
}

/**
 * Ensure `_retail_/shaders` matches the pack selected from the detected War3 version.
 * Re-extracts when the pack marker is missing or points at a different zip.
 */
export async function ensureVersionedShaders(
    war3Path: string,
    options?: { force?: boolean }
): Promise<{ success: boolean; zipName?: string; version?: War3VersionInfo }> {
    const version = await detectWar3Version(war3Path);
    if (!(await readCurrentModVersion(war3Path)) && (await getInstalledModState(war3Path))?.sequence === 34) {
        console.log('[Shader] Legacy 3.4 package detected; postponing shader profile sync until after the 3.5 patch.');
        return { success: false, version };
    }
    const resolved = await resolveVersionedShaderZipPath(war3Path);
    if (!resolved) {
        return { success: false, version };
    }

    const baseDir = await resolveShadersBaseDir(war3Path);
    const shadersDir = path.join(baseDir, 'shaders');
    const force = options?.force === true;

    if (!force && (await isShaderPackCurrent(shadersDir, resolved.zipName))) {
        console.log(`[Shader] Pack already current: ${resolved.zipName}`);
        return { success: true, zipName: resolved.zipName, version };
    }

    console.log(`[Shader] Applying versioned shaders: ${resolved.zipName} (War3 ${version.version || 'unknown'})`);
    if (resolved.isDirectory) {
        const modSettings = configManager.get('modSettings') || {};
        await syncProfileResources(war3Path, path.join(await AssetSyncService.getAssetsDir(), 'quenching'), modSettings);
    } else {
        const staging = await fs.mkdtemp(path.join(path.dirname(shadersDir), '.quenching-shaders-'));
        try {
            await AssetSyncService.extractZip(resolved.zipPath, staging);
            await normalizeShaderExtractLayout(staging);
            const quenchingDir = path.join(await AssetSyncService.getAssetsDir(), 'quenching');
            // Shader overlays are client-managed; do not retain unknown files
            // from a previous shader pack when applying a new profile.
            await fs.remove(shadersDir);
            await syncBundledResourceFiles(shadersDir, [{ source: staging }], getKnownShaderResourceRoots(quenchingDir), SHADER_PROFILE_MARKER);
        } finally {
            await rm(staging, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
        }
    }
    await writeShaderPackMarker(shadersDir, resolved.zipName);

    // Re-apply Intel/AMD bloom override if enabled
    const modSettings = configManager.get('modSettings') || {};
    if (modSettings.useIntelAmdShaderFix === true) {
        await applyIntelAmdBloomFix(war3Path, true);
    }

    // Keep derived flag in sync for any readers that still check modSettings
    if (modSettings.useLegacyWar3Shaders !== version.useLegacyShaders) {
        configManager.set('modSettings', {
            ...modSettings,
            useLegacyWar3Shaders: version.useLegacyShaders,
        });
    }

    return { success: true, zipName: resolved.zipName, version };
}

/** @deprecated Manual toggle removed; always auto-selects from War3 version. */
async function applyLegacyShaderVersion(war3Path: string, _useLegacyWar3Shaders?: boolean): Promise<boolean> {
    const result = await ensureVersionedShaders(war3Path, { force: true });
    return result.success;
}

async function applyIntelAmdBloomFix(war3Path: string, enabled: boolean): Promise<boolean> {
    const assetsDir = await AssetSyncService.getAssetsDir();

    if (enabled) {
        const resolved = await resolveVersionedShaderZipPath(war3Path);
        const source = resolved?.isDirectory
            ? path.join(resolved.zipPath, ...(resolved.zipName === 'shaders-300-hd' ? [] : ['ps']), INTEL_AMD_BLOOM_FILE)
            : path.join(assetsDir, 'quenching', 'tx', INTEL_AMD_BLOOM_FILE);
        if (!(await fs.pathExists(source))) {
            console.warn(`[Shader] Intel/AMD bloom fix file not found: ${source}`);
            return false;
        }
        const baseDir = await resolveShadersBaseDir(war3Path);
        const target = path.join(baseDir, 'shaders', 'ps', INTEL_AMD_BLOOM_FILE);
        await fs.ensureDir(path.dirname(target));
        await fs.copy(source, target, { overwrite: true });
        return true;
    }

    const resolved = await resolveVersionedShaderZipPath(war3Path);
    if (!resolved) {
        console.warn('[Shader] Cannot restore bloomextract: versioned zip missing');
        return false;
    }

    await installShaderFiles(war3Path, resolved, [`ps/${INTEL_AMD_BLOOM_FILE}`]);
    return true;
}

async function extractSpecificFiles(zipPath: string, outputDir: string, filesToExtract: string[]) {
    if (await fs.pathExists(zipPath) && (await fs.stat(zipPath)).isDirectory()) {
        const wanted = new Set(filesToExtract.map((f) => f.toLowerCase()));
        const stack = [zipPath];
        while (stack.length) {
            const current = stack.pop()!;
            for (const entry of await fs.readdir(current, { withFileTypes: true })) {
                const full = path.join(current, entry.name);
                if (entry.isDirectory()) stack.push(full);
                else if (wanted.has(entry.name.toLowerCase())) {
                    const relative = path.relative(zipPath, full).replace(/\\/g, '/').toLowerCase();
                    const key = relative.includes('/') ? relative : `ps/${relative}`;
                    if (!wanted.has(key)) continue;
                    const target = path.join(outputDir, key);
                    await fs.ensureDir(path.dirname(target));
                    await fs.copy(full, target, { overwrite: true });
                }
            }
        }
        return;
    }
    const wanted = new Set(filesToExtract.map(file => file.toLowerCase()));
    await extractZipArchive(zipPath, outputDir, {
        mapFile: (name) => {
            const normalized = name.replace(/\\/g, '/');
            const lower = normalized.toLowerCase().replace(/^\.\//, '');
            const parts = lower.split('/');
            if (parts.length === 1 && wanted.has(`ps/${parts[0]}`)) return `ps/${parts[0]}`;
            if (parts.length === 2 && (parts[0] === 'ps' || parts[0] === 'vs') && wanted.has(lower)) return lower;
            return null;
        },
    });
}

async function stageProfileShaderFiles(
    resolved: { zipName: string; zipPath: string; isDirectory: boolean },
    files: string[],
    outputDir: string,
): Promise<number> {
    if (!resolved.isDirectory) {
        await extractSpecificFiles(resolved.zipPath, outputDir, files);
        let copied = 0;
        for (const file of files) {
            if (await fs.pathExists(path.join(outputDir, file))) copied++;
        }
        return copied;
    }

    const assetsDir = await AssetSyncService.getAssetsDir();
    const quenchingDir = path.join(assetsDir, 'quenching');
    const candidatesFor = (key: string): string[] => {
        const [stage, name] = key.split('/');
        const candidates: string[] = [];
        if (resolved.zipName === 'shaders-300-hd') {
            if (stage === 'ps') {
                candidates.push(path.join(resolved.zipPath, name));
                for (const variant of ['standard', 'melee', 'rpg']) {
                    candidates.push(path.join(quenchingDir, 'shaders', 'shaders-300-hd', 'ps', variant, name));
                }
            } else {
                candidates.push(path.join(quenchingDir, 'shaders', 'shaders-300-hd', 'vs', name));
            }
        } else {
            candidates.push(path.join(resolved.zipPath, stage, name));
            if (stage === 'ps' && resolved.zipName === 'shaders-300-de') {
                candidates.push(path.join(resolved.zipPath, name));
            }
        }

        for (const root of getKnownShaderResourceRoots(quenchingDir)) {
            if (root.targetPrefix === stage) candidates.push(path.join(root.source, name));
            else if (!root.targetPrefix) candidates.push(path.join(root.source, stage, name));
        }
        return [...new Set(candidates)];
    };

    let copied = 0;
    for (const key of files) {
        const source = candidatesFor(key).find(candidate => fs.existsSync(candidate));
        if (!source) continue; // Older packs can omit optional stages or effects.
        const target = path.join(outputDir, key);
        await fs.ensureDir(path.dirname(target));
        await fs.copy(source, target, { overwrite: true });
        copied++;
    }
    return copied;
}

async function installShaderFiles(
    war3Path: string,
    resolved: { zipName: string; zipPath: string; isDirectory: boolean },
    files: string[],
): Promise<void> {
    const baseDir = await resolveShadersBaseDir(war3Path);
    const shadersDir = path.join(baseDir, 'shaders');
    const staging = await fs.mkdtemp(path.join(baseDir, '.quenching-shader-effect-'));
    try {
        const copied = await stageProfileShaderFiles(resolved, files, staging);
        if (copied === 0) throw new Error(`当前着色器配置没有可用的资源文件: ${files.join(', ')}`);
        await fs.ensureDir(shadersDir);
        await fs.copy(staging, shadersDir, { overwrite: true });
    } finally {
        await rm(staging, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
    }
}

async function removeShaderFiles(war3Path: string, files: string[]): Promise<void> {
    const baseDir = await resolveShadersBaseDir(war3Path);
    const shadersDir = path.join(baseDir, 'shaders');
    for (const file of files) {
        await fs.remove(path.join(shadersDir, file));
    }
}

export function registerShaderHandlers() {
    console.log('[Shader] Shader handlers registered.');

    ipcMain.handle('war3:detect-version', async (_event, war3Path?: string) => {
        const target = war3Path || configManager.get('war3Path');
        return detectWar3Version(target);
    });

    ipcMain.handle('shader:sync-versioned', async (_event, war3Path?: string) => {
        const target = war3Path || configManager.get('war3Path');
        if (!target) {
            return { success: false };
        }
        return ensureVersionedShaders(target);
    });

    ipcMain.handle('shader:update-object-shader', async (_event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating object shader: ${enabled}`);

        const baseDir = await resolveShadersBaseDir(war3Path);

        if (enabled) {
            const resolved = await resolveVersionedShaderZipPath(war3Path);
            if (!resolved) {
                return false;
            }
            await installShaderFiles(war3Path, resolved, OBJECT_SHADER_FILES);
            await writeShaderPackMarker(path.join(baseDir, 'shaders'), resolved.zipName);
            return true;
        }

        await removeShaderFiles(war3Path, OBJECT_SHADER_FILES);
        return true;
    });

    ipcMain.handle('shader:update-post-processing', async (_event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating post processing: ${enabled}`);

        const baseDir = await resolveShadersBaseDir(war3Path);

        if (enabled) {
            const resolved = await resolveVersionedShaderZipPath(war3Path);
            if (!resolved) {
                return false;
            }
            await installShaderFiles(war3Path, resolved, POST_PROCESSING_FILES);
            await writeShaderPackMarker(path.join(baseDir, 'shaders'), resolved.zipName);

            const modSettings = configManager.get('modSettings') || {};
            if (modSettings.useIntelAmdShaderFix === true) {
                await applyIntelAmdBloomFix(war3Path, true);
            }
            return true;
        }

        await removeShaderFiles(war3Path, POST_PROCESSING_FILES);
        return true;
    });

    // Kept for API compatibility; ignores `enabled` and always auto-selects by War3 version.
    ipcMain.handle('shader:update-legacy-war3', async (_event, war3Path: string, _enabled?: boolean) => {
        console.log('[Shader] sync versioned shaders (auto from War3 version)');
        return applyLegacyShaderVersion(war3Path);
    });

    ipcMain.handle('shader:update-intel-amd', async (_event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating Intel/AMD bloom fix: ${enabled}`);
        return applyIntelAmdBloomFix(war3Path, enabled);
    });
}

/** Startup: ensure correct pack, then strip toggled-off shader files. */
export async function cleanupShadersOnStartup(war3Path: string, modSettings: any) {
    await ensureVersionedShaders(war3Path);

    if (modSettings.objectShader === false) {
        console.log('[Shader] Cleaning up object shaders on startup');
        await removeShaderFiles(war3Path, OBJECT_SHADER_FILES);
    }

    if (modSettings.postProcessing === false) {
        console.log('[Shader] Cleaning up post processing shaders on startup');
        await removeShaderFiles(war3Path, POST_PROCESSING_FILES);
    } else if (modSettings.useIntelAmdShaderFix === true) {
        await applyIntelAmdBloomFix(war3Path, true);
    }
}
