import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { AssetSyncService } from '../services/asset-sync';
import { configManager } from '../services/config-manager';

const OBJECT_SHADER_FILES = [
    'cliffblightmiscterrain.bls',
    'foliage.bls',
    'hd.bls',
    'sd_on_hd.bls',
    'terrain.bls'
];

const POST_PROCESSING_FILES = [
    'tonemap.bls',
    'gaussianblur.bls',
    'fog.bls',
    'bloomextract.bls'
];

const LEGACY_SHADER_ZIP_DEFAULT = 'shaders2.03.zip';
const LEGACY_SHADER_ZIP_OLD = 'shaders2.02.zip';
const INTEL_AMD_BLOOM_FILE = 'bloomextract.bls';

async function applyLegacyShaderVersion(war3Path: string, useLegacyWar3Shaders: boolean): Promise<boolean> {
    const retailPath = path.join(war3Path, '_retail_');
    const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
    const shadersDir = path.join(baseDir, 'shaders');
    const assetsDir = await AssetSyncService.getAssetsDir();
    const zipName = useLegacyWar3Shaders ? LEGACY_SHADER_ZIP_OLD : LEGACY_SHADER_ZIP_DEFAULT;
    const zipPath = path.join(assetsDir, 'quenching', zipName);

    if (!(await fs.pathExists(zipPath))) {
        console.warn(`[Shader] Legacy shader zip not found: ${zipPath}`);
        return false;
    }

    // 旧版本与默认版本互切时，先清空 shaders 防止遗留
    await fs.remove(shadersDir).catch(() => { });
    await fs.ensureDir(shadersDir);

    await extractSpecificFiles(zipPath, shadersDir, [...OBJECT_SHADER_FILES, ...POST_PROCESSING_FILES]);
    return true;
}

async function applyIntelAmdBloomFix(war3Path: string, enabled: boolean): Promise<boolean> {
    const retailPath = path.join(war3Path, '_retail_');
    const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
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

    // 关闭修复时，回退到当前版本对应的 zip 里的 bloomextract.bls
    const modSettings = configManager.get('modSettings') || {};
    const useLegacyWar3Shaders = modSettings.useLegacyWar3Shaders === true;
    const zipName = useLegacyWar3Shaders ? LEGACY_SHADER_ZIP_OLD : LEGACY_SHADER_ZIP_DEFAULT;
    const zipPath = path.join(assetsDir, 'quenching', zipName);
    if (!(await fs.pathExists(zipPath))) {
        console.warn(`[Shader] Cannot restore bloomextract, zip not found: ${zipPath}`);
        return false;
    }

    await extractSpecificFiles(zipPath, path.join(baseDir, 'shaders'), [INTEL_AMD_BLOOM_FILE]);
    return true;
}

async function extractSpecificFiles(zipPath: string, outputDir: string, filesToExtract: string[]) {
    const yauzl = require('yauzl');
    // Ensure the output directory exists
    await fs.ensureDir(outputDir);

    return new Promise<void>((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err: any, zipfile: any) => {
            if (err || !zipfile) { reject(err); return; }
            zipfile.readEntry();
            zipfile.on('entry', (entry: any) => {
                const fileName = entry.fileName.replace(/\\/g, '/');
                const isTarget = filesToExtract.some(f => fileName.endsWith('ps/' + f) || fileName.endsWith('ps\\' + f));

                if (isTarget) {
                    zipfile.openReadStream(entry, (err2: any, readStream: any) => {
                        if (err2 || !readStream) { reject(err2); return; }

                        // Construct output path based on the provided output directory
                        const out = path.join(outputDir, fileName);

                        fs.ensureDir(path.dirname(out)).then(() => {
                            const ws = fs.createWriteStream(out);
                            readStream.pipe(ws);
                            ws.on('close', () => zipfile.readEntry());
                        }).catch(reject);
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

    ipcMain.handle('shader:update-object-shader', async (event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating object shader: ${enabled}`);

        const retailPath = path.join(war3Path, '_retail_');
        const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
        const psDir = path.join(baseDir, 'shaders', 'ps');

        if (enabled) {
            const assetsDir = await AssetSyncService.getAssetsDir();
            const zipPath = path.join(assetsDir, 'quenching', 'zip-shaders.zip');
            if (await fs.pathExists(zipPath)) {
                // Determine target directory: we want files to end up in baseDir/shaders/ps/...
                // Assuming zip structure contains 'ps/filename.bls', we extract to 'baseDir/shaders'
                const targetDir = path.join(baseDir, 'shaders');
                await extractSpecificFiles(zipPath, targetDir, OBJECT_SHADER_FILES);
                return true;
            }
            return false;
        } else {
            for (const file of OBJECT_SHADER_FILES) {
                const filePath = path.join(psDir, file);
                if (await fs.pathExists(filePath)) {
                    await fs.remove(filePath);
                }
            }
            return true;
        }
    });

    ipcMain.handle('shader:update-post-processing', async (event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating post processing: ${enabled}`);

        const retailPath = path.join(war3Path, '_retail_');
        const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
        const psDir = path.join(baseDir, 'shaders', 'ps');

        if (enabled) {
            const assetsDir = await AssetSyncService.getAssetsDir();
            const zipPath = path.join(assetsDir, 'quenching', 'zip-shaders.zip');
            if (await fs.pathExists(zipPath)) {
                const targetDir = path.join(baseDir, 'shaders');
                await extractSpecificFiles(zipPath, targetDir, POST_PROCESSING_FILES);
                return true;
            }
            return false;
        } else {
            for (const file of POST_PROCESSING_FILES) {
                const filePath = path.join(psDir, file);
                if (await fs.pathExists(filePath)) {
                    await fs.remove(filePath);
                }
            }
            return true;
        }
    });

    ipcMain.handle('shader:update-legacy-war3', async (event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating legacy shader version: ${enabled ? '2.02' : '2.03'}`);
        return applyLegacyShaderVersion(war3Path, enabled);
    });

    ipcMain.handle('shader:update-intel-amd', async (event, war3Path: string, enabled: boolean) => {
        console.log(`[Shader] Updating Intel/AMD bloom fix: ${enabled}`);
        return applyIntelAmdBloomFix(war3Path, enabled);
    });
}

// Helper for startup cleanup
export async function cleanupShadersOnStartup(war3Path: string, modSettings: any) {
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
    }
}
