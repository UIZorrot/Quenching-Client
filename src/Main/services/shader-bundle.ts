import fs from 'fs-extra';
import path from 'node:path';
import { rm } from 'node:fs/promises';
import type { ModProfile } from '../../shared/mod-profile';
import { extractZipArchive } from './zip-extraction';

export function shaderBundlePath(quenchingDir: string, pack: ModProfile['shaderPack']): string {
  return path.join(quenchingDir, pack.includes('-legacy-') ? 'shaders-300-legacy.zip' : 'shaders.zip');
}

/** Expand only the selected pack beside the game, never all packs onto the system drive.
 * Loose directories remain supported for development fixtures. Bundled ZIPs take precedence. */
export async function withShaderBundle<T>(
  quenchingDir: string,
  pack: ModProfile['shaderPack'],
  stagingParent: string,
  action: (shaderQuenchingDir: string) => Promise<T>,
): Promise<T> {
  const archive = shaderBundlePath(quenchingDir, pack);
  if (!await fs.pathExists(archive)) return action(quenchingDir);
  await fs.ensureDir(stagingParent);
  const stage = await fs.mkdtemp(path.join(stagingParent, '.quenching-shader-assets-'));
  const packPrefix = `shaders/${pack}/`;
  const fogPrefix = pack.includes('-legacy-') ? 'shaders/fog_shaders-legacy/' : 'shaders/fog_shaders/';
  try {
    await extractZipArchive(archive, stage, { mapFile: name =>
      name.startsWith(packPrefix) || name.startsWith(fogPrefix) ? name : null });
    if (!await fs.pathExists(path.join(stage, 'shaders', pack))) throw new Error(`Shader bundle does not contain ${pack}`);
    return await action(stage);
  } finally {
    await rm(stage, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
  }
}
