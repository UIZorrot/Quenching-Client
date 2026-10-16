import path from 'path';
import {
  DEFAULT_MOD_PROFILE_SELECTION,
  EffectiveGraphics,
  EffectiveVersion,
  ModProfile,
  ModProfileSelection,
  VersionSelection,
  normalizeGraphicsSelection,
  normalizeVersionSelection,
  isVersion30OrLater,
  isHdShaderPack,
} from '../../shared/mod-profile';
import { detectWar3Version } from './war3-version';
import { getSelectedGameChannel } from './game-channel';

export type ResourcePathKey =
  | 'dnc20'
  | 'dnc30Hd'
  | 'dnc30De'
  | 'dnc30DeRpg'
  | 'shaders136'
  | 'shaders200'
  | 'shaders203'
  | 'shaders300Hd'
  | 'shaders300De'
  | 'shadersPtrHd'
  | 'shadersPtrDe'
  | 'shaders300LegacyHd'
  | 'shaders300LegacyDe'
  | 'environmentPublic'
  | 'skin';

function versionFromDetected(parts: number[]): EffectiveVersion {
  const [major = 0, minor = 0, patch = 0] = parts;
  if (major > 3 || (major === 3 && (minor > 0 || patch >= 1))) return 'v301';
  if (major === 3) return 'v30';
  if (major > 2 || (major === 2 && (minor > 0 || patch >= 3))) return 'v203';
  if (major === 2) return 'v20';
  return 'v1';
}

function versionFromSelection(selection: VersionSelection, detected: EffectiveVersion): EffectiveVersion {
  return selection === 'auto' ? detected : selection;
}

export async function resolveModProfile(
  war3Path: string,
  selection?: Partial<ModProfileSelection> & { classicMode?: boolean; lighting?: string }
): Promise<ModProfile> {
  const detected = await detectWar3Version(war3Path);
  const versionSelection = normalizeVersionSelection(selection?.versionSelection ?? DEFAULT_MOD_PROFILE_SELECTION.versionSelection);
  const graphicsSelection = normalizeGraphicsSelection(selection?.graphicsSelection ?? DEFAULT_MOD_PROFILE_SELECTION.graphicsSelection);
  const version = versionFromSelection(versionSelection, versionFromDetected(detected.parts));
  let graphics: EffectiveGraphics = selection?.classicMode === true ? 'sd' : graphicsSelection;

  // A saved DE choice must not silently install 3.0 shaders into a 2.x game.
  if (graphics === 'de' && !isVersion30OrLater(version)) {
    graphics = 'hd';
  }

  const is3 = isVersion30OrLater(version);
  const isDe = is3 && graphics === 'de';
  // DE RPG lighting keeps the DE shaders but uses a brightened HD DNC and the public environment.
  const deRpg = isDe && selection?.lighting === 'rpg';
  const shaderPack = version === 'v30'
    ? (isDe ? 'shaders-300-legacy-de' : 'shaders-300-legacy-hd')
    : is3
    ? (getSelectedGameChannel() === 'ptr'
      ? (isDe ? 'shaders-ptr-de' : 'shaders-ptr-hd')
      : (isDe ? 'shaders-300-de' : 'shaders-300-hd'))
    : version === 'v1'
      ? 'shaders136'
      : version === 'v20'
        ? 'shaders200'
        : 'shaders203';
  const dncPack = is3 ? (deRpg ? 'dnc30-de-rpg' : isDe ? 'dnc30-de' : 'dnc30-hd') : 'dnc20';

  return {
    versionSelection,
    graphicsSelection,
    version,
    graphics,
    usesPublicEnvironment: !isDe || deRpg,
    shaderPack,
    dncPack,
  };
}

export function getQuenchingResourcePath(quenchingDir: string, key: ResourcePathKey): string {
  const paths: Record<ResourcePathKey, string> = {
    dnc20: path.join(quenchingDir, 'dnc', 'dnc20'),
    dnc30Hd: path.join(quenchingDir, 'dnc', 'dnc30-hd'),
    dnc30De: path.join(quenchingDir, 'dnc', 'dnc30-de'),
    dnc30DeRpg: path.join(quenchingDir, 'dnc', 'dnc30-de-rpg'),
    shaders136: path.join(quenchingDir, 'shaders', 'shaders136'),
    shaders200: path.join(quenchingDir, 'shaders', 'shaders200'),
    shaders203: path.join(quenchingDir, 'shaders', 'shaders203'),
    shaders300Hd: path.join(quenchingDir, 'shaders', 'shaders-300-hd'),
    shaders300De: path.join(quenchingDir, 'shaders', 'shaders-300-de'),
    shadersPtrHd: path.join(quenchingDir, 'shaders', 'shaders-ptr-hd'),
    shadersPtrDe: path.join(quenchingDir, 'shaders', 'shaders-ptr-de'),
    shaders300LegacyHd: path.join(quenchingDir, 'shaders', 'shaders-300-legacy-hd'),
    shaders300LegacyDe: path.join(quenchingDir, 'shaders', 'shaders-300-legacy-de'),
    environmentPublic: path.join(quenchingDir, 'env-20-30-public.zip'),
    skin: path.join(quenchingDir, 'skin'),
  };
  return paths[key];
}

export function getShaderResourcePath(quenchingDir: string, profile: ModProfile, lighting: string = 'standard'): string {
  const root = getQuenchingResourcePath(quenchingDir, profile.shaderPack === 'shaders-300-legacy-hd'
    ? 'shaders300LegacyHd'
    : profile.shaderPack === 'shaders-300-legacy-de'
    ? 'shaders300LegacyDe'
    : profile.shaderPack === 'shaders136'
    ? 'shaders136'
    : profile.shaderPack === 'shaders200'
      ? 'shaders200'
      : profile.shaderPack === 'shaders203'
        ? 'shaders203'
        : profile.shaderPack === 'shaders-300-de'
          ? 'shaders300De'
          : profile.shaderPack === 'shaders-ptr-de'
            ? 'shadersPtrDe'
            : profile.shaderPack === 'shaders-ptr-hd'
              ? 'shadersPtrHd'
              : 'shaders300Hd');
  if (isHdShaderPack(profile.shaderPack)) {
    const effective = effectiveLightingMode(profile, lighting);
    // Retail 3.0 and PTR both ship standard, melee and RPG shader sets.
    const folder = effective === 'rpg' ? 'rpg'
      : effective === 'battle' ? 'melee'
      : 'standard';
    return path.join(root, 'ps', folder);
  }
  return root;
}

export function getShaderPackRoot(quenchingDir: string, profile: Pick<ModProfile, 'shaderPack'>): string {
  return path.join(quenchingDir, 'shaders', profile.shaderPack);
}

/** DE RPG patches its DNC as standard lighting. */
export function effectiveLightingMode(profile: ModProfile, lighting: string = 'standard'): string {
  return profile.dncPack === 'dnc30-de-rpg' ? 'standard' : lighting;
}

export function getDncResourcePath(quenchingDir: string, profile: ModProfile): string {
  const keys: Record<ModProfile['dncPack'], ResourcePathKey> = {
    'dnc20': 'dnc20',
    'dnc30-hd': 'dnc30Hd',
    'dnc30-de': 'dnc30De',
    'dnc30-de-rpg': 'dnc30DeRpg',
  };
  return getQuenchingResourcePath(quenchingDir, keys[profile.dncPack]);
}

export function getKnownDncRoots(quenchingDir: string): Array<{ source: string }> {
  return (['dnc20', 'dnc30Hd', 'dnc30De', 'dnc30DeRpg'] as const)
    .map((key) => ({ source: getQuenchingResourcePath(quenchingDir, key) }));
}

export function getSelectedShaderLabel(profile: ModProfile): string {
  return profile.shaderPack;
}
