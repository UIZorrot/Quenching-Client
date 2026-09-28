import { getSelectedGameFolder } from './game-channel';
import fs from 'fs-extra';
import path from 'node:path';
import { Storage } from '@jamiephan/casclib';

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
export function resourceCandidates(request: ModelResourceRequest) {
  const explicit = request.path.replace(/^casc:\/\//i, '');
  const match = /^(war3\.w3mod:(?:_(?:de|hd)\.w3mod:)?)(.+)$/i.exec(explicit);
  const base = /^(?:casc:\/\/)?(war3\.w3mod:(?:_(?:de|hd)\.w3mod:)?)/i.exec(request.basePath || '');
  const prefix = match?.[1].toLowerCase() || base?.[1].toLowerCase() || prefixes[request.artSet || 'hd'];
  if (!prefix) throw new Error('Invalid model art set');
  const names = variants(relativeName(match?.[2] || explicit));
  // Shared textures may live in the base layer. Never substitute HD for DE.
  const isModel = names.some(name => /\.(mdx|mdl)$/i.test(name));
  const layers = prefix === prefixes.sd || isModel ? [prefix] : [prefix, prefixes.sd];
  return { names, prefix, casc: layers.flatMap(layer => names.map(name => layer + name.replace(/\//g, '\\'))) };
}

/** Reuse one read-only CASC handle; close on app shutdown or installation change. */
export class ModelResourceService {
  private storage?: Storage;
  private root = '';
  close() { try { this.storage?.close(); } finally { this.storage = undefined; this.root = ''; } }
  async read(request: ModelResourceRequest, gamePath: string) {
    if (!request || typeof request.path !== 'string' || request.path.length > 1024) throw new Error('Invalid resource request');
    const localRead = async (file: string) => {
      const stat = await fs.stat(file).catch(() => null);
      if (!stat?.isFile() || stat.size === 0 || stat.size > MAX_BYTES) return null;
      return { bytes: await fs.readFile(file), resolvedPath: file };
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
    const root = ['_retail_', '_ptr_'].includes(path.basename(gamePath).toLowerCase()) ? path.dirname(gamePath) : gamePath;
    const retail = await fs.pathExists(path.join(root, getSelectedGameFolder())) ? path.join(root, getSelectedGameFolder()) : root;
    const layer = candidates.prefix.includes('_de.') ? '_de.w3mod' : candidates.prefix.includes('_hd.') ? '_hd.w3mod' : '';
    for (const name of candidates.names) {
      for (const base of layer ? [path.join(retail, layer), retail] : [retail]) {
        const hit = await localRead(path.join(base, name)); if (hit) return hit;
      }
    }
    if (!this.storage || this.root !== root) {
      this.close();
      const storage = new Storage();
      try { storage.open(root + '*w3'); } catch (error) { try { storage.close(); } catch {} throw error; }
      this.storage = storage; this.root = root;
    }
    for (const candidate of candidates.casc) {
      if (!this.storage.fileExists(candidate)) continue;
      const file = this.storage.openFile(candidate);
      try {
        const size = Number(file.getSize64());
        if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) continue;
        const bytes = file.readAll();
        if (bytes.length !== size) throw new Error('Incomplete CASC resource read');
        return { bytes, resolvedPath: `casc://${candidate}` };
      } finally { file.close(); }
    }
    throw new Error(`Model resource not found (${candidates.prefix}): ${request.path}`);
  }
}
