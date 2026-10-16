// Deterministic ordinary ZIPs using Node built-ins; no new packaging dependency.
// Source assets and the known-good 3.5 reference are read only.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quenching = path.join(root, 'assets/quenching');
const args = process.argv.slice(2);
const legacyIndex = args.indexOf('--legacy-source');
const legacy = legacyIndex >= 0 ? path.resolve(args[legacyIndex + 1]) : undefined;
const table = Array.from({ length: 256 }, (_, i) => { let n = i; for (let j = 0; j < 8; j++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0); return n >>> 0; });
function crc32(bytes) {
  if (zlib.crc32) return zlib.crc32(bytes);
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
async function list(folder, prefix) {
  const files = [];
  for (const item of await fs.readdir(folder, { withFileTypes: true })) {
    if (item.isSymbolicLink()) throw new Error('Shader source contains a link');
    const source = path.join(folder, item.name); const name = prefix + '/' + item.name;
    if (item.isDirectory()) files.push(...await list(source, name));
    else if (item.isFile()) files.push({ source, name });
  }
  return files;
}
async function zip(destination, records) {
  records.sort((a, b) => a.name.localeCompare(b.name));
  const chunks = []; const directory = []; let offset = 0; let originalBytes = 0;
  for (const record of records) {
    const original = await fs.readFile(record.source); const compressed = zlib.deflateRawSync(original, { level: 9 });
    const name = Buffer.from(record.name); const crc = crc32(original);
    if (compressed.length > 0xffffffff || original.length > 0xffffffff || offset > 0xffffffff) throw new Error('Shader ZIP requires ZIP64');
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8); local.writeUInt16LE(33, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(original.length, 22); local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, compressed);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(original.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, name); offset += local.length + name.length + compressed.length; originalBytes += original.length;
  }
  if (records.length > 65535) throw new Error('Too many shader ZIP entries');
  const centralBytes = Buffer.concat(directory); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(records.length, 8); end.writeUInt16LE(records.length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  const bytes = Buffer.concat([...chunks, centralBytes, end]);
  const previous = await fs.readFile(destination).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  const changed = !previous?.equals(bytes);
  if (changed) {
    const temporary = destination + '.tmp';
    await fs.writeFile(temporary, bytes); await fs.rename(temporary, destination);
  }
  console.log(JSON.stringify({ file: path.relative(root, destination), entries: records.length, originalBytes, zipBytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'), changed }));
}
if (legacy) {
  const records = [];
  for (const kind of ['hd', 'de']) records.push(...await list(path.join(legacy, 'shaders', `shaders-300-${kind}`), `shaders/shaders-300-legacy-${kind}`));
  records.push(...await list(path.join(legacy, 'shaders/fog_shaders'), 'shaders/fog_shaders-legacy'));
  await zip(path.join(quenching, 'shaders-300-legacy.zip'), records);
} else {
  await fs.access(path.join(quenching, 'shaders-300-legacy.zip')).catch(() => {
    throw new Error('Missing known-good 3.0 bundle. First run with --legacy-source <3.5 resources/assets/quenching>.');
  });
}
await zip(path.join(quenching, 'shaders.zip'), await list(path.join(quenching, 'shaders'), 'shaders'));
