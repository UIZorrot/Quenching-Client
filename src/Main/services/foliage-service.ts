import fs from 'fs-extra';
import path from 'path';
import { configManager } from './config-manager';
import { AssetSyncService } from './asset-sync';

export function isQuenchingTerrainMode(terrainMode: string): boolean {
    return terrainMode !== 'original' && terrainMode !== 'classic';
}

export function isRetroTerrainMode(terrainMode: string): boolean {
    return terrainMode === 'retro';
}

export function getFoliageZipName(terrainMode: string): string {
    return terrainMode === 'latest' ? 'zip-foliage-que.zip' : 'zip-foliage-other.zip';
}

async function resolveBaseDir(war3Path: string): Promise<string> {
    const retailPath = path.join(war3Path, '_retail_');
    return (await fs.pathExists(retailPath)) ? retailPath : war3Path;
}

async function removeFoliageDir(environmentDir: string): Promise<void> {
    const foliageDir = path.join(environmentDir, 'foliage');
    if (await fs.pathExists(foliageDir)) {
        await fs.remove(foliageDir);
    }
}

export async function applyFoliageSettings(
    war3Path: string,
    enabled: boolean,
    terrainMode?: string
): Promise<void> {
    const baseDir = await resolveBaseDir(war3Path);
    const environmentDir = path.join(baseDir, 'environment');

    const mode = terrainMode ?? configManager.get('modSettings')?.terrain ?? 'latest';

    if (isRetroTerrainMode(mode)) {
        console.log('[Foliage] Retro terrain, removing foliage directory');
        await removeFoliageDir(environmentDir);
        return;
    }

    if (!enabled) {
        console.log('[Foliage] Disabling... Removing foliage directory');
        await removeFoliageDir(environmentDir);
        return;
    }

    const zipName = getFoliageZipName(mode);
    const assetsDir = await AssetSyncService.getAssetsDir();
    const zipPath = path.join(assetsDir, 'quenching', zipName);

    if (!(await fs.pathExists(zipPath))) {
        throw new Error(`Foliage zip not found: ${zipPath}`);
    }

    console.log(`[Foliage] Enabling with ${zipName} for terrain mode: ${mode}`);
    await removeFoliageDir(environmentDir);
    await fs.ensureDir(environmentDir);
    await AssetSyncService.extractZip(zipPath, environmentDir);

    const foliageDir = path.join(environmentDir, 'foliage');
    if (!(await fs.pathExists(foliageDir))) {
        throw new Error(`Foliage extract failed, missing ${foliageDir}`);
    }

    console.log(`[Foliage] Applied ${zipName} -> environment/foliage`);
}

export async function syncFoliageForTerrainIfEnabled(
    war3Path: string,
    terrainMode: string,
    previousTerrainMode?: string
): Promise<void> {
    if (isRetroTerrainMode(terrainMode)) {
        const baseDir = await resolveBaseDir(war3Path);
        console.log('[Foliage] Retro terrain switch, removing foliage directory');
        await removeFoliageDir(path.join(baseDir, 'environment'));
        return;
    }

    const modSettings = configManager.get('modSettings') || {};
    const leavingRetro = previousTerrainMode !== undefined && isRetroTerrainMode(previousTerrainMode);

    if (modSettings.foliage === false && !leavingRetro) {
        console.log('[Foliage] foliage disabled in config, skipping terrain-linked foliage sync');
        return;
    }

    console.log(
        `[Foliage] Terrain switch ${previousTerrainMode ?? '?'} -> ${terrainMode}, applying ${getFoliageZipName(terrainMode)}`
    );
    await applyFoliageSettings(war3Path, true, terrainMode);
}

export async function syncFoliageOnStartup(war3Path: string, modSettings: Record<string, unknown>): Promise<void> {
    const baseDir = await resolveBaseDir(war3Path);
    const environmentDir = path.join(baseDir, 'environment');
    const terrainMode = (modSettings.terrain as string | undefined) ?? 'latest';

    if (isRetroTerrainMode(terrainMode)) {
        console.log('[Foliage] Retro terrain on startup, removing foliage directory');
        await removeFoliageDir(environmentDir);
        return;
    }

    if (modSettings.foliage === false) {
        console.log('[Foliage] foliage=false in config, cleaning up foliage directory on startup');
        await removeFoliageDir(environmentDir);
        return;
    }

    const foliageDir = path.join(environmentDir, 'foliage');
    if (await fs.pathExists(foliageDir)) {
        return;
    }

    console.log(`[Foliage] foliage enabled but directory missing, applying ${getFoliageZipName(terrainMode)}`);
    await applyFoliageSettings(war3Path, true, terrainMode);
}
