import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { copyPostProcessingConfigIfMissing } from '../src/Main/services/post-processing-config';

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-post-config-'));
  try {
    const source = path.join(root, 'PostProcessingConfig.txt');
    const retail = path.join(root, '_retail_');
    const target = path.join(retail, 'PostProcessingConfig.txt');
    await fs.outputFile(source, '[Bloom]\nEnabled=1\n');
    await fs.ensureDir(retail);

    assert.equal(await copyPostProcessingConfigIfMissing(retail, source), true);
    assert.equal(await fs.readFile(target, 'utf8'), '[Bloom]\nEnabled=1\n');

    await fs.writeFile(source, '[Bloom]\nEnabled=0\n');
    assert.equal(await copyPostProcessingConfigIfMissing(retail, source), false);
    assert.equal(await fs.readFile(target, 'utf8'), '[Bloom]\nEnabled=1\n');

    console.log('PostProcessingConfig copy test passed');
  } finally {
    await fs.remove(root);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
