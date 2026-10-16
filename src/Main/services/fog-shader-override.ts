import fs from 'fs-extra';
import path from 'path';
import type { ModProfile } from '../../shared/mod-profile';
import { isHdShaderPack } from '../../shared/mod-profile';
import { normalizeBrightnessLevel } from './dnc-lighting';

export const OBJECT_SHADER_FILES = [
    'ps/cliffblightmiscterrain.bls',
    'ps/foliage.bls',
    'ps/hd.bls',
    'ps/sd_on_hd.bls',
    'ps/terrain.bls',
    'vs/cliffblightmiscterrain.bls',
    'vs/foliage.bls',
    'vs/hd.bls',
    'vs/terrain.bls',
];

/** 后处理阴影：体积雾和色彩校正，不含辉光。 */
export const POST_PROCESSING_SHADOW_FILES = [
    'ps/fog.bls',
    'ps/volumetricfog.bls',
    // Kept for supported legacy packs which use tonemap instead.
    'ps/tonemap.bls',
];

/** 后处理辉光：只控制两份 Bloom 和 Gaussian Blur。 */
export const POST_PROCESSING_GLOW_FILES = [
    'ps/bloomcombine.bls',
    'ps/bloomextract.bls',
    'ps/gaussianblur.bls',
];

export const POST_PROCESSING_FILES = [
    ...POST_PROCESSING_SHADOW_FILES,
    ...POST_PROCESSING_GLOW_FILES,
];

const FOG_FILES = ['fog.bls', 'volumetricfog.bls'];

/** fog_shaders variant for 3.0 HD, or null to keep the pack's own fog. */
export function pickFogVariant(
    profile: Pick<ModProfile, 'graphics' | 'shaderPack'>,
    lighting: unknown,
    brightnessLevel: unknown,
): string | null {
    if (profile.graphics !== 'hd' || !['shaders-300-hd', 'shaders-300-legacy-hd'].includes(profile.shaderPack)) return null;
    const level = normalizeBrightnessLevel(brightnessLevel);
    const mode = typeof lighting === 'string' && lighting ? lighting : 'standard';
    if (mode === 'battle') return level >= 4 ? 'brightness_3' : 'brightness_2';
    if (mode === 'standard' || mode === 'rpg') return level >= 4 ? 'brightness_2' : null;
    return null;
}

/**
 * Runs after every shader install. Shadow and glow are independent:
 * shadow off removes fog and tonemap, glow off removes the two bloom shaders and gaussian blur.
 */
export async function applyPostProcessingShaders(
    shadersDir: string,
    quenchingDir: string,
    profile: Pick<ModProfile, 'graphics' | 'shaderPack'>,
    modSettings: any,
): Promise<void> {
    if (modSettings?.postProcessing === false) {
        for (const file of POST_PROCESSING_SHADOW_FILES) await fs.remove(path.join(shadersDir, file));
    }
    if (modSettings?.postProcessingGlow === false) {
        for (const file of POST_PROCESSING_GLOW_FILES) await fs.remove(path.join(shadersDir, file));
    }
    if (modSettings?.postProcessing === false) return;
    const variant = pickFogVariant(profile, modSettings?.lighting, modSettings?.lightingBrightness);
    if (!variant) return;
    const sourceDir = path.join(quenchingDir, 'shaders', profile.shaderPack === 'shaders-300-legacy-hd' ? 'fog_shaders-legacy' : 'fog_shaders', variant, 'ps');
    for (const file of FOG_FILES) {
        const source = path.join(sourceDir, file);
        if (!(await fs.pathExists(source))) throw new Error(`Fog shader missing: ${source}`);
        await fs.copy(source, path.join(shadersDir, 'ps', file), { overwrite: true });
    }
    console.log(`[Shader] Fog override: ${variant}`);
}

/** After a full shader reinstall: re-apply the object shader and post-processing switches. */
export async function applyShaderToggles(
    shadersDir: string,
    quenchingDir: string,
    profile: Pick<ModProfile, 'graphics' | 'shaderPack'>,
    modSettings: any,
): Promise<void> {
    if (modSettings?.objectShader === false) {
        for (const file of OBJECT_SHADER_FILES) await fs.remove(path.join(shadersDir, file));
    }
  await applyPostProcessingShaders(shadersDir, quenchingDir, profile, modSettings);
}

/** Apply the compatibility override last, without resurrecting disabled glow. */
export async function applyIntelAmdBloomForProfile(
    shadersDir: string, shaderSource: string, profile: ModProfile, modSettings: any,
): Promise<void> {
    if (modSettings?.useIntelAmdShaderFix !== true || modSettings?.postProcessingGlow === false) return;
    const source = path.join(shaderSource, ...(isHdShaderPack(profile.shaderPack) ? [] : ['ps']), 'bloomextract.bls');
    if (!await fs.pathExists(source)) throw new Error(`Intel/AMD bloom fix resource missing: ${source}`);
    await fs.copy(source, path.join(shadersDir, 'ps', 'bloomextract.bls'), { overwrite: true });
}
