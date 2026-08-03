import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Shaders for War3 < 2.0.0 (from 1.8/ps.zip) */
export const SHADER_ZIP_PRE200 = 'shaders1.xx.zip';
/** Shaders for War3 >= 2.0.0 and < 2.0.3 */
export const SHADER_ZIP_LEGACY = 'shaders2.02.zip';
/** Shaders for War3 >= 2.0.3 */
export const SHADER_ZIP_MODERN = 'shaders2.03.zip';

export type ShaderZipName =
    | typeof SHADER_ZIP_PRE200
    | typeof SHADER_ZIP_LEGACY
    | typeof SHADER_ZIP_MODERN;

/** Marker written inside `_retail_/shaders` (moves with classic QMoff park). */
export const SHADER_PACK_MARKER = '.quenching-shader-pack';

/** Versions strictly below this use shaders1.xx.zip. */
const PRE200_THRESHOLD: [number, number, number] = [2, 0, 0];
/** Versions strictly below this (and >= 2.0.0) use shaders2.02.zip. */
const LEGACY_THRESHOLD: [number, number, number] = [2, 0, 3];

export type War3VersionInfo = {
    version: string;
    parts: number[];
    source: 'build.info' | 'exe' | 'unknown';
    /** true when version < 2.0.3 (uses shaders1.xx or shaders2.02). */
    useLegacyShaders: boolean;
    /** true when version < 2.0.0 (uses shaders1.xx.zip). */
    usePre200Shaders: boolean;
    shaderZip: ShaderZipName;
};

function normalizeWar3Root(war3Path: string): string {
    return path.normalize(war3Path.replace(/\\/g, '/').replace(/\/$/, ''));
}

export function parseVersionParts(version: string): number[] {
    const cleaned = String(version || '')
        .trim()
        .replace(/^[vV]/, '')
        .split(/[^\d]+/)
        .filter(Boolean)
        .map((n) => Number.parseInt(n, 10))
        .filter((n) => Number.isFinite(n));
    return cleaned.length > 0 ? cleaned : [0];
}

function isVersionBelow(version: string | null | undefined, threshold: [number, number, number]): boolean {
    if (!version) {
        return false;
    }
    const parts = parseVersionParts(version);
    for (let i = 0; i < threshold.length; i++) {
        const a = parts[i] ?? 0;
        const b = threshold[i];
        if (a < b) return true;
        if (a > b) return false;
    }
    return false;
}

/** true when version < 2.0.0 */
export function isPre200War3Version(version: string | null | undefined): boolean {
    return isVersionBelow(version, PRE200_THRESHOLD);
}

/** true when version < 2.0.3 (includes pre-2.0.0) */
export function isLegacyWar3Version(version: string | null | undefined): boolean {
    return isVersionBelow(version, LEGACY_THRESHOLD);
}

export function getShaderZipForVersion(version: string | null | undefined): ShaderZipName {
    if (isPre200War3Version(version)) {
        return SHADER_ZIP_PRE200;
    }
    if (isLegacyWar3Version(version)) {
        return SHADER_ZIP_LEGACY;
    }
    return SHADER_ZIP_MODERN;
}

async function readVersionFromBuildInfo(war3Path: string): Promise<string | null> {
    const root = normalizeWar3Root(war3Path);
    const candidates = [path.join(root, '.build.info'), path.join(root, '_retail_', '.build.info')];

    for (const buildInfoPath of candidates) {
        if (!(await fs.pathExists(buildInfoPath))) {
            continue;
        }
        try {
            const raw = await fs.readFile(buildInfoPath, 'utf-8');
            const lines = raw.split(/\r?\n/).filter((l) => l.trim());
            if (lines.length < 2) {
                continue;
            }
            const headers = lines[0].split('|').map((h) => h.split('!')[0].trim().toLowerCase());
            const versionIdx = headers.findIndex((h) => h === 'version');
            if (versionIdx < 0) {
                continue;
            }
            // Prefer the active row (Active=1) when present.
            const activeIdx = headers.findIndex((h) => h === 'active');
            let dataLine = lines[1];
            if (activeIdx >= 0) {
                const activeRow = lines.slice(1).find((line) => {
                    const cols = line.split('|');
                    return (cols[activeIdx] || '').trim() === '1';
                });
                if (activeRow) {
                    dataLine = activeRow;
                }
            }
            const version = (dataLine.split('|')[versionIdx] || '').trim();
            if (version) {
                return version;
            }
        } catch (error) {
            console.warn(`[War3Version] Failed to parse ${buildInfoPath}:`, error);
        }
    }
    return null;
}

function getExeCandidates(war3Path: string): string[] {
    const root = normalizeWar3Root(war3Path);
    return [
        path.join(root, '_retail_', 'x86_64', 'Warcraft III.exe'),
        path.join(root, 'x86_64', 'Warcraft III.exe'),
        path.join(root, '_retail_', 'Warcraft III.exe'),
        path.join(root, 'Warcraft III.exe'),
        path.join(root, 'War3.exe'),
    ];
}

async function readVersionFromExe(war3Path: string): Promise<string | null> {
    if (process.platform !== 'win32') {
        return null;
    }

    for (const exePath of getExeCandidates(war3Path)) {
        if (!(await fs.pathExists(exePath))) {
            continue;
        }
        try {
            const escaped = exePath.replace(/'/g, "''");
            const { stdout } = await execFileAsync(
                'powershell.exe',
                [
                    '-NoProfile',
                    '-NonInteractive',
                    '-Command',
                    `[System.Diagnostics.FileVersionInfo]::GetVersionInfo('${escaped}').FileVersion`,
                ],
                { windowsHide: true, timeout: 15000 }
            );
            const version = String(stdout || '').trim();
            if (version) {
                return version;
            }
        } catch (error) {
            console.warn(`[War3Version] Failed to read EXE version from ${exePath}:`, error);
        }
    }
    return null;
}

export async function detectWar3Version(war3Path: string | undefined | null): Promise<War3VersionInfo> {
    if (!war3Path) {
        return {
            version: '',
            parts: [0],
            source: 'unknown',
            useLegacyShaders: false,
            usePre200Shaders: false,
            shaderZip: SHADER_ZIP_MODERN,
        };
    }

    const fromBuild = await readVersionFromBuildInfo(war3Path);
    if (fromBuild) {
        return {
            version: fromBuild,
            parts: parseVersionParts(fromBuild),
            source: 'build.info',
            useLegacyShaders: isLegacyWar3Version(fromBuild),
            usePre200Shaders: isPre200War3Version(fromBuild),
            shaderZip: getShaderZipForVersion(fromBuild),
        };
    }

    const fromExe = await readVersionFromExe(war3Path);
    if (fromExe) {
        return {
            version: fromExe,
            parts: parseVersionParts(fromExe),
            source: 'exe',
            useLegacyShaders: isLegacyWar3Version(fromExe),
            usePre200Shaders: isPre200War3Version(fromExe),
            shaderZip: getShaderZipForVersion(fromExe),
        };
    }

    console.warn(`[War3Version] Could not detect version for: ${war3Path}; defaulting to ${SHADER_ZIP_MODERN}`);
    return {
        version: '',
        parts: [0],
        source: 'unknown',
        useLegacyShaders: false,
        usePre200Shaders: false,
        shaderZip: SHADER_ZIP_MODERN,
    };
}

export async function resolveShaderZipName(war3Path: string): Promise<ShaderZipName> {
    const info = await detectWar3Version(war3Path);
    const tier = info.usePre200Shaders
        ? ' [pre-2.0.0]'
        : info.useLegacyShaders
          ? ' [2.0.0�C2.0.2]'
          : ' [>= 2.0.3]';
    console.log(`[War3Version] ${info.version || 'unknown'} (${info.source}) �� ${info.shaderZip}${tier}`);
    return info.shaderZip;
}

export async function readShaderPackMarker(shadersDir: string): Promise<string | null> {
    const markerPath = path.join(shadersDir, SHADER_PACK_MARKER);
    if (!(await fs.pathExists(markerPath))) {
        return null;
    }
    try {
        return (await fs.readFile(markerPath, 'utf-8')).trim() || null;
    } catch {
        return null;
    }
}

export async function writeShaderPackMarker(shadersDir: string, zipName: string): Promise<void> {
    await fs.ensureDir(shadersDir);
    await fs.writeFile(path.join(shadersDir, SHADER_PACK_MARKER), `${zipName}\n`, 'utf-8');
}

export async function isShaderPackCurrent(shadersDir: string, expectedZip: string): Promise<boolean> {
    if (!(await fs.pathExists(shadersDir))) {
        return false;
    }
    const marker = await readShaderPackMarker(shadersDir);
    return marker === expectedZip;
}
