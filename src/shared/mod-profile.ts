export type VersionSelection = 'auto' | 'v1' | 'v20' | 'v203' | 'v30';
export type GraphicsSelection = 'auto' | 'sd' | 'hd' | 'de';

export type EffectiveVersion = 'v1' | 'v20' | 'v203' | 'v30';
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
  shaderPack: 'shaders136' | 'shaders200' | 'shaders203' | 'shaders-300-hd' | 'shaders-300-de';
  dncPack: 'dnc20' | 'dnc30-hd' | 'dnc30-de';
}

export const DEFAULT_MOD_PROFILE_SELECTION: ModProfileSelection = {
  versionSelection: 'auto',
  graphicsSelection: 'auto',
};

export function isHdGraphics(graphics: EffectiveGraphics): boolean {
  return graphics === 'hd' || graphics === 'de';
}

export function canUseRetroSkin(graphics: EffectiveGraphics): boolean {
  return graphics === 'hd';
}

export function normalizeVersionSelection(value: unknown): VersionSelection {
  return value === 'v1' || value === 'v20' || value === 'v203' || value === 'v30' || value === 'auto'
    ? value
    : 'auto';
}

export function normalizeGraphicsSelection(value: unknown): GraphicsSelection {
  return value === 'sd' || value === 'hd' || value === 'de' || value === 'auto'
    ? value
    : 'auto';
}
