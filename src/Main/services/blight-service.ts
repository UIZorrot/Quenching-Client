import fs from 'fs-extra';
import path from 'path';
import { AssetSyncService } from './asset-sync';

function isOriginalTerrainMode(terrainMode: string): boolean {
    return terrainMode === 'original' || terrainMode === 'classic';
}

function isRetroTerrainMode(terrainMode: string): boolean {
    return terrainMode === 'retro';
}

export function getBlightZipName(terrainMode: string): string | null {
    if (isOriginalTerrainMode(terrainMode)) {
        return null;
    }
    if (isRetroTerrainMode(terrainMode)) {
        return 'zip-blight-retro.zip';
    }
    return 'zip-blight-que.zip';
}

async function resolveBaseDir(war3Path: string): Promise<string> {
    const retailPath = path.join(war3Path, '_retail_');
    return (await fs.pathExists(retailPath)) ? retailPath : war3Path;
}

async function removeBlightDir(terrainArtPath: string): Promise<void> {
    const blightDir = path.join(terrainArtPath, 'blight');
    if (await fs.pathExists(blightDir)) {
        await fs.remove(blightDir);
    }
}

async function extractBlightZip(terrainArtPath: string, zipName: string): Promise<void> {
    const assetsDir = await AssetSyncService.getAssetsDir();
    const zipPath = path.join(assetsDir, 'quenching', zipName);

    if (!(await fs.pathExists(zipPath))) {
        throw new Error(`Blight zip not found: ${zipPath}`);
    }

    await removeBlightDir(terrainArtPath);
    await fs.ensureDir(terrainArtPath);
    await AssetSyncService.extractZip(zipPath, terrainArtPath);

    const blightDir = path.join(terrainArtPath, 'blight');
    if (!(await fs.pathExists(blightDir))) {
        throw new Error(`Blight extract failed, missing ${blightDir}`);
    }

    console.log(`[Blight] Applied ${zipName} -> terrainart/blight`);
}

export async function syncBlightForTerrain(war3Path: string, terrainMode: string): Promise<void> {
    const baseDir = await resolveBaseDir(war3Path);
    const terrainArtPath = path.join(baseDir, 'terrainart');
    const zipName = getBlightZipName(terrainMode);

    if (!zipName) {
        console.log('[Blight] Original terrain, removing terrainart/blight');
        await removeBlightDir(terrainArtPath);
        return;
    }

    console.log(`[Blight] Terrain mode ${terrainMode}, applying ${zipName}`);
    await extractBlightZip(terrainArtPath, zipName);
}

export async function syncBlightOnStartup(war3Path: string, modSettings: Record<string, unknown>): Promise<void> {
    const terrainMode = (modSettings.terrain as string | undefined) ?? 'latest';
    const baseDir = await resolveBaseDir(war3Path);
    const terrainArtPath = path.join(baseDir, 'terrainart');
    const zipName = getBlightZipName(terrainMode);

    if (!zipName) {
        await removeBlightDir(terrainArtPath);
        return;
    }

    const blightDir = path.join(terrainArtPath, 'blight');
    if (await fs.pathExists(blightDir)) {
        return;
    }

    console.log(`[Blight] blight directory missing on startup, applying ${zipName}`);
    await extractBlightZip(terrainArtPath, zipName);
}
