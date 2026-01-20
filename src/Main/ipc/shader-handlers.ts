import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { AssetSyncService } from '../services/asset-sync';

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

async function extractSpecificFiles(zipPath: string, war3Path: string, filesToExtract: string[]) {
    // We use the existing extractZip but with a filter if we want to be efficient,
    // but the current extractZip extracts EVERYTHING.
    // The user wants to extract specific files.
    // I might need a modified extractZip or just extract and then delete others?
    // No, better to extract only specific ones if possible, but let's see how extractZip is implemented.
    // Actually, I can implement a specific extractor here.
    const yauzl = require('yauzl');
    await fs.ensureDir(path.join(war3Path, '_retail_', 'shaders', 'ps'));

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
                        // The entry might be "shaders/ps/filename.bls" or just "ps/filename.bls"
                        // Based on zip-shaders.zip typically used in Quenching, it's often _retail_/shaders/ps/... or similar.
                        // Let's assume the internal path matches what we want to output.
                        const out = path.join(war3Path, fileName);
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
        const psDir = path.join(war3Path, '_retail_', 'shaders', 'ps');

        if (enabled) {
            const assetsDir = await AssetSyncService.getAssetsDir();
            const zipPath = path.join(assetsDir, 'quenching', 'zip-shaders.zip');
            if (await fs.pathExists(zipPath)) {
                await extractSpecificFiles(zipPath, war3Path, OBJECT_SHADER_FILES);
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
        const psDir = path.join(war3Path, '_retail_', 'shaders', 'ps');

        if (enabled) {
            const assetsDir = await AssetSyncService.getAssetsDir();
            const zipPath = path.join(assetsDir, 'quenching', 'zip-shaders.zip');
            if (await fs.pathExists(zipPath)) {
                await extractSpecificFiles(zipPath, war3Path, POST_PROCESSING_FILES);
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
