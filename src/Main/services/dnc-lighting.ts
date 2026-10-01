import fs from 'fs-extra';
import path from 'path';

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

export function normalizeBrightnessLevel(level: unknown): number {
    const n = typeof level === 'number' ? level : parseInt(String(level), 10);
    if (n >= 1 && n <= 5) return n;
    return 3;
}

export function getBrightnessMultiplier(level: unknown): number {
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
export function applyBrightnessToIntensity(lines: string[], multiplier: number): boolean {
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

export interface DncLightingOptions {
    deMode?: boolean;
    isVersion30?: boolean;
}

async function patchDncMdlFile(filePath: string, mode: string, brightnessLevel: number, options: DncLightingOptions) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let modified = false;

    const category = getDncCategory(filePath);
    const lowerName = path.basename(filePath).toLowerCase();
    const isUnit = lowerName.includes('unit');
    const isTerrain = lowerName.includes('terrain');
    const targetAmb = getTargetAmbIntensity(category, mode);
    const isBattle = mode === 'battle' || mode === 'melee';

    if (category === 'surface' && !options.deMode && !options.isVersion30) {
        const useUnitBaseline = isUnit && !isTerrain;
        const useTerrainBaseline = isTerrain && !isUnit;
        if ((useUnitBaseline || useTerrainBaseline) && applySurfaceBaseline(lines, useUnitBaseline)) {
            modified = true;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();

        if (options.isVersion30 && lowerLine.startsWith('static ambintensity')) {
            const match = line.match(/static\s+AmbIntensity\s+([\d.-]+)/i);
            if (match) {
                const base = parseFloat(match[1]);
                const offset = isBattle ? (options.deMode ? 0.03 : 0.05) : mode === 'rpg' ? 0.01 : 0;
                const newVal = `\tstatic AmbIntensity ${formatIntensityValue(base + offset)},`;
                if (lines[i] !== newVal) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
        } else if (!options.isVersion30 && lowerLine.startsWith('static ambintensity') && targetAmb !== null) {
            const newVal = `\tstatic AmbIntensity ${targetAmb.toFixed(2)},`;
            if (lines[i] !== newVal) {
                lines[i] = newVal;
                modified = true;
            }
        }

        if (options.isVersion30 && lowerLine.startsWith('static shadowintensity')) {
            const match = line.match(/static\s+ShadowIntensity\s+([\d.-]+)/i);
            if (match) {
                const base = parseFloat(match[1]);
                const multiplier = isBattle ? (options.deMode ? 0.66 : 1) : mode === 'rpg' ? 1.2 : 1;
                const newVal = `\tstatic ShadowIntensity ${formatIntensityValue(base * multiplier)},`;
                if (lines[i] !== newVal) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
        }

        const rotationMatch = line.match(/^(\d+):\s*\{\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\s*\},?$/);
        if (rotationMatch && !options.deMode && !options.isVersion30 && category === 'surface' && isUnit && !isTerrain && mode === 'battle') {
            if (isInsideMdlBlock(lines, i, ROTATION_HEADER)) {
                const newVal = formatRotationKeyframe(rotationMatch[1], getSurfaceUnitBattleRotation());
                if (lines[i].trim() !== newVal.trim()) {
                    lines[i] = newVal;
                    modified = true;
                }
            }
        }
    }

    if (applyBrightnessToIntensity(lines, getBrightnessMultiplier(brightnessLevel))) {
        modified = true;
    }

    if (modified) {
        await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    }
}

async function listMdlFiles(dir: string): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...await listMdlFiles(full));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mdl')) found.push(full);
    }
    return found;
}

/** Patch a freshly restored DNC directory for the lighting mode and brightness level. */
export async function applyDncLighting(dncDir: string, mode: string, brightnessLevel: unknown, options: DncLightingOptions): Promise<void> {
    if (!(await fs.pathExists(dncDir))) return;
    const level = normalizeBrightnessLevel(brightnessLevel);
    for (const file of await listMdlFiles(dncDir)) await patchDncMdlFile(file, mode, level, options);
}
