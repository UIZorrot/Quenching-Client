/**
 * Audit terrainXX.slk in assets (read-only).
 * Assets are maintained manually; runtime copies them as-is.
 *
 * Usage: node scripts/build-terrain-slk.mjs
 */
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { auditTerrainSlk } from './terrain-slk-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', 'assets', 'quenching');

const FILES = ['terrain00.slk', 'terrain16.slk', 'terrain18.slk', 'terrain20.slk'];

async function main() {
    for (const out of FILES) {
        const outPath = path.join(ASSETS, out);
        if (!(await fs.pathExists(outPath))) {
            console.warn(`Skip missing ${out}`);
            continue;
        }

        const source = await fs.readFile(outPath, 'latin1');
        const audit = auditTerrainSlk(source);
        const samples = [...source.matchAll(/C;X3;K"(t\d+\\[^"]+)"/g)].slice(1, 7).map((m) => m[1]);

        console.log(`\n${out}:`);
        console.log(`  ${audit.bytes} bytes, TerrainArt=${audit.terrainArt}, doubleCR=${audit.doubleCr}`);
        if (samples.length) {
            console.log(samples.join('\n'));
        }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
