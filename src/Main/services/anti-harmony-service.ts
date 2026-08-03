import fs from 'fs-extra';
import path from 'path';
import { configManager } from './config-manager';

/**
 * Anti-harmony principle (same as old-client anitvio):
 * 1) Enumerate files under `_teen.w3mod` (censored overlay index)
 * 2) For each teen path, open the NON-teen HD original (`_teen.w3mod:` removed)
 * 3) Write that uncensored file into `_retail_` local files
 *
 * Local files have the highest load priority, so they override teen assets from CASC.
 * We never copy teen content onto disk.
 *
 * Toggle:
 * - ON: restore from `_retail_/QMoff/vio/...` (or legacy `*-vio`), else extract NON-teen from CASC
 * - OFF: park active overrides under `_retail_/QMoff/vio/...`
 *   (same QMoff parking lot as classic-mode / mod-off assets; game does not load QMoff)
 */

const TEEN_PREFIX = 'war3.w3mod:_hd.w3mod:_teen.w3mod:';
const MARKER_NAME = 'quenching-vio.que';
/** Legacy per-file park suffix (pre-QMoff/vio); still restored on enable. */
const LEGACY_PARK_SUFFIX = '-vio';
const QMOFF_VIO_DIR = path.join('QMoff', 'vio');

const TEEN_ROOTS = ['units', 'buildings', 'doodads'] as const;

export type AntiHarmonyProgress = {
    percent: number;
    current: number;
    total: number;
    message: string;
};

type Manifest = {
    enabled: boolean;
    files: string[];
};

function normalizeWar3Root(war3Path: string): string {
    return path.normalize(war3Path.replace(/\\/g, '/').replace(/\/$/, ''));
}

export async function resolveRetailDir(war3Path: string): Promise<string> {
    const root = normalizeWar3Root(war3Path);
    const retail = path.join(root, '_retail_');
    if (await fs.pathExists(retail)) {
        return retail;
    }
    return root;
}

function getCascOpenCandidates(war3Path: string): string[] {
    const root = normalizeWar3Root(war3Path);
    return [root, path.join(root, '_retail_')];
}

export function getAntiHarmonyMarkerPath(retailDir: string): string {
    return path.join(retailDir, MARKER_NAME);
}

function toRelativeKey(relativePath: string): string {
    return relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

/** Parked override: `_retail_/QMoff/vio/<relative>` (mirrors retail relative path). */
function parkPathFor(retailDir: string, relativeKey: string): string {
    return path.join(retailDir, QMOFF_VIO_DIR, relativeKey.replace(/[\\/]+/g, path.sep));
}

/** Old toggle parked next to the active file as `path-vio`. */
function legacyParkPathFor(activePath: string): string {
    return `${activePath}${LEGACY_PARK_SUFFIX}`;
}

async function tryRestoreParked(
    retailDir: string,
    relativeKey: string,
    activePath: string
): Promise<boolean> {
    const parked = parkPathFor(retailDir, relativeKey);
    if (await safeMove(parked, activePath)) {
        return true;
    }
    // Migrate legacy `*-vio` siblings into the active path
    return safeMove(legacyParkPathFor(activePath), activePath);
}

async function readManifest(retailDir: string): Promise<Manifest> {
    const markerPath = getAntiHarmonyMarkerPath(retailDir);
    if (!(await fs.pathExists(markerPath))) {
        return { enabled: false, files: [] };
    }

    const raw = await fs.readFile(markerPath, 'utf-8');
    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    let enabled = false;
    const files: string[] = [];

    for (const line of lines) {
        if (line.startsWith('enabled=')) {
            enabled = line.slice('enabled='.length) === '1' || line.slice('enabled='.length) === 'true';
            continue;
        }
        if (line.includes('=')) {
            // legacy metadata lines (installed=, extracted=, ...)
            continue;
        }
        files.push(toRelativeKey(line));
    }

    // Legacy marker without file list / enabled flag: treat presence as enabled.
    if (files.length === 0 && !lines.some((l) => l.startsWith('enabled='))) {
        enabled = true;
    }

    return { enabled, files: Array.from(new Set(files)) };
}

async function writeManifest(retailDir: string, manifest: Manifest): Promise<void> {
    const body = [
        `enabled=${manifest.enabled ? '1' : '0'}`,
        `updated=${new Date().toISOString()}`,
        ...manifest.files.map((f) => toRelativeKey(f)),
        '',
    ].join('\r\n');
    await fs.writeFile(getAntiHarmonyMarkerPath(retailDir), body, 'utf-8');
}

export async function isAntiHarmonyEnabled(war3Path: string | undefined): Promise<boolean> {
    if (!war3Path) {
        return !!configManager.get('antiHarmony');
    }
    try {
        const retailDir = await resolveRetailDir(war3Path);
        const manifest = await readManifest(retailDir);
        if (manifest.files.length > 0 || (await fs.pathExists(getAntiHarmonyMarkerPath(retailDir)))) {
            return manifest.enabled;
        }
    } catch {
        // fall through
    }
    return !!configManager.get('antiHarmony');
}

/** @deprecated use isAntiHarmonyEnabled */
export async function isAntiHarmonyInstalled(war3Path: string | undefined): Promise<boolean> {
    return isAntiHarmonyEnabled(war3Path);
}

function isTeenAssetPath(fileName: string): boolean {
    const lower = fileName.replace(/\//g, '\\').toLowerCase();
    if (!lower.includes(TEEN_PREFIX)) {
        return false;
    }
    return TEEN_ROOTS.some(
        (root) =>
            lower.includes(`_teen.w3mod:${root}\\`) ||
            lower.includes(`_teen.w3mod:${root}/`) ||
            lower.endsWith(`_teen.w3mod:${root}`)
    );
}

/** Strip teen prefix ?? relative path under units/buildings/doodads */
function cascTeenPathToRelative(fileName: string): string {
    return fileName
        .replace(TEEN_PREFIX, '')
        .replace(/\//g, '\\')
        .replace(/^\\+/, '');
}

/** NON-teen CASC source path for a teen entry */
function cascNonTeenSourcePath(teenFileName: string): string {
    return teenFileName.replace('_teen.w3mod:', '');
}

/** Match old-client redirects: only rewrite when the *-dis directory exists. */
function applyDisabledDirRedirect(retailDir: string, relativePath: string): string {
    let temps = path.join(retailDir, relativePath.replace(/[\\/]+/g, path.sep));

    const checks: Array<{ fragment: string; disDir: string; from: string; to: string }> = [
        { fragment: `${path.sep}creeps${path.sep}`, disDir: path.join(retailDir, 'units', 'creeps-dis'), from: `${path.sep}creeps${path.sep}`, to: `${path.sep}creeps-dis${path.sep}` },
        { fragment: `${path.sep}critters${path.sep}`, disDir: path.join(retailDir, 'units', 'critters-dis'), from: `${path.sep}critters${path.sep}`, to: `${path.sep}critters-dis${path.sep}` },
        { fragment: `${path.sep}demon${path.sep}`, disDir: path.join(retailDir, 'units', 'demon-dis'), from: `${path.sep}demon${path.sep}`, to: `${path.sep}demon-dis${path.sep}` },
        { fragment: `${path.sep}human${path.sep}`, disDir: path.join(retailDir, 'units', 'human-dis'), from: `${path.sep}human${path.sep}`, to: `${path.sep}human-dis${path.sep}` },
        { fragment: `${path.sep}naga${path.sep}`, disDir: path.join(retailDir, 'units', 'naga-dis'), from: `${path.sep}naga${path.sep}`, to: `${path.sep}naga-dis${path.sep}` },
        { fragment: `${path.sep}nightelf${path.sep}`, disDir: path.join(retailDir, 'units', 'nightelf-dis'), from: `${path.sep}nightelf${path.sep}`, to: `${path.sep}nightelf-dis${path.sep}` },
        { fragment: `${path.sep}orc${path.sep}`, disDir: path.join(retailDir, 'units', 'orc-dis'), from: `${path.sep}orc${path.sep}`, to: `${path.sep}orc-dis${path.sep}` },
        { fragment: `${path.sep}other${path.sep}`, disDir: path.join(retailDir, 'units', 'other-dis'), from: `${path.sep}other${path.sep}`, to: `${path.sep}other-dis${path.sep}` },
        { fragment: `${path.sep}undead${path.sep}`, disDir: path.join(retailDir, 'units', 'undead-dis'), from: `${path.sep}undead${path.sep}`, to: `${path.sep}undead-dis${path.sep}` },
        { fragment: `${path.sep}buildings${path.sep}`, disDir: path.join(retailDir, 'buildings-dis'), from: `${path.sep}buildings${path.sep}`, to: `${path.sep}buildings-dis${path.sep}` },
        { fragment: `${path.sep}doodads${path.sep}`, disDir: path.join(retailDir, 'doodads-dis'), from: `${path.sep}doodads${path.sep}`, to: `${path.sep}doodads-dis${path.sep}` },
    ];

    for (const check of checks) {
        if (!temps.toLowerCase().includes(check.fragment.toLowerCase())) {
            continue;
        }
        if (fs.existsSync(check.disDir)) {
            const idx = temps.toLowerCase().indexOf(check.from.toLowerCase());
            if (idx >= 0) {
                temps = temps.slice(0, idx) + check.to + temps.slice(idx + check.from.length);
            }
        }
    }

    return temps;
}

async function openCascStorage(war3Path: string): Promise<{ storage: any; openedAt: string }> {
    const { Storage } = await import('@jamiephan/casclib');
    const errors: string[] = [];

    for (const candidate of getCascOpenCandidates(war3Path)) {
        if (!(await fs.pathExists(candidate))) {
            continue;
        }
        try {
            const storage = new Storage();
            storage.open(candidate);
            return { storage, openedAt: candidate };
        } catch (error: any) {
            errors.push(`${candidate}: ${error?.message || String(error)}`);
        }
    }

    throw new Error(`???????? CASC ?????${errors.join(' | ') || '??????????????'}`);
}

function collectTeenFiles(storage: any): string[] {
    const files: string[] = [];
    const first = storage.findFirstFile('*');
    let current = first;
    while (current) {
        const name = current.fileName || '';
        if (isTeenAssetPath(name)) {
            files.push(name);
        }
        current = storage.findNextFile();
    }
    storage.findClose();
    return files;
}

async function safeMove(from: string, to: string): Promise<boolean> {
    if (!(await fs.pathExists(from))) {
        return false;
    }
    await fs.ensureDir(path.dirname(to));
    if (await fs.pathExists(to)) {
        await fs.remove(to);
    }
    await fs.move(from, to);
    return true;
}

/**
 * Enable anti-harmony: restore parked NON-teen overrides, or extract NON-teen HD originals from CASC.
 */
async function enableAntiHarmony(
    war3Path: string,
    onProgress?: (progress: AntiHarmonyProgress) => void
): Promise<{ extracted: number; restored: number; skipped: number; total: number }> {
    const retailDir = await resolveRetailDir(war3Path);
    await fs.ensureDir(retailDir);

    const manifest = await readManifest(retailDir);
    let restored = 0;
    let extracted = 0;
    let skipped = 0;
    const managed = new Set(manifest.files.map(toRelativeKey));

    // 1) Restore parked overrides first (fast toggle path)
    if (manifest.files.length > 0) {
        const total = manifest.files.length;
        onProgress?.({ percent: 0, current: 0, total, message: 'Restoring parked anti-harmony files...' });
        for (let i = 0; i < manifest.files.length; i++) {
            const relative = manifest.files[i];
            const activePath = applyDisabledDirRedirect(retailDir, relative.replace(/\//g, path.sep));

            if (await fs.pathExists(activePath)) {
                skipped++;
            } else if (await tryRestoreParked(retailDir, relative, activePath)) {
                restored++;
            }

            if (i % 20 === 0 || i === total - 1) {
                onProgress?.({
                    percent: Math.min(40, Math.round(((i + 1) / total) * 40)),
                    current: i + 1,
                    total,
                    message: relative,
                });
            }
        }
    }

    // 2) Extract any still-missing NON-teen originals (first enable / incomplete set)
    const { storage, openedAt } = await openCascStorage(war3Path);
    console.log(`[AntiHarmony] Opened CASC at: ${openedAt}`);
    console.log('[AntiHarmony] Principle: list teen paths ?? extract NON-teen HD originals ?? write local overrides');

    try {
        onProgress?.({ percent: 45, current: 0, total: 0, message: 'Scanning teen asset index...' });
        const teenFiles = collectTeenFiles(storage);
        const total = teenFiles.length;
        console.log(`[AntiHarmony] Teen index entries: ${total}`);

        for (let i = 0; i < teenFiles.length; i++) {
            const teenName = teenFiles[i];
            const relative = toRelativeKey(cascTeenPathToRelative(teenName));
            const activePath = applyDisabledDirRedirect(retailDir, relative.replace(/\//g, path.sep));
            managed.add(relative);

            if (await fs.pathExists(activePath)) {
                skipped++;
            } else if (await tryRestoreParked(retailDir, relative, activePath)) {
                restored++;
            } else {
                // CRITICAL: open NON-teen source, never the teen path itself
                const sourceName = cascNonTeenSourcePath(teenName);
                if (sourceName.includes('_teen.w3mod:')) {
                    console.warn(`[AntiHarmony] Refusing teen source: ${sourceName}`);
                    skipped++;
                } else {
                    try {
                        if (!storage.fileExists(sourceName)) {
                            skipped++;
                        } else {
                            const file = storage.openFile(sourceName);
                            try {
                                const data = file.readAll();
                                await fs.ensureDir(path.dirname(activePath));
                                await fs.writeFile(activePath, data);
                                extracted++;
                            } finally {
                                file.close();
                            }
                        }
                    } catch (error) {
                        console.warn(`[AntiHarmony] Skip NON-teen ${sourceName}:`, error);
                        skipped++;
                    }
                }
            }

            if (i % 10 === 0 || i === total - 1) {
                const percent = total > 0 ? 45 + Math.min(54, Math.round(((i + 1) / total) * 54)) : 99;
                onProgress?.({
                    percent,
                    current: i + 1,
                    total,
                    message: relative,
                });
            }
        }

        const nextManifest: Manifest = {
            enabled: true,
            files: Array.from(managed).sort(),
        };
        await writeManifest(retailDir, nextManifest);
        configManager.set('antiHarmony', true);

        onProgress?.({
            percent: 100,
            current: total,
            total,
            message: 'Anti-harmony enabled',
        });

        console.log(
            `[AntiHarmony] Enabled. extracted=${extracted}, restored=${restored}, skipped=${skipped}, managed=${nextManifest.files.length}`
        );
        return { extracted, restored, skipped, total: nextManifest.files.length };
    } finally {
        try {
            storage.close();
        } catch {
            // ignore
        }
    }
}

/**
 * Disable anti-harmony: park local NON-teen overrides under `_retail_/QMoff/vio/...`
 * so CASC teen assets apply again (same parking lot as classic / mod-off).
 */
async function disableAntiHarmony(
    war3Path: string,
    onProgress?: (progress: AntiHarmonyProgress) => void
): Promise<{ parked: number; skipped: number; total: number }> {
    const retailDir = await resolveRetailDir(war3Path);
    const manifest = await readManifest(retailDir);
    let files = manifest.files;

    // If legacy marker has no list, rebuild from a quick CASC teen scan (paths only, no extract)
    if (files.length === 0) {
        const { storage } = await openCascStorage(war3Path);
        try {
            files = collectTeenFiles(storage).map((teen) => toRelativeKey(cascTeenPathToRelative(teen)));
        } finally {
            try {
                storage.close();
            } catch {
                // ignore
            }
        }
    }

    const total = files.length;
    let parked = 0;
    let skipped = 0;

    onProgress?.({ percent: 0, current: 0, total, message: 'Parking local anti-harmony overrides to QMoff/vio...' });

    for (let i = 0; i < files.length; i++) {
        const relative = files[i];
        const activePath = applyDisabledDirRedirect(retailDir, relative.replace(/\//g, path.sep));
        const parkedFile = parkPathFor(retailDir, relative);
        const legacyParked = legacyParkPathFor(activePath);

        if (await fs.pathExists(activePath)) {
            if (await safeMove(activePath, parkedFile)) {
                parked++;
            } else {
                skipped++;
            }
        } else if (await fs.pathExists(legacyParked)) {
            // Consolidate legacy *-vio into QMoff/vio
            if (await safeMove(legacyParked, parkedFile)) {
                parked++;
            } else {
                skipped++;
            }
        } else if (await fs.pathExists(parkedFile)) {
            // Already parked under QMoff/vio
            parked++;
        } else {
            skipped++;
        }

        if (i % 20 === 0 || i === total - 1) {
            onProgress?.({
                percent: total > 0 ? Math.min(99, Math.round(((i + 1) / total) * 100)) : 100,
                current: i + 1,
                total,
                message: relative,
            });
        }
    }

    await writeManifest(retailDir, {
        enabled: false,
        files: Array.from(new Set(files.map(toRelativeKey))).sort(),
    });
    configManager.set('antiHarmony', false);

    onProgress?.({ percent: 100, current: total, total, message: 'Anti-harmony disabled' });
    console.log(`[AntiHarmony] Disabled. parked=${parked}, skipped=${skipped}, total=${total}`);
    return { parked, skipped, total };
}

export async function setAntiHarmonyEnabled(
    war3Path: string,
    enabled: boolean,
    onProgress?: (progress: AntiHarmonyProgress) => void
): Promise<{ success: boolean; enabled: boolean }> {
    if (!war3Path) {
        throw new Error('?????????????III????');
    }

    if (enabled) {
        await enableAntiHarmony(war3Path, onProgress);
    } else {
        await disableAntiHarmony(war3Path, onProgress);
    }

    return { success: true, enabled };
}

/** @deprecated use setAntiHarmonyEnabled(war3Path, true) */
export async function installAntiHarmony(
    war3Path: string,
    onProgress?: (progress: AntiHarmonyProgress) => void
): Promise<{ extracted: number; skipped: number; total: number }> {
    const result = await enableAntiHarmony(war3Path, onProgress);
    return { extracted: result.extracted, skipped: result.skipped, total: result.total };
}
