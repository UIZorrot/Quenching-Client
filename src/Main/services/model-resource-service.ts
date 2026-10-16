import { getSelectedGameFolder } from './game-channel';
import fs from 'fs-extra';
import path from 'node:path';
import { Storage } from '@jamiephan/casclib';
import { openGameCascStorage, normalizeCascRoot } from './casc-storage';

export type ModelArtSet = 'sd' | 'hd' | 'de';
export interface ModelResourceRequest { path: string; basePath?: string; artSet?: ModelArtSet }
const MAX_BYTES = 64 * 1024 * 1024;
const extensions = new Set(['.mdx', '.mdl', '.blp', '.dds', '.tif', '.tga', '.png', '.jpg', '.jpeg', '.webp']);
function relativeName(value: string) {
  const name = value.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  if (!name || name.startsWith('/') || name.includes(':') || name.includes('\0') || name.split('/').some(p => p === '..'))
    throw new Error('Invalid model resource path');
  return name;
}
function variants(name: string): string[] {
  const ext = path.extname(name).toLowerCase();
  if (!ext) return [name + '.mdx', name + '.blp', name + '.dds'];
  if (!extensions.has(ext)) throw new Error(`Unsupported resource type: ${ext}`);
  if (ext === '.tif') return [name.slice(0, -4) + '.dds', name];
  if (ext === '.mdl') return [name.slice(0, -4) + '.mdx', name];
  if (ext === '.blp') return [name, name.slice(0, -4) + '.dds'];
  if (ext === '.dds') return [name, name.slice(0, -4) + '.blp'];
  return [name];
}
const prefixes = { sd: 'war3.w3mod:', hd: 'war3.w3mod:_hd.w3mod:', de: 'war3.w3mod:_de.w3mod:' };
export function shouldReadLooseResources(request: ModelResourceRequest, prefix: string): boolean {
  // A CASC model's textures must stay in that same art-set layer. A loose HD
  // texture with the same name can otherwise turn a classic preview white.
  if (/^(?:casc:\/\/|war3\.w3mod:)/i.test(request.path) || /^casc:\/\//i.test(request.basePath || '')) return false;
  if (prefix === prefixes.sd && !/^cos[\\/]custom[\\/]/i.test(request.path)) return false;
  return true;
}
export function resourceCandidates(request: ModelResourceRequest) {
  const explicit = request.path.replace(/^casc:\/\//i, '');
  const match = /^(war3\.w3mod:(?:_(?:de|hd)\.w3mod:)?)(.+)$/i.exec(explicit);
  const base = /^(?:casc:\/\/)?(war3\.w3mod:(?:_(?:de|hd)\.w3mod:)?)/i.exec(request.basePath || '');
  const prefix = match?.[1].toLowerCase() || base?.[1].toLowerCase() || prefixes[request.artSet || 'hd'];
  if (!prefix) throw new Error('Invalid model art set');
  const names = variants(relativeName(match?.[2] || explicit));
  // Hive models sometimes omit the folder of shared Warcraft textures.
  // Probe the two stock namespaces directly; never scan the whole CASC index.
  if (names.every(name => !/\.(mdx|mdl)$/i.test(name))) {
    const original = match?.[2] || explicit;
    if (!/[\\/]/.test(original)) {
      for (const folder of ['Textures', 'ReplaceableTextures']) names.push(...variants(`${folder}/${original}`));
    }
    // Older packages use BLP, while current HD/DE stores this shared map as DDS
    // under ReplaceableTextures (including models that name the old Textures path).
    if (/^(?:(?:textures|war3mapimported)[\\/])?environmentmap\.(blp|dds|tif)$/i.test(original)) {
      names.push(...variants(`ReplaceableTextures/EnvironmentMap${path.extname(original)}`));
    }
  }
  const uniqueNames = [...new Map(names.map(name => [name.toLowerCase(), name])).values()];
  // Shared textures may live in the base layer. Never substitute HD for DE.
  const isModel = names.some(name => /\.(mdx|mdl)$/i.test(name));
  const layers = prefix === prefixes.sd || isModel ? [prefix] : [prefix, prefixes.sd];
  return { names: uniqueNames, prefix, casc: layers.flatMap(layer => uniqueNames.map(name => layer + name.replace(/\//g, '\\'))) };
}

/** Reuse one read-only CASC handle; close on app shutdown or installation change. */
export class ModelResourceService {
  constructor(private readonly createStorage = () => new Storage()) {}
  private storage?: Storage;
  private root = '';
  private releasePath?: () => void;
  private opening?: Promise<void>;
  close() { try { this.storage?.close(); } finally {
    this.storage = undefined; this.root = '';
    const release = this.releasePath; this.releasePath = undefined; release?.();
  } }
  async exists(request: ModelResourceRequest, gamePath: string): Promise<boolean> {
    try { await this.read(request, gamePath, true); return true; } catch { return false; }
  }
  async read(request: ModelResourceRequest, gamePath: string, probeOnly = false) {
    if (!request || typeof request.path !== 'string' || request.path.length > 1024) throw new Error('Invalid resource request');
    const localRead = async (file: string) => {
      const stat = await fs.stat(file).catch(() => null);
      if (!stat?.isFile() || stat.size === 0 || stat.size > MAX_BYTES) return null;
      return { bytes: probeOnly ? Buffer.alloc(0) : await fs.readFile(file), resolvedPath: file };
    };
    if (path.isAbsolute(request.path)) {
      for (const candidate of variants(request.path)) { const hit = await localRead(candidate); if (hit) return hit; }
      throw new Error(`External model resource not found: ${request.path}`);
    }
    const candidates = resourceCandidates(request);
    if (request.basePath && path.isAbsolute(request.basePath)) {
      const base = path.dirname(request.basePath);
      for (const name of candidates.names) {
        for (const file of [path.join(base, name), path.join(base, path.basename(name))]) {
          const hit = await localRead(file); if (hit) return hit;
        }
      }
    }
    if (!gamePath) throw new Error('请先配置魔兽争霸安装目录');
    const root = normalizeCascRoot(gamePath);
    const retail = await fs.pathExists(path.join(root, getSelectedGameFolder())) ? path.join(root, getSelectedGameFolder()) : root;
    const layer = candidates.prefix.includes('_de.') ? '_de.w3mod' : candidates.prefix.includes('_hd.') ? '_hd.w3mod' : '';
    if (shouldReadLooseResources(request, candidates.prefix)) {
      for (const name of candidates.names) {
        for (const base of layer ? [path.join(retail, layer), retail] : [retail]) {
          const hit = await localRead(path.join(base, name)); if (hit) return hit;
        }
      }
    }
    while (this.opening) await this.opening;
    if (!this.storage || this.root !== root) {
      const opening = this.opening = (async () => {
        this.close();
        const storage = this.createStorage();
        const access = await openGameCascStorage(storage, root);
        this.releasePath = access.release;
        this.storage = storage; this.root = root;
      })();
      try { await opening; } finally { if (this.opening === opening) this.opening = undefined; }
    }
    for (const candidate of candidates.casc) {
      if (!this.storage.fileExists(candidate)) continue;
      const file = this.storage.openFile(candidate);
      try {
        const size = Number(file.getSize64());
        if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) continue;
        if (probeOnly) return { bytes: Buffer.alloc(0), resolvedPath: `casc://${candidate}` };
        const bytes = file.readAll();
        if (bytes.length !== size) throw new Error('Incomplete CASC resource read');
        return { bytes, resolvedPath: `casc://${candidate}` };
      } finally { file.close(); }
    }
    throw new Error(`Model resource not found (${candidates.prefix}): ${request.path}`);
  }
}
