export type VersionSelection = 'auto' | 'v1' | 'v20' | 'v203' | 'v30' | 'v301';
export type GraphicsSelection = 'sd' | 'hd' | 'de';

export type EffectiveVersion = 'v1' | 'v20' | 'v203' | 'v30' | 'v301';
export type EffectiveGraphics = 'sd' | 'hd' | 'de';

export type LightingSelection = 'standard' | 'battle' | 'rpg';

export interface ModProfileSelection {
  versionSelection: VersionSelection;
  graphicsSelection: GraphicsSelection;
}

export interface ModProfile extends ModProfileSelection {
  version: EffectiveVersion;
  graphics: EffectiveGraphics;
  usesPublicEnvironment: boolean;
  shaderPack: 'shaders136' | 'shaders200' | 'shaders203' | 'shaders-300-hd' | 'shaders-300-de' | 'shaders-ptr-hd' | 'shaders-ptr-de' | 'shaders-300-legacy-hd' | 'shaders-300-legacy-de';
  dncPack: 'dnc20' | 'dnc30-hd' | 'dnc30-de' | 'dnc30-de-rpg';
}

export const DEFAULT_MOD_PROFILE_SELECTION: ModProfileSelection = {
  versionSelection: 'auto',
  graphicsSelection: 'hd',
};

export function isHdGraphics(graphics: EffectiveGraphics): boolean {
  return graphics === 'hd' || graphics === 'de';
}

export function canUseRetroSkin(graphics: EffectiveGraphics): boolean {
  return graphics === 'hd';
}

export function isVersion30OrLater(version: unknown): boolean {
  return version === 'v30' || version === 'v301';
}

export function isHdShaderPack(pack: ModProfile['shaderPack']): boolean {
  return pack === 'shaders-300-hd' || pack === 'shaders-ptr-hd' || pack === 'shaders-300-legacy-hd';
}

export function normalizeVersionSelection(value: unknown): VersionSelection {
  return value === 'v1' || value === 'v20' || value === 'v203' || value === 'v30' || value === 'v301' || value === 'auto'
    ? value
    : 'auto';
}

export function normalizeGraphicsSelection(value: unknown): GraphicsSelection {
  return value === 'sd' || value === 'hd' || value === 'de'
    ? value
    : 'hd';
}
