/**
 * Custom campaign (.w3n) unpack + per-map merge.
 * Mirrors legacy Quenching client (MainWindow.xaml.cs w3nloader): each scenario map must
 * receive shared campaign MPQ entries (everything in the root listfile except maps /
 * war3campImported / music / sound / UI paths) so it can run standalone; loose
 * war3campImported/music/sound are still synced to _retail_ at launch (see game-launcher).
 */
import path from 'path';
import fs from 'fs-extra';
import { Archive, MPQ_FILE_REPLACEEXISTING } from '@jamiephan/stormlib';
import { AssetSyncService } from './asset-sync';

const RESERVED_DIRS = new Set(['_merged', '_merge_work']);

export type CampaignExtractProgressPhase =
    | 'prepare'
    | 'readList'
    | 'extractArchive'
    | 'discoverMaps'
    | 'mergeMap'
    | 'cleanup'
    | 'complete';

export interface CampaignExtractProgress {
    phase: CampaignExtractProgressPhase;
    percent: number;
    current?: string;
    index?: number;
    total?: number;
}

type CampaignExtractProgressHandler = (progress: CampaignExtractProgress) => void;

function parseListfileContent(raw: string): string[] {
    const t = raw.trim();
    if (!t) return [];
    if (t.includes('\n') || t.includes('\r')) {
        return t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    }
    return t.split(/\s+/).filter(Boolean);
}

/** Same filters as legacy client when blanking (listfile) lines before merge. */
function isExcludedFromCampaignSharedMerge(listLine: string): boolean {
    const s = listLine;
    if (s === '(listfile)' || s === '(signature)' || s === '(attributes)' || s === '(patch_metadata)') {
        return true;
    }
    return (
        s.includes('war3campImported')
        || s.includes('music')
        || s.includes('sound')
        || s.includes('w3x')
        || s.includes('Music')
        || s.includes('Sound')
        || s.includes('UI\\')
        || s.includes('ui\\')
    );
}

function buildSharedMergePaths(listLines: string[]): string[] {
    return listLines.filter((line) => line && !isExcludedFromCampaignSharedMerge(line));
}

function isCampaignMapListEntry(line: string): boolean {
    const t = line.trim();
    if (!/\.w3x$/i.test(t) && !/\.w3m$/i.test(t)) return false;
    if (/war3campImported/i.test(t)) return false;
    return true;
}

function discoverMapsFromListfile(listLines: string[]): string[] {
    return listLines.filter(isCampaignMapListEntry);
}

function diskPathFromInternal(root: string, internalPath: string): string {
    const parts = internalPath.replace(/\\/g, '/').split('/').filter((p) => p && p !== '.' && p !== '..');
    return path.join(root, ...parts);
}

function extractEntireMpqToDisk(
    archive: Archive,
    destRoot: string,
    onProgress?: CampaignExtractProgressHandler
): void {
    const files = archive.listFiles();
    const total = Math.max(files.length, 1);
    files.forEach((info, index) => {
        const name = info.name;
        if (!name) return;
        const destPath = diskPathFromInternal(destRoot, name);
        try {
            fs.ensureDirSync(path.dirname(destPath));
            if (!archive.extractFile(name, destPath)) {
                console.warn(`[CampaignMerge] extract returned false: ${name}`);
            }
        } catch (e) {
            console.warn(`[CampaignMerge] extract failed (skip): ${name}`, e);
        }
        if (onProgress && (index === 0 || index === total - 1 || index % 10 === 0)) {
            onProgress({
                phase: 'extractArchive',
                percent: 12 + Math.round(((index + 1) / total) * 33),
                current: name,
                index: index + 1,
                total
            });
        }
    });
}

async function collectMapsFallback(campRoot: string): Promise<string[]> {
    const out: string[] = [];
    async function walk(absDir: string, relBase: string): Promise<void> {
        const entries = await fs.readdir(absDir, { withFileTypes: true });
        for (const ent of entries) {
            if (RESERVED_DIRS.has(ent.name)) continue;
            const rel = relBase ? path.join(relBase, ent.name) : ent.name;
            const full = path.join(campRoot, rel);
            if (ent.isDirectory()) {
                await walk(full, rel);
            } else {
                const ext = path.extname(ent.name).toLowerCase();
                if (ext === '.w3x' || ext === '.w3m') {
                    out.push(rel.split(path.sep).join('\\'));
                }
            }
        }
    }
    await walk(campRoot, '');
    return out.sort();
}

async function mergeOneMap(params: {
    campRoot: string;
    mapInternalPath: string;
    sharedPaths: string[];
    ctempTemplatePath: string;
    mergedOutPath: string;
    workDir: string;
}): Promise<void> {
    const { campRoot, mapInternalPath, sharedPaths, ctempTemplatePath, mergedOutPath, workDir } = params;

    const mapOnDisk = diskPathFromInternal(campRoot, mapInternalPath);
    if (!(await fs.pathExists(mapOnDisk))) {
        throw new Error(`Map file missing on disk: ${mapOnDisk}`);
    }

    await fs.ensureDir(path.dirname(mergedOutPath));
    await fs.copy(ctempTemplatePath, mergedOutPath, { overwrite: true });

    const mapWork = path.join(workDir, 'extract');
    await fs.remove(mapWork).catch(() => { });
    await fs.ensureDir(mapWork);

    const src = new Archive();
    src.open(mapOnDisk);

    let listRaw: string;
    try {
        listRaw = src.readFileAsString('(listfile)');
    } catch {
        src.close();
        throw new Error(`Map has no (listfile): ${mapInternalPath}`);
    }
    const mapListLines = parseListfileContent(listRaw);

    const merged = new Archive();
    merged.open(mergedOutPath);

    const neededSlots = mapListLines.length + sharedPaths.length + 256;
    if (merged.getMaxFileCount() < neededSlots) {
        merged.setMaxFileCount(neededSlots);
    }

    const addOpts = { flags: MPQ_FILE_REPLACEEXISTING };

    for (const internalName of mapListLines) {
        const tempFile = diskPathFromInternal(mapWork, internalName);
        await fs.ensureDir(path.dirname(tempFile));
        if (!src.extractFile(internalName, tempFile)) {
            console.warn(`[CampaignMerge] skip missing map entry: ${internalName}`);
            continue;
        }
        if (!merged.addFile(tempFile, internalName, addOpts)) {
            src.close();
            merged.close();
            throw new Error(`Failed to add map file into merged archive: ${internalName}`);
        }
    }
    src.close();

    for (const shared of sharedPaths) {
        const abs = diskPathFromInternal(campRoot, shared);
        if (!(await fs.pathExists(abs))) {
            console.warn(`[CampaignMerge] shared path missing, skip: ${shared}`);
            continue;
        }
        if (!(await fs.stat(abs)).isFile()) {
            continue;
        }
        if (!merged.addFile(abs, shared, addOpts)) {
            merged.close();
            throw new Error(`Failed to add shared file into merged map: ${shared}`);
        }
    }

    merged.flush();
    merged.close();
}

export async function extractCampaignW3nMerged(
    w3nPath: string,
    outputDir: string,
    onProgress?: CampaignExtractProgressHandler
): Promise<{ outputDir: string; maps: string[] }> {
    const report = (progress: CampaignExtractProgress) => onProgress?.(progress);
    const finalOutputDir = path.resolve(outputDir);
    report({ phase: 'prepare', percent: 2 });

    const ctempPath = path.join(await AssetSyncService.getAssetsDir(), 'quenching', 'ctemp.w3x');

    if (!(await fs.pathExists(ctempPath))) {
        throw new Error(`Missing merge template ctemp.w3x at ${ctempPath}`);
    }
    if (!(await fs.pathExists(w3nPath))) {
        throw new Error(`w3n not found: ${w3nPath}`);
    }

    await fs.remove(finalOutputDir).catch(() => { });
    await fs.ensureDir(finalOutputDir);

    const root = new Archive();
    root.open(w3nPath);
    report({ phase: 'readList', percent: 8 });

    let listLines: string[];
    try {
        const listRaw = root.readFileAsString('(listfile)');
        listLines = parseListfileContent(listRaw);
    } catch (e: any) {
        root.close();
        throw new Error(`Campaign archive has no (listfile): ${e?.message || e}`);
    }

    extractEntireMpqToDisk(root, finalOutputDir, report);
    root.close();

    report({ phase: 'discoverMaps', percent: 48 });
    let mapEntries = discoverMapsFromListfile(listLines);
    if (mapEntries.length === 0) {
        const relPaths = await collectMapsFallback(finalOutputDir);
        mapEntries = relPaths;
    }

    const sharedPaths = buildSharedMergePaths(listLines);
    const mergedDir = path.join(finalOutputDir, '_merged');
    const workDir = path.join(finalOutputDir, '_merge_work');
    await fs.ensureDir(mergedDir);
    await fs.remove(workDir).catch(() => { });
    await fs.ensureDir(workDir);

    const mergedMapPaths: string[] = [];
    let idx = 0;
    const totalMaps = Math.max(mapEntries.length, 1);
    for (const mapRel of mapEntries) {
        const mapOnDisk = diskPathFromInternal(finalOutputDir, mapRel);
        if (!(await fs.pathExists(mapOnDisk))) {
            console.warn(`[CampaignMerge] listfile map not on disk, skip: ${mapRel}`);
            continue;
        }
        const ext = path.extname(mapRel) || '.w3x';
        const base = path.basename(mapRel, ext);
        const mergedName = `${base}_merged${ext}`;
        const mergedOut = path.join(mergedDir, mergedName);
        try {
            report({
                phase: 'mergeMap',
                percent: 50 + Math.round((idx / totalMaps) * 43),
                current: mapRel,
                index: idx + 1,
                total: totalMaps
            });
            await mergeOneMap({
                campRoot: finalOutputDir,
                mapInternalPath: mapRel,
                sharedPaths,
                ctempTemplatePath: ctempPath,
                mergedOutPath: mergedOut,
                workDir: path.join(workDir, `slot_${idx++}`)
            });
            mergedMapPaths.push(mergedOut);
        } catch (e) {
            console.error(`[CampaignMerge] failed for ${mapRel}:`, e);
            throw e;
        }
    }

    report({ phase: 'cleanup', percent: 96 });
    await fs.remove(workDir).catch(() => { });

    if (mergedMapPaths.length === 0) {
        throw new Error('No playable maps were produced after merge (empty .w3n or unsupported layout)');
    }

    mergedMapPaths.sort();
    report({ phase: 'complete', percent: 100, total: mergedMapPaths.length });
    return { outputDir: finalOutputDir, maps: mergedMapPaths };
}
