import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { AssetSyncService } from '../services/asset-sync';
import { configManager } from '../services/config-manager';
import {
    detectWar3Version,
    isShaderPackCurrent,
    resolveShaderZipName,
    writeShaderPackMarker,
    type War3VersionInfo,
} from '../services/war3-version';

const OBJECT_SHADER_FILES = [
    'cliffblightmiscterrain.bls',
    'foliage.bls',
    'hd.bls',
    'sd_on_hd.bls',
    'terrain.bls',
];

const POST_PROCESSING_FILES = [
    'tonemap.bls',
    'gaussianblur.bls',
    'fog.bls',
    'bloomextract.bls',
];

const INTEL_AMD_BLOOM_FILE = 'bloomextract.bls';

async function resolveShadersBaseDir(war3Path: string): Promise<string> {
    const retailPath = path.join(war3Path, '_retail_');
    return (await fs.pathExists(retailPath)) ? retailPath : war3Path;
}

async function resolveVersionedShaderZipPath(war3Path: string): Promise<{ zipName: string; zipPath: string } | null> {
    const assetsDir = await AssetSyncService.getAssetsDir();
    const zipName = await resolveShaderZipName(war3Path);
    const zipPath = path.join(assetsDir, 'quenching', zipName);
    if (!(await fs.pathExists(zipPath))) {
        console.warn(`[Shader] Versioned shader zip not found: ${zipPath}`);
        return null;
    }
    return { zipName, zipPath };
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
    await fs.remove(shadersDir).catch(() => { });
    await fs.ensureDir(shadersDir);
    // Full pack extract (same as asset-sync); object/post toggles may strip files afterwards.
    await AssetSyncService.extractZip(resolved.zipPath, shadersDir);
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
    const baseDir = await resolveShadersBaseDir(war3Path);
    const psDir = path.join(baseDir, 'shaders', 'ps');
    const bloomPath = path.join(psDir, INTEL_AMD_BLOOM_FILE);
    const assetsDir = await AssetSyncService.getAssetsDir();

    await fs.ensureDir(psDir);

    if (enabled) {
        const source = path.join(assetsDir, 'quenching', INTEL_AMD_BLOOM_FILE);
        if (!(await fs.pathExists(source))) {
            console.warn(`[Shader] Intel/AMD bloom fix file not found: ${source}`);
            return false;
        }
        await fs.copy(source, bloomPath, { overwrite: true });
        return true;
    }

    const resolved = await resolveVersionedShaderZipPath(war3Path);
    if (!resolved) {
        console.warn('[Shader] Cannot restore bloomextract: versioned zip missing');
        return false;
    }

    await extractSpecificFiles(resolved.zipPath, path.join(baseDir, 'shaders'), [INTEL_AMD_BLOOM_FILE]);
    return true;
}

async function extractSpecificFiles(zipPath: string, outputDir: string, filesToExtract: string[]) {
    const yauzl = require('yauzl');
    await fs.ensureDir(outputDir);

    return new Promise<void>((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipfile: any) => {
            if (err || !zipfile) {
                reject(err);
                return;
            }
            zipfile.readEntry();
            zipfile.on('entry', (entry: any) => {
                const fileName = entry.fileName.replace(/\\/g, '/');
                const isTarget = filesToExtract.some(
                    (f) => fileName.endsWith('ps/' + f) || fileName.endsWith('ps\\' + f)
                );

                if (isTarget) {
                    zipfile.openReadStream(entry, (err2: any, readStream: any) => {
                        if (err2 || !readStream) {
                            reject(err2);
                            return;
                        }

                        const out = path.join(outputDir, fileName);

                        fs.ensureDir(path.dirname(out))
                            .then(() => {
                                const ws = fs.createWriteStream(out);
                                readStream.pipe(ws);
                                ws.on('close', () => zipfile.readEntry());
                            })
                            .catch(reject);
                    });
                } else {
                    zipfile.readEntry();
                }
            });
            zipfile.on('end', () => resolve());
            zipfile.on('error', (e: any) => reject(e));
        });
    });
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
        const psDir = path.join(baseDir, 'shaders', 'ps');

        if (enabled) {
            const resolved = await resolveVersionedShaderZipPath(war3Path);
            if (!resolved) {
                return false;
            }
            const targetDir = path.join(baseDir, 'shaders');
            await extractSpecificFiles(resolved.zipPath, targetDir, OBJECT_SHADER_FILES);
            await writeShaderPackMarker(targetDir, resolved.zipName);
            return true;
        }

        for (const file of OBJECT_SHADER_FILES) {
            const filePath = path.join(psDir, file);
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
            }
        }
        return true;
    });

    ipcMain.handle('shader:update-post-processing', async (_event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating post processing: ${enabled}`);

        const baseDir = await resolveShadersBaseDir(war3Path);
        const psDir = path.join(baseDir, 'shaders', 'ps');

        if (enabled) {
            const resolved = await resolveVersionedShaderZipPath(war3Path);
            if (!resolved) {
                return false;
            }
            const targetDir = path.join(baseDir, 'shaders');
            await extractSpecificFiles(resolved.zipPath, targetDir, POST_PROCESSING_FILES);
            await writeShaderPackMarker(targetDir, resolved.zipName);

            const modSettings = configManager.get('modSettings') || {};
            if (modSettings.useIntelAmdShaderFix === true) {
                await applyIntelAmdBloomFix(war3Path, true);
            }
            return true;
        }

        for (const file of POST_PROCESSING_FILES) {
            const filePath = path.join(psDir, file);
            if (await fs.pathExists(filePath)) {
                await fs.remove(filePath);
            }
        }
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

    const psDir = path.join(war3Path, '_retail_', 'shaders', 'ps');

    if (modSettings.objectShader === false) {
        console.log('[Shader] Cleaning up object shaders on startup');
        for (const file of OBJECT_SHADER_FILES) {
            await fs.remove(path.join(psDir, file)).catch(() => { });
        }
    }

    if (modSettings.postProcessing === false) {
        console.log('[Shader] Cleaning up post processing shaders on startup');
        for (const file of POST_PROCESSING_FILES) {
            await fs.remove(path.join(psDir, file)).catch(() => { });
        }
    } else if (modSettings.useIntelAmdShaderFix === true) {
        await applyIntelAmdBloomFix(war3Path, true);
    }
}
