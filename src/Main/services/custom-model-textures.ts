import fs from 'fs-extra';
import path from 'node:path';

export function textureKey(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\.\//, '').toLowerCase();
}

interface TextureSlot { reference: string; offset?: number }

function textureSlots(modelPath: string, data: Buffer): TextureSlot[] {
  if (path.extname(modelPath).toLowerCase() === '.mdl') {
    // Read only Bitmap blocks, not attachment paths, animation names or comments.
    const text = data.toString('utf8').replace(/\/\/[^\r\n]*/g, '');
    return [...text.matchAll(/\bBitmap\s*\{([^{}]*)\}/g)].flatMap(match => {
      if (/\bReplaceableId\s+[1-9]\d*\b/.test(match[1])) return [];
      const image = /\bImage\s+"([^"]*)"/.exec(match[1]);
      return image?.[1] ? [{ reference: image[1] }] : [];
    });
  }
  if (path.extname(modelPath).toLowerCase() !== '.mdx' || data.toString('ascii', 0, 4) !== 'MDLX') {
    throw new Error('自定义模型仅支持有效的 MDX 或 MDL 文件');
  }
  const slots: TextureSlot[] = [];
  for (let offset = 4; offset < data.length;) {
    if (offset + 8 > data.length) throw new Error('MDX 区块头不完整');
    const tag = data.toString('ascii', offset, offset + 4);
    const start = offset + 8, end = start + data.readUInt32LE(offset + 4);
    if (end > data.length) throw new Error(`MDX ${tag} 区块不完整`);
    if (tag === 'TEXS') {
      if ((end - start) % 268 !== 0) throw new Error('MDX 贴图表格式不正确');
      for (let pos = start; pos < end; pos += 268) {
        // Replaceable textures (team color/glow, etc.) are supplied by the game.
        if (data.readUInt32LE(pos) !== 0) continue;
        const bytes = data.subarray(pos + 4, pos + 264);
        const nul = bytes.indexOf(0);
        const reference = bytes.subarray(0, nul < 0 ? bytes.length : nul).toString('utf8');
        if (reference) slots.push({ reference, offset: pos + 4 });
      }
    }
    offset = end;
  }
  return slots;
}

export function modelTextureReferences(modelPath: string, data: Buffer): string[] {
  const refs = new Map<string, string>();
  for (const { reference } of textureSlots(modelPath, data)) refs.set(textureKey(reference), reference);
  return [...refs.values()];
}

/** Change only texture paths; keep MDX chunks, animation bytes and flags intact. */
export function rewriteModelTexturePaths(modelPath: string, data: Buffer, bindings: Map<string, string>): Buffer {
  const slots = textureSlots(modelPath, data);
  if (path.extname(modelPath).toLowerCase() === '.mdl') {
    const keys = new Set(slots.map(slot => textureKey(slot.reference)));
    const text = data.toString('utf8').replace(/\/\/[^\r\n]*|\bBitmap\s*\{[^{}]*\}/g, block => {
      if (block.startsWith('//') || /\bReplaceableId\s+[1-9]\d*\b/.test(block)) return block;
      return block.replace(/\bImage\s+"([^"]*)"/g, (image, ref: string) => {
        const target = keys.has(textureKey(ref)) ? bindings.get(textureKey(ref)) : undefined;
        return target ? `Image "${target}"` : image;
      });
    });
    return Buffer.from(text, 'utf8');
  }
  const output = Buffer.from(data);
  for (const slot of slots) {
    const target = bindings.get(textureKey(slot.reference));
    if (!target) continue;
    const bytes = Buffer.from(target, 'utf8');
    if (bytes.length >= 260) throw new Error(`导入贴图路径过长: ${target}`);
    output.fill(0, slot.offset!, slot.offset! + 260);
    bytes.copy(output, slot.offset!);
  }
  return output;
}

/** Repair copies imported by older clients, using their already-copied textures. */
export async function repairImportedModelTextures(modelPath: string, baseDir: string): Promise<void> {
  const customRoot = path.resolve(baseDir, 'cos', 'custom');
  const relative = path.relative(customRoot, path.resolve(modelPath));
  if (relative.startsWith('..') || path.isAbsolute(relative) || !relative || !(await fs.pathExists(modelPath))) return;
  const data = await fs.readFile(modelPath);
  const bindings = new Map<string, string>();
  for (const reference of modelTextureReferences(modelPath, data)) {
    const source = path.resolve(path.dirname(modelPath), reference.replace(/\\/g, '/'));
    const inside = path.relative(path.dirname(modelPath), source);
    if (inside.startsWith('..') || path.isAbsolute(inside)) continue;
    if ((await fs.stat(source).catch(() => null))?.isFile()) {
      bindings.set(textureKey(reference), path.relative(baseDir, source).split(path.sep).join('\\'));
    }
  }
  if (!bindings.size) return;
  const patched = rewriteModelTexturePaths(modelPath, data, bindings);
  if (!patched.equals(data)) await fs.writeFile(modelPath, patched);
}
