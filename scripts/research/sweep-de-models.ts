/** Optional local CASC regression; no official assets are copied into the repo. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parsePreviewModel } from '../../src/Renderer/model-preview/parse-model';
const { Storage } = createRequire(import.meta.url)('@jamiephan/casclib');
const [game, manifestFile, out] = process.argv.slice(2);
if (!game || !manifestFile || !out) throw new Error('Usage: sweep-de-models.ts GAME MANIFEST OUTPUT_JSON');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const entries = manifest.entries.filter((e: any) => /^war3.w3mod:_de.w3mod:(units|buildings)\\/i.test(e.name));
const storage = new Storage(), failures: { name: string; error: string }[] = [];
let parsed = 0;
storage.open(game + '*w3');
try {
  for (const entry of entries) {
    let file: any;
    try {
      file = storage.openFile(entry.name);
      if (file.getSize() > 64 * 1024 * 1024) throw new Error('File exceeds preview limit');
      parsePreviewModel(file.readAll()); parsed++;
    } catch (error) { failures.push({ name: entry.name, error: String(error) }); }
    finally { file?.close(); }
  }
} finally { storage.close(); }
const report = { total: entries.length, parsed, failures };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: entries.length, parsed, failures: failures.length, output: out }));
