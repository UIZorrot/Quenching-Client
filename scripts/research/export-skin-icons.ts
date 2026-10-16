/** Export only small command-button icons; model/texture resources stay in the game CASC. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { Storage } from '@jamiephan/casclib';
import { DdsImage } from 'mdx-m3-viewer/dist/cjs/parsers/dds/image';
import BlpImageImport from 'mdx-m3-viewer/dist/cjs/parsers/blp/image';
import { skinTargets } from '../../src/Renderer/assets/data/skin-panel-catalog';
import { originalSkin, parseSkinSections } from '../../src/shared/skin-versions';

const gamePath = process.argv[2];
if (!gamePath) throw new Error('Usage: tsx scripts/research/export-skin-icons.ts GAME_PATH [UNIT_ID]');
const storage = new Storage(); storage.open(`${gamePath}*w3`);
let sections: ReturnType<typeof parseSkinSections>;
try {
  const file = storage.openFile('war3.w3mod:units\\unitskin.txt');
  try { sections = parseSkinSections(file.readAll().toString('utf8')); } finally { file.close(); }
} finally { storage.close(); }
// This read-only Node utility must not load Electron or the player's config.
const backend = await build({
  stdin: { contents: 'export { ModelResourceService } from "./src/Main/services/model-resource-service";', resolveDir: process.cwd(), loader: 'ts' },
  platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'read-only-branch', setup(plugin) {
    plugin.onResolve({ filter: /\/game-channel$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const getSelectedGameFolder = () => "_retail_";' }));
  } }],
});
const backendModule = { exports: {} as any };
new Function('require', 'module', 'exports', backend.outputFiles[0].text)(createRequire(import.meta.url), backendModule, backendModule.exports);
const resources = new backendModule.exports.ModelResourceService();
const BlpImage = (BlpImageImport as any).default || BlpImageImport;
const results: string[] = [];
const misses: string[] = [];

try {
  const targets = [
    ...['hum', 'orc', 'ud', 'ne', 'neutral'].flatMap(race =>
      ['hero', 'unit', 'building'].flatMap(category => skinTargets(race, category)
        .filter(target => !target.icon || target.icon.startsWith('skin-icon-'))
        .map(target => ({ unitId: target.unitId, filename: `skin-icon-${target.unitId.toLowerCase()}.png` })))),
    { unitId: 'Hamg', filename: 'skin-nav-hero.png' },
    { unitId: 'hfoo', filename: 'skin-nav-unit.png' },
    { unitId: 'htow', filename: 'skin-nav-building.png' },
  ];
  const requested = process.argv[3];
  const selected = requested ? targets.filter(target => target.unitId === requested) : targets;
  if (!selected.length) throw new Error(`No compact icon target for ${requested}`);
  for (const target of selected) {
    const art = originalSkin(sections[target.unitId], 'sd').find(field => field.field === 'Art')?.value;
    if (!art) { misses.push(`${target.unitId}: no Art field`); continue; }
    const destination = path.join('public', 'assets', 'quenching', target.filename);
    if (await fs.stat(destination).catch(() => null)) { results.push(`${target.unitId}: existing`); continue; }
    try {
      const resource = await resources.read({ path: art, artSet: 'sd' }, gamePath);
      const image = resource.bytes.subarray(0, 3).toString() === 'BLP' ? new BlpImage() : new DdsImage();
      image.load(resource.bytes);
      const mip = image.getMipmap(0);
      const converted = spawnSync('ffmpeg', ['-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba',
        '-video_size', `${mip.width}x${mip.height}`, '-i', 'pipe:0', '-vf', 'scale=64:64:flags=lanczos',
        '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'],
      { input: Buffer.from(mip.data), maxBuffer: 1024 * 1024 });
      if (converted.status !== 0 || converted.stdout.length === 0)
        throw new Error(converted.stderr.toString('utf8').slice(0, 180) || 'ffmpeg conversion failed');
      await fs.writeFile(destination, converted.stdout, { flag: 'wx' });
      results.push(`${target.unitId}: ${converted.stdout.length} bytes`);
    } catch (error) { misses.push(`${target.unitId}: ${error instanceof Error ? error.message : String(error)}`); }
  }
} finally { resources.close(); }
console.log(JSON.stringify({ exported: results.length, missing: misses.length, details: misses }, null, 2));
if (misses.length) process.exitCode = 1;
