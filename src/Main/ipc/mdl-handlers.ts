import { getSelectedGameFolder } from '../services/game-channel';
import { ipcMain } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { configManager } from '../services/config-manager';
import { AssetSyncService, syncProfileResources } from '../services/asset-sync';
import { getQuenchingResourcePath, resolveModProfile } from '../services/mod-profile';
import { mutateManagedResourceFiles, syncBundledResourceFiles } from '../services/managed-resource-files';

/** 向上查找当前行是否位于指定 MDL 动画块内（如 Rotation N） */
function isInsideMdlBlock(lines: string[], lineIndex: number, headerPattern: RegExp): boolean {
    for (let j = lineIndex - 1; j >= 0; j--) {
        const prev = lines[j].trim();
        const prevLower = prev.toLowerCase();
        if (headerPattern.test(prevLower)) {
            return true;
        }
        if (prev.includes('}')) {
            break;
        }
        if (prev.includes('{') && !headerPattern.test(prevLower)) {
            break;
        }
    }
    return false;
}

const ROTATION_HEADER = /^rotation\s+\d+\b/;
const INTENSITY_HEADER = /^intensity\b/;

/** 亮度等级 1–5 对应 Intensity 乘数（不含 AmbIntensity） */
const LIGHTING_BRIGHTNESS_MULTIPLIERS: readonly number[] = [0.7, 0.9, 1.1, 1.3, 1.5];

function normalizeBrightnessLevel(level: unknown): number {
    const n = typeof level === 'number' ? level : parseInt(String(level), 10);
    if (n >= 1 && n <= 5) return n;
    return 3;
}

function getBrightnessMultiplier(level: unknown): number {
    return LIGHTING_BRIGHTNESS_MULTIPLIERS[normalizeBrightnessLevel(level) - 1];
}

function formatIntensityValue(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
}

function scaleIntensityKeyframeLine(line: string, multiplier: number): string {
    const match = line.trim().match(/^(\d+):\s*([\d.-]+),?$/);
    if (!match) return line;
    const indent = line.match(/^(\t*)/)?.[1] ?? '\t\t';
    const scaled = parseFloat(match[2]) * multiplier;
    return `${indent}${match[1]}: ${formatIntensityValue(scaled)},`;
}

/** 将所有 Intensity（static 与关键帧）乘以亮度系数 */
function applyBrightnessToIntensity(lines: string[], multiplier: number): boolean {
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        if (lowerLine.startsWith('static intensity')) {
            const match = line.match(/static Intensity\s+([\d.-]+)/i);
            if (match) {
                const scaled = parseFloat(match[1]) * multiplier;
                const newVal = `\tstatic Intensity ${formatIntensityValue(scaled)},`;
                if (lines[i] !== newVal) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
            continue;
        }

        const intensityMatch = line.match(/^(\d+):\s*([\d.-]+),?$/);
        if (intensityMatch && isInsideMdlBlock(lines, i, INTENSITY_HEADER)) {
            const newLine = scaleIntensityKeyframeLine(lines[i], multiplier);
            if (newLine !== lines[i]) {
                lines[i] = newLine;
                modified = true;
            }
        }
    }

    return modified;
}

type DncCategory = 'surface' | 'underground';

/** 地表 unit 基准（dnclordaeronunit.mdl） */
const SURFACE_UNIT_BASELINE = {
    ambIntensity: -0.12,
    rotation: { x: 0.25, y: 0.25, z: 0.65, w: 0 },
    intensityKeyframes: [
        '\t\t0: 4,',
        '\t\t14000: 4.5,',
        '\t\t16000: 5,',
        '\t\t44000: 5,',
        '\t\t45000: 6,',
        '\t\t46000: 4.5,',
    ],
    ambColorKeyframes: ['\t\t0:  { 1, 1, 1 },'],
};

/** 地表 terrain 基准（dnclordaeronterrain.mdl）；相对原基准 Intensity 全量 +0.6 */
const SURFACE_TERRAIN_BASELINE = {
    ambIntensity: -0.12,
    rotation: { x: 0.2, y: 0.2, z: 0.5, w: 0 },
    intensityKeyframes: [
        '\t\t0: 4.10,',
        '\t\t14000: 5.10,',
        '\t\t16000: 5.10,',
        '\t\t44000: 5.10,',
        '\t\t45000: 5.60,',
        '\t\t46000: 4.10,',
    ],
    ambColorKeyframes: SURFACE_UNIT_BASELINE.ambColorKeyframes,
};

/**
 * 地表：dnclordaeron 等（zip-env 内多数 DNC 集）
 * 地下：仅 dncunderground / dncdungeon
 */
function getDncCategory(filePath: string): DncCategory {
    const parts = filePath.replace(/\\/g, '/').toLowerCase().split('/');
    const dncIdx = parts.lastIndexOf('dnc');
    if (dncIdx >= 0 && dncIdx + 1 < parts.length) {
        const setName = parts[dncIdx + 1];
        if (setName === 'dncunderground' || setName === 'dncdungeon') {
            return 'underground';
        }
    }
    return 'surface';
}

function getTargetAmbIntensity(category: DncCategory, mode: string): number | null {
    if (mode === 'standard' || mode === 'enhanced') {
        return null;
    }
    if (category === 'surface') {
        if (mode === 'battle') return 0.1;
        if (mode === 'rpg') return -0.12;
    } else {
        if (mode === 'battle') return 0.1;
        if (mode === 'rpg') return -0.2;
    }
    return null;
}

/** 地表 unit 对战光照方向 */
function getSurfaceUnitBattleRotation(): { x: number; y: number; z: number; w: number } {
    return { x: 0.14, y: 0.14, z: 0.7, w: 0 };
}

function formatRotationKeyframe(time: string, quat: { x: number; y: number; z: number; w: number }): string {
    return `\t\t${time}: { ${quat.x}, ${quat.y}, ${quat.z}, ${quat.w} },`;
}

function replaceMdlAnimatedBlock(
    lines: string[],
    headerPattern: RegExp,
    keyframes: string[]
): boolean {
    for (let i = 0; i < lines.length; i++) {
        if (!headerPattern.test(lines[i].trim())) {
            continue;
        }

        let end = i;
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim() === '}') {
                end = j;
                break;
            }
        }

        const interpLine = lines[i + 1]?.includes('Linear') ? lines[i + 1] : '\t\tLinear,';
        const replacement = [lines[i], interpLine, ...keyframes, lines[end]];
        lines.splice(i, end - i + 1, ...replacement);
        return true;
    }
    return false;
}

function applySurfaceBaseline(lines: string[], isUnit: boolean): boolean {
    const baseline = isUnit ? SURFACE_UNIT_BASELINE : SURFACE_TERRAIN_BASELINE;
    let modified = false;

    if (replaceMdlAnimatedBlock(lines, /^Intensity\s+\d+\s*\{/, baseline.intensityKeyframes)) {
        modified = true;
    }
    if (replaceMdlAnimatedBlock(lines, /^AmbColor\s+\d+\s*\{/, baseline.ambColorKeyframes)) {
        modified = true;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        if (lowerLine.startsWith('static ambintensity')) {
            const newVal = `\tstatic AmbIntensity ${baseline.ambIntensity.toFixed(2)},`;
            if (lines[i] !== newVal) {
                lines[i] = newVal;
                modified = true;
            }
        }

        const rotationMatch = line.match(/^(\d+):\s*\{\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\s*\},?$/);
        if (rotationMatch && isInsideMdlBlock(lines, i, ROTATION_HEADER)) {
            const newVal = formatRotationKeyframe(rotationMatch[1], baseline.rotation);
            if (lines[i].trim() !== newVal.trim()) {
                lines[i] = newVal;
                modified = true;
            }
        }
    }

    return modified;
}

export function registerMdlHandlers() {
    /**
     * 更新光照设置
     * @param lightingMode 'standard' | 'enhanced' | 'battle' | 'rpg'
     */
    ipcMain.handle(
        'mdl:update-lighting',
        async (
            event,
            war3Path: string,
            lightingMode: string,
            lightingBrightness?: number,
            previousLightingMode?: string,
            previousLightingBrightness?: number
        ) => {
            try {
                if (!war3Path) {
                    war3Path = configManager.get('war3Path');
                }

                if (!war3Path) {
                    throw new Error('未设置魔兽争霸III路径');
                }

                const brightnessLevel = normalizeBrightnessLevel(lightingBrightness);
                const previousBrightnessLevel = normalizeBrightnessLevel(previousLightingBrightness);
                const brightnessMul = getBrightnessMultiplier(lightingBrightness);
                const brightnessOnly =
                    previousLightingMode === lightingMode &&
                    previousLightingBrightness !== undefined &&
                    previousBrightnessLevel !== brightnessLevel;

                console.log(`[MDL] Updating lighting mode: ${lightingMode}, brightness level: ${brightnessLevel} (Intensity ×${brightnessMul})`);
                console.log(`[MDL] War3 Path: ${war3Path}`);

                const modSettings = configManager.get('modSettings') || {};
                const profile = await resolveModProfile(war3Path, {
                    versionSelection: modSettings.versionSelection,
                    graphicsSelection: modSettings.graphicsSelection,
                    classicMode: modSettings.classicMode === true,
                });

                // 3.0 HD stores each lighting mode as a separate shader set.
                // DE and 2.0 HD intentionally keep one shader set and only patch DNC.
                if (!brightnessOnly && profile.version === 'v30' && profile.graphics === 'hd') {
                    const assetsDir = await AssetSyncService.getAssetsDir();
                    await syncProfileResources(war3Path, path.join(assetsDir, 'quenching'), {
                        ...modSettings,
                        lighting: lightingMode,
                    });
                }

                const dncPath = path.join(war3Path, getSelectedGameFolder(), 'environment', 'dnc');
                // Always rebase on bundled DNC before modifying it. This avoids
                // compounding brightness and keeps the ownership hash current.
                await restoreDncFiles(war3Path);

                if (await fs.pathExists(dncPath)) {
                    console.log(`[MDL] Modifying DNC files in: ${dncPath}`);
                    await mutateManagedResourceFiles(
                        dncPath, '.quenching-dnc-profile',
                        relative => relative.toLowerCase().endsWith('.mdl'),
                        (file, relative) => processMdlFile(file, path.basename(relative), lightingMode, brightnessLevel, {
                            brightnessOnly: false,
                            previousBrightnessLevel,
                            deMode: profile.graphics === 'de',
                            isVersion30: profile.version === 'v30',
                        }),
                    );
                    console.log('[MDL] Modification complete.');
                } else {
                    console.warn(`[MDL] DNC path not found after restore: ${dncPath}`);
                }

                return true;
            } catch (error) {
                console.error('Failed to update MDL lighting:', error);
                throw error;
            }
        }
    );
}

async function restoreDncFiles(war3Path: string) {
    const dncPath = path.join(war3Path, getSelectedGameFolder(), 'environment', 'dnc');

    const modSettings = configManager.get('modSettings') || {};
    const profile = await resolveModProfile(war3Path, {
        versionSelection: modSettings.versionSelection,
        graphicsSelection: modSettings.graphicsSelection,
        classicMode: modSettings.classicMode === true,
    });
    const assetsDir = await AssetSyncService.getAssetsDir();
    const quenchingDir = path.join(assetsDir, 'quenching');
    const dncSource = getQuenchingResourcePath(
        quenchingDir,
        profile.dncPack === 'dnc20' ? 'dnc20' : profile.dncPack === 'dnc30-hd' ? 'dnc30Hd' : 'dnc30De'
    );

    if (!(await fs.pathExists(dncSource))) {
        throw new Error(`[MDL] DNC source not found: ${dncSource}`);
    }

    await syncBundledResourceFiles(dncPath, [{ source: dncSource }], [
        { source: getQuenchingResourcePath(quenchingDir, 'dnc20') },
        { source: getQuenchingResourcePath(quenchingDir, 'dnc30Hd') },
        { source: getQuenchingResourcePath(quenchingDir, 'dnc30De') },
    ], '.quenching-dnc-profile');
    if (!(await fs.pathExists(dncPath))) {
        throw new Error(`[MDL] DNC directory restoration failed: ${dncPath}`);
    }
    console.log(`[MDL] Restored ${profile.dncPack} DNC from ${dncSource}`);
}

async function traverseAndModify(
    dir: string,
    mode: string,
    brightnessLevel: number,
    patchOptions: { brightnessOnly: boolean; previousBrightnessLevel: number; deMode?: boolean; isVersion30?: boolean }
) {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await traverseAndModify(fullPath, mode, brightnessLevel, patchOptions);
        } else if (file.toLowerCase().endsWith('.mdl')) {
            await processMdlFile(fullPath, file, mode, brightnessLevel, patchOptions);
        }
    }
}

async function processMdlFile(
    filePath: string,
    fileName: string,
    mode: string,
    brightnessLevel: number,
    patchOptions: { brightnessOnly: boolean; previousBrightnessLevel: number; deMode?: boolean; isVersion30?: boolean }
) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let modified = false;

    const category = getDncCategory(filePath);
    const lowerName = fileName.toLowerCase();
    const isUnit = lowerName.includes('unit');
    const isTerrain = lowerName.includes('terrain');
    const targetAmb = getTargetAmbIntensity(category, mode);
    let appliedSurfaceBaseline = false;

    if (category === 'surface' && !patchOptions.deMode && !patchOptions.isVersion30) {
        const useUnitBaseline = isUnit && !isTerrain;
        const useTerrainBaseline = isTerrain && !isUnit;
        if (useUnitBaseline || useTerrainBaseline) {
            if (applySurfaceBaseline(lines, useUnitBaseline)) {
                modified = true;
                appliedSurfaceBaseline = true;
            }
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        if (patchOptions.isVersion30 && !patchOptions.brightnessOnly && lowerLine.startsWith('static ambintensity')) {
            const match = line.match(/static\s+AmbIntensity\s+([\d.-]+)/i);
            if (match) {
                const base = parseFloat(match[1]);
                const offset = mode === 'battle' || mode === 'melee' ? 0.03 : mode === 'rpg' ? 0.01 : 0;
                const newVal = `\tstatic AmbIntensity ${formatIntensityValue(base + offset)},`;
                if (lines[i] !== newVal) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
        } else if (!patchOptions.isVersion30 && lowerLine.startsWith('static ambintensity') && targetAmb !== null) {
            const newVal = `\tstatic AmbIntensity ${targetAmb.toFixed(2)},`;
            if (lines[i] !== newVal) {
                lines[i] = newVal;
                modified = true;
            }
        }

        if (patchOptions.isVersion30 && !patchOptions.brightnessOnly && lowerLine.startsWith('static shadowintensity')) {
            const match = line.match(/static\s+ShadowIntensity\s+([\d.-]+)/i);
            if (match) {
                const base = parseFloat(match[1]);
                const multiplier = mode === 'battle' || mode === 'melee' ? 0.66 : mode === 'rpg' ? 1.2 : 1;
                const newVal = `\tstatic ShadowIntensity ${formatIntensityValue(base * multiplier)},`;
                if (lines[i] !== newVal) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
        }

        const rotationMatch = line.match(/^(\d+):\s*\{\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\s*\},?$/);
        if (rotationMatch && !patchOptions.deMode && category === 'surface' && isUnit && !isTerrain && mode === 'battle') {
            if (isInsideMdlBlock(lines, i, ROTATION_HEADER)) {
                const newVal = formatRotationKeyframe(rotationMatch[1], getSurfaceUnitBattleRotation());
                if (lines[i].trim() !== newVal.trim()) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
        }
    }

    const brightnessMul = getBrightnessMultiplier(brightnessLevel);
    let intensityMul = brightnessMul;
    if (patchOptions.brightnessOnly && !appliedSurfaceBaseline) {
        const oldMul = getBrightnessMultiplier(patchOptions.previousBrightnessLevel);
        intensityMul = brightnessMul / oldMul;
    }
    if (applyBrightnessToIntensity(lines, intensityMul)) {
        modified = true;
    }

    if (modified) {
        await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    }
}
