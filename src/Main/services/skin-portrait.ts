import { SkinArtSet, SkinSections } from '../../shared/skin-versions';
import { modelTextureReferences } from './custom-model-textures';

export interface PortraitAssociation {
  path?: string;
  source: 'official' | 'companion' | 'model' | 'fallback' | 'manual' | 'unavailable';
  rejected: Array<{ path: string; missing: string[] }>;
}
export interface PortraitResources {
  read(path: string): Promise<{ bytes: Buffer; resolvedPath: string }>;
  exists(path: string, basePath: string): Promise<boolean>;
}
const key = (value: string) => value.replace(/\\/g, '/').replace(/\.(mdx|mdl)$/i, '').toLowerCase();
const field = (section: Record<string, string>, name: string, mode: SkinArtSet) => section[`${name}:${mode}`] ?? section[name] ?? '';
export function companionPortraits(model: string): string[] {
  const stem = model.replace(/\.(mdx|mdl)$/i, '');
  return [`${stem}_portrait.mdx`, `${stem}_portrait.mdl`];
}
function hasCamera(bytes: Buffer): boolean {
  if (bytes.toString('ascii', 0, 4) !== 'MDLX') return /\bCamera\s+"/.test(bytes.toString('utf8').replace(/\/\/[^\r\n]*/g, ''));
  for (let pos = 4; pos + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(pos + 4);
    if (pos + 8 + size > bytes.length) return false;
    if (bytes.toString('ascii', pos, pos + 4) === 'CAMS' && size > 0) return true;
    pos += 8 + size;
  }
  return false;
}
/** No copying/exporting stock resources, no cross-art-set model fallback. */
export async function associatePortrait(baseline: SkinSections, targetId: string, mode: SkinArtSet,
  model: string, resources: PortraitResources, explicit?: string): Promise<PortraitAssociation> {
  const rejected: PortraitAssociation['rejected'] = [];
  const checked = new Map<string, Promise<{ valid: boolean; camera: boolean }>>();
  const check = (name: string) => {
    if (!checked.has(name)) checked.set(name, (async () => {
      try {
        const resource = await resources.read(name);
        const modelName = /\.mdl$/i.test(resource.resolvedPath) ? 'model.mdl' : 'model.mdx';
        const missing: string[] = [];
        for (const texture of modelTextureReferences(modelName, resource.bytes)) {
          if (!(await resources.exists(texture, resource.resolvedPath))) missing.push(texture);
        }
        if (missing.length) rejected.push({ path: name, missing });
        return { valid: missing.length === 0, camera: hasCamera(resource.bytes) };
      } catch {
        return { valid: false, camera: false };
      }
    })());
    return checked.get(name)!;
  };
  if (explicit) {
    if (!(await check(explicit)).valid) throw new Error(`肖像模型不可用或缺少贴图: ${explicit}${rejected[0]?.missing.length ? ` (${rejected[0].missing.join(', ')})` : ''}`);
    return { path: explicit, source: 'manual', rejected };
  }
  // Matching the *source* unit is essential: changing Obla to Samuro does not
  // inherit Osam's explicit portrait:de unless we copy that association.
  for (const section of [baseline[targetId], ...Object.values(baseline)].filter(Boolean)) {
    const portrait = field(section, 'portrait', mode);
    if (portrait && key(field(section, 'file', mode)) === key(model) && (await check(portrait)).valid) {
      return { path: portrait, source: 'official', rejected };
    }
  }
  for (const portrait of companionPortraits(model)) {
    if ((await check(portrait)).valid) return { path: portrait, source: 'companion', rejected };
  }
  const own = await check(model);
  if (own.valid && own.camera) return { path: model, source: 'model', rejected };
  const original = baseline[targetId] || {};
  const originalModel = field(original, 'file', mode);
  for (const portrait of [field(original, 'portrait', mode), ...(originalModel ? companionPortraits(originalModel) : [])].filter(Boolean)) {
    if ((await check(portrait)).valid) return { path: portrait, source: 'fallback', rejected };
  }
  return { source: 'unavailable', rejected };
}
