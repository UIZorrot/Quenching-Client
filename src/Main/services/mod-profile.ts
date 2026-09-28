import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import {
  DEFAULT_MOD_PROFILE_SELECTION,
  EffectiveGraphics,
  EffectiveVersion,
  GraphicsSelection,
  ModProfile,
  ModProfileSelection,
  VersionSelection,
  normalizeGraphicsSelection,
  normalizeVersionSelection,
} from '../../shared/mod-profile';
import { detectWar3Version } from './war3-version';
import { getSelectedGameChannel } from './game-channel';
import { graphicsFromHdValue, warcraftPreferencesFolder } from '../../shared/war3-preferences';

export type ResourcePathKey =
  | 'dnc20'
  | 'dnc30Hd'
  | 'dnc30De'
  | 'shaders136'
  | 'shaders200'
  | 'shaders203'
  | 'shaders300Hd'
  | 'shaders300De'
  | 'environmentPublic'
  | 'skin';

function versionFromDetected(parts: number[]): EffectiveVersion {
  const [major = 0, minor = 0, patch = 0] = parts;
  if (major >= 3) return 'v30';
  if (major > 2 || (major === 2 && (minor > 0 || patch >= 3))) return 'v203';
  if (major === 2) return 'v20';
  return 'v1';
}

function versionFromSelection(selection: VersionSelection, detected: EffectiveVersion): EffectiveVersion {
  return selection === 'auto' ? detected : selection;
}

async function readHdPreference(): Promise<EffectiveGraphics | null> {
  try {
    const documents = app.getPath('documents');
    const preferencesPath = path.join(documents, warcraftPreferencesFolder(getSelectedGameChannel()), 'War3Preferences.txt');
    if (!(await fs.pathExists(preferencesPath))) return null;
    const content = await fs.readFile(preferencesPath, 'utf8');
    const match = content.match(/(?:^|\n)\s*hd\s*=\s*(\d+)/i);
    return match ? graphicsFromHdValue(match[1]) : null;
  } catch (error: any) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null;
    throw error;
  }
}

async function graphicsFromSelection(selection: GraphicsSelection, classicMode: boolean): Promise<EffectiveGraphics> {
  if (selection !== 'auto') return selection;
  if (classicMode) return 'sd';
  return await readHdPreference() ?? 'hd';
}

export async function resolveModProfile(
  war3Path: string,
  selection?: Partial<ModProfileSelection> & { classicMode?: boolean }
): Promise<ModProfile> {
  const detected = await detectWar3Version(war3Path);
  const versionSelection = normalizeVersionSelection(selection?.versionSelection ?? DEFAULT_MOD_PROFILE_SELECTION.versionSelection);
  const graphicsSelection = normalizeGraphicsSelection(selection?.graphicsSelection ?? DEFAULT_MOD_PROFILE_SELECTION.graphicsSelection);
  const version = versionFromSelection(versionSelection, versionFromDetected(detected.parts));
  let graphics = await graphicsFromSelection(graphicsSelection, selection?.classicMode === true);

  // A saved DE choice must not silently install 3.0 shaders into a 2.x game.
  if (graphics === 'de' && version !== 'v30') {
    graphics = 'hd';
  }

  const is3 = version === 'v30';
  const isDe = is3 && graphics === 'de';
  const shaderPack = is3
    ? (isDe ? 'shaders-300-de' : 'shaders-300-hd')
    : version === 'v1'
      ? 'shaders136'
      : version === 'v20'
        ? 'shaders200'
        : 'shaders203';
  const dncPack = is3 ? (isDe ? 'dnc30-de' : 'dnc30-hd') : 'dnc20';

  return {
    versionSelection,
    graphicsSelection,
    version,
    graphics,
    usesPublicEnvironment: !isDe,
    shaderPack,
    dncPack,
  };
}

export function getQuenchingResourcePath(quenchingDir: string, key: ResourcePathKey): string {
  const paths: Record<ResourcePathKey, string> = {
    dnc20: path.join(quenchingDir, 'dnc', 'dnc20'),
    dnc30Hd: path.join(quenchingDir, 'dnc', 'dnc30-hd'),
    dnc30De: path.join(quenchingDir, 'dnc', 'dnc30-de'),
    shaders136: path.join(quenchingDir, 'shaders', 'shaders136'),
    shaders200: path.join(quenchingDir, 'shaders', 'shaders200'),
    shaders203: path.join(quenchingDir, 'shaders', 'shaders203'),
    shaders300Hd: path.join(quenchingDir, 'shaders', 'shaders-300-hd'),
    shaders300De: path.join(quenchingDir, 'shaders', 'shaders-300-de'),
    environmentPublic: path.join(quenchingDir, 'env-20-30-public.zip'),
    skin: path.join(quenchingDir, 'skin'),
  };
  return paths[key];
}

export function getShaderResourcePath(quenchingDir: string, profile: ModProfile, lighting: string = 'standard'): string {
  const root = getQuenchingResourcePath(quenchingDir, profile.shaderPack === 'shaders136'
    ? 'shaders136'
    : profile.shaderPack === 'shaders200'
      ? 'shaders200'
      : profile.shaderPack === 'shaders203'
        ? 'shaders203'
        : profile.shaderPack === 'shaders-300-de'
          ? 'shaders300De'
          : 'shaders300Hd');
  if (profile.shaderPack === 'shaders-300-hd') {
    const folder = lighting === 'battle' ? 'melee' : lighting === 'rpg' ? 'rpg' : 'standard';
    return path.join(root, 'ps', folder);
  }
  return root;
}

export function getSelectedShaderLabel(profile: ModProfile): string {
  return profile.shaderPack;
}
