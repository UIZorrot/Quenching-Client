/** Rebuild the mode-specific original skin templates from an installed game CASC. */
import fs from 'fs-extra';
import path from 'node:path';
import { Storage } from '@jamiephan/casclib';

const gameRoot = process.argv[2];
if (!gameRoot || !(await fs.pathExists(path.join(gameRoot, '.build.info')))) {
  throw new Error('Pass a Warcraft III installation root containing .build.info');
}

const storage = new Storage();
let original: string;
try {
  storage.open(`${gameRoot}*w3`);
  const file = storage.openFile('war3.w3mod:units\\unitskin.txt');
  try { original = file.readAll().toString('utf8'); }
  finally { file.close(); }
} finally {
  storage.close();
}

if (!original.includes('file:de=') || !original.includes('file:sd=')) {
  throw new Error('This game package does not contain separate SD and DE skin values');
}

const outputDir = path.resolve('assets', 'quenching', 'skin');
for (const mode of ['sd', 'de'] as const) {
  const lines = original.split(/\r?\n/).filter(line => {
    const qualified = /^[^=:\r\n]+:(sd|hd|de)(?::[^=]*)?=/i.exec(line);
    return !qualified || qualified[1].toLowerCase() === mode;
  });
  const output = path.join(outputDir, `unitskin-${mode}.txt`);
  await fs.outputFile(output, lines.join('\r\n'), 'utf8');
  console.log(`Extracted ${mode.toUpperCase()} original unitskin: ${output} (${lines.length} lines)`);
}
