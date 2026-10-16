import fs from 'fs-extra';
import path from 'node:path';
import { textureKey } from './custom-model-textures';

const extensions = new Set(['.blp', '.dds', '.tga', '.tif', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
type Index = Map<string, string[]>;

function add(index: Index, key: string, file: string) {
  const matches = index.get(key);
  if (matches) matches.push(file);
  else index.set(key, [file]);
}

export function textureVariants(reference: string): string[] {
  if (/\.tif$/i.test(reference)) return [reference.replace(/\.tif$/i, '.dds'), reference];
  if (/\.blp$/i.test(reference)) return [reference, reference.replace(/\.blp$/i, '.dds')];
  if (/\.dds$/i.test(reference)) return [reference, reference.replace(/\.dds$/i, '.blp')];
  return [reference];
}

/** One directory walk per search; no texture reads, symlink traversal or game-tree scan. */
export async function indexTextureDirectory(directory: string) {
  const relative: Index = new Map();
  const suffix: Index = new Map();
  const basenames: Index = new Map();
  const pending = [directory];
  while (pending.length) {
    const folder = pending.pop()!;
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) pending.push(file);
      else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        const key = textureKey(path.relative(directory, file));
        add(relative, key, file);
        add(basenames, textureKey(entry.name), file);
        const parts = key.split('/');
        for (let start = 0; start < parts.length - 1; start++) add(suffix, parts.slice(start).join('/'), file);
      }
    }
  }
  const unique = (index: Index, key: string) => {
    const hits = index.get(key);
    return hits?.length === 1 ? hits[0] : undefined;
  };
  return {
    resolve(reference: string, basenameOnly = false): string | undefined {
      const keys = textureVariants(reference).map(textureKey);
      if (!basenameOnly) {
        for (const key of keys) { const hit = unique(relative, key); if (hit) return hit; }
        for (const key of keys) {
          const parts = key.split('/');
          for (let start = 0; start < parts.length - 1; start++) {
            const hit = unique(suffix, parts.slice(start).join('/'));
            if (hit) return hit;
          }
        }
        return undefined;
      }
      for (const key of keys) { const hit = unique(basenames, key.split('/').pop()!); if (hit) return hit; }
      return undefined;
    },
  };
}
