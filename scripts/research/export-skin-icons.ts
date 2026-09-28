/** Export only small command-button icons; model/texture resources stay in the game CASC. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DdsImage } from 'mdx-m3-viewer/dist/cjs/parsers/dds/image';
import { ModelResourceService } from '../../src/Main/services/model-resource-service';
import { skinTargets } from '../../src/Renderer/assets/data/skin-panel-catalog';
import { parseSkinSections } from '../../src/shared/skin-versions';

const gamePath = process.argv[2];
if (!gamePath) throw new Error('Usage: tsx scripts/research/export-skin-icons.ts GAME_PATH');
const sections = parseSkinSections(await fs.readFile('assets/quenching/skin/unitskin-new.txt', 'utf8'));
const resources = new ModelResourceService();
const results: string[] = [];
const misses: string[] = [];

try {
  const targets = [
    ...['hum', 'orc', 'ud', 'ne'].flatMap(race =>
      ['unit', 'building'].flatMap(category => skinTargets(race, category)
        .filter(target => !target.icon || target.icon.startsWith('skin-icon-'))
        .map(target => ({ unitId: target.unitId, filename: `skin-icon-${target.unitId.toLowerCase()}.png` })))),
    { unitId: 'Hamg', filename: 'skin-nav-hero.png' },
    { unitId: 'hfoo', filename: 'skin-nav-unit.png' },
    { unitId: 'htow', filename: 'skin-nav-building.png' },
  ];
  for (const target of targets) {
    const art = sections[target.unitId]?.Art;
    if (!art) { misses.push(`${target.unitId}: no Art field`); continue; }
    const destination = path.join('public', 'assets', 'quenching', target.filename);
    if (await fs.stat(destination).catch(() => null)) { results.push(`${target.unitId}: existing`); continue; }
    try {
      const resource = await resources.read({ path: art, artSet: 'sd' }, gamePath);
      const image = new DdsImage();
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
