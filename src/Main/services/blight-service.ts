import { getSelectedGameFolder } from './game-channel';
import fs from 'fs-extra';
import path from 'path';
import { rm } from 'node:fs/promises';
import { AssetSyncService } from './asset-sync';
import { syncBundledResourceFiles } from './managed-resource-files';

export function getBlightZipName(enabled = true): string | null {
    return enabled ? 'zip-blight-que.zip' : null;
}

async function resolveBaseDir(war3Path: string): Promise<string> {
    const retailPath = path.join(war3Path, getSelectedGameFolder());
    return (await fs.pathExists(retailPath)) ? retailPath : war3Path;
}

async function syncBlightDir(terrainArtPath: string, desiredZipName?: string): Promise<void> {
    const blightDir = path.join(terrainArtPath, 'blight');
    const assetsDir = await AssetSyncService.getAssetsDir();
    const staging = await fs.mkdtemp(path.join(path.dirname(terrainArtPath), '.quenching-blight-'));
    try {
        const roots = [];
        for (const zipName of ['zip-blight-que.zip', 'zip-blight-retro.zip']) {
            const zipPath = path.join(assetsDir, 'quenching', zipName);
            if (!(await fs.pathExists(zipPath))) {
                if (zipName === desiredZipName) throw new Error(`Blight zip not found: ${zipPath}`);
                continue;
            }
            const output = path.join(staging, zipName);
            await AssetSyncService.extractZip(zipPath, output);
            roots.push({ name: zipName, source: path.join(output, 'blight') });
        }
        const desired = desiredZipName ? roots.find(root => root.name === desiredZipName) : null;
        if (desiredZipName && (!desired || !(await fs.pathExists(desired.source)))) throw new Error(`Blight extract failed: ${desiredZipName}`);
        await syncBundledResourceFiles(
            blightDir,
            desired ? [{ source: desired.source }] : [],
            roots.map(root => ({ source: root.source })),
            '.quenching-managed-blight.json',
        );
    } finally {
        // On Windows the ZIP reader or antivirus can release the last file a
        // moment after extraction completes. Retry our exact temporary path.
        await rm(staging, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
    }
}

async function extractBlightZip(terrainArtPath: string, zipName: string): Promise<void> {
    await syncBlightDir(terrainArtPath, zipName);

    const blightDir = path.join(terrainArtPath, 'blight');
    if (!(await fs.pathExists(blightDir))) {
        throw new Error(`Blight extract failed, missing ${blightDir}`);
    }

    console.log(`[Blight] Applied ${zipName} -> terrainart/blight`);
}

export async function applyBlightSettings(war3Path: string, enabled: boolean): Promise<void> {
    const baseDir = await resolveBaseDir(war3Path);
    const terrainArtPath = path.join(baseDir, 'terrainart');
    const zipName = getBlightZipName(enabled);

    if (!zipName) {
        console.log('[Blight] Original effect selected, removing client-owned terrainart/blight');
        await syncBlightDir(terrainArtPath);
        return;
    }

    console.log(`[Blight] Independent toggle enabled, applying ${zipName}`);
    await extractBlightZip(terrainArtPath, zipName);
}

export async function syncBlightOnStartup(war3Path: string, modSettings: Record<string, unknown>): Promise<void> {
    await applyBlightSettings(war3Path, modSettings.blight !== false);
}
