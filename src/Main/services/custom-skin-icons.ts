import fs from 'fs-extra';
import path from 'node:path';
import crypto from 'node:crypto';
import { nativeImage } from 'electron';
import { BlpImage } from 'mdx-m3-viewer/dist/cjs/parsers/blp/image';
import { DdsImage } from 'mdx-m3-viewer/dist/cjs/parsers/dds/image';
import TgaDecoder from 'tga-js';
import { resolveBranchModFile } from './branch-mod-toggle';

export interface CustomIconFiles { enabled: string; disabled: string }
const GAME_FORMATS = new Set(['.blp', '.dds', '.tga']);

export function customIconFiles(id: string, extension: string): CustomIconFiles {
  if (!GAME_FORMATS.has(extension)) throw new Error('Unsupported game icon format');
  const name = `BTNQCustom_${crypto.createHash('sha256').update(id).digest('hex').slice(0, 24)}${extension}`;
  return { enabled: `ReplaceableTextures\\CommandButtons\\${name}`,
    disabled: `ReplaceableTextures\\CommandButtonsDisabled\\DIS${name}` };
}

/** Some viewer texture decoders expect the browser's ImageData, even in Node. */
function decodeGameImage(bytes: Buffer, extension: string): { width: number; height: number; data: ArrayLike<number> } {
  // BLP/DDS decoders index the ArrayBuffer from zero, unlike pooled Node Buffers.
  const data = Uint8Array.from(bytes);
  const host = globalThis as any;
  const previous = host.ImageData;
  if (!previous) host.ImageData = class {
    data: Uint8ClampedArray;
    constructor(public width: number, public height: number) {
      if (width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error('Icon dimensions are invalid');
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
  try {
    if (bytes.toString('ascii', 0, 4) === 'DDS ' || extension === '.dds') {
      const image = new DdsImage(); image.load(data);
      if (image.width > 4096 || image.height > 4096) throw new Error('Icon is too large');
      return image.getMipmap(0);
    }
    if (extension === '.blp') {
      const image = new BlpImage(); image.load(data);
      if (image.width > 4096 || image.height > 4096) throw new Error('Icon is too large');
      return image.getMipmap(0);
    }
    const Tga = (TgaDecoder as any).default || TgaDecoder;
    const image = new Tga(); image.load(data);
    const { width, height } = image.header;
    if (width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error('Icon dimensions are invalid');
    return image.getImageData({ width, height, data: new Uint8ClampedArray(width * height * 4) });
  } finally {
    if (previous) host.ImageData = previous;
    else delete host.ImageData;
  }
}

async function gameTga(source: string): Promise<Buffer> {
  const extension = path.extname(source).toLowerCase();
  let width: number, height: number, pixels: Buffer;
  if (GAME_FORMATS.has(extension)) {
    const image = decodeGameImage(await fs.readFile(source), extension);
    ({ width, height } = image);
    pixels = Buffer.alloc(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = image.data[i + 2]; pixels[i + 1] = image.data[i + 1];
      pixels[i + 2] = image.data[i]; pixels[i + 3] = image.data[i + 3];
    }
  } else {
    const image = nativeImage.createFromPath(source);
    if (image.isEmpty()) throw new Error(`无法读取图标: ${source}`);
    ({ width, height } = image.getSize());
    if (width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error('Icon dimensions are invalid');
    pixels = Buffer.from(image.toBitmap());
    // Electron's bitmap is BGRA with premultiplied alpha; TGA uses straight alpha.
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha > 0 && alpha < 255) for (let channel = 0; channel < 3; channel++)
        pixels[i + channel] = Math.min(255, Math.round(pixels[i + channel] * 255 / alpha));
    }
  }
  const header = Buffer.alloc(18);
  header[2] = 2; header.writeUInt16LE(width, 12); header.writeUInt16LE(height, 14);
  header[16] = 32; header[17] = 0x28; // BGRA, eight alpha bits, top-left origin.
  return Buffer.concat([header, pixels]);
}

/** DISBTN lookup requires the same basename and extension as BTN, prefixed with DIS. */
export async function installCustomIconPair(base: string, id: string, enabled: string, disabled: string): Promise<CustomIconFiles> {
  const extension = path.extname(enabled).toLowerCase();
  const preserve = GAME_FORMATS.has(extension) && extension === path.extname(disabled).toLowerCase();
  const files = customIconFiles(id, preserve ? extension : '.tga');
  const bytes = await Promise.all(preserve ? [fs.readFile(enabled), fs.readFile(disabled)] : [gameTga(enabled), gameTga(disabled)]);
  for (const [index, relative] of [files.enabled, files.disabled].entries()) {
    const target = path.join(base, relative.replace(/\\/g, '/'));
    await fs.ensureDir(path.dirname(target));
    await fs.writeFile(target, bytes[index]);
  }
  return files;
}

export async function removeCustomIconPair(base: string, id: string): Promise<void> {
  for (const extension of GAME_FORMATS) for (const relative of Object.values(customIconFiles(id, extension))) {
    await fs.remove(await resolveBranchModFile(base, relative.replace(/\\/g, '/')));
    for (const prefix of ['', 'QMoff']) await fs.remove(path.join(base, prefix, relative.replace(/\\/g, '/')));
  }
}
