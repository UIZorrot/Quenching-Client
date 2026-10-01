import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { setPostProcessingAoEnabled } from '../src/Main/services/post-processing-config';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'pp-ao-'));
try {
  const file = path.join(temp, 'PostProcessingConfig.txt');
  assert.equal(await setPostProcessingAoEnabled(temp, true), false, 'missing file is left alone');

  await fs.copy(path.join(process.cwd(), 'assets', 'quenching', 'PostProcessingConfig.txt'), file);
  const original = await fs.readFile(file, 'utf8');
  assert.equal(await setPostProcessingAoEnabled(temp, true), true);
  const enabled = await fs.readFile(file, 'utf8');
  assert.match(enabled, /\[ASSAO\][\s\S]*?Enabled=1[\s\S]*?\[Bloom\][\s\S]*?Enabled=1/);
  assert.equal(enabled.replace('Enabled=1', 'Enabled=0'), original, 'only the ASSAO line changes');
  assert.equal(await setPostProcessingAoEnabled(temp, true), false, 'no rewrite when already on');

  assert.equal(await setPostProcessingAoEnabled(temp, false), true);
  assert.equal(await fs.readFile(file, 'utf8'), original);

  await fs.writeFile(file, '[Bloom]\r\nEnabled=1\r\n');
  await setPostProcessingAoEnabled(temp, true);
  assert.equal(await fs.readFile(file, 'utf8'), '[Bloom]\r\nEnabled=1\r\n\r\n[ASSAO]\r\nEnabled=1');
  assert.equal(await setPostProcessingAoEnabled(temp, false), true);
  assert.equal(await fs.readFile(file, 'utf8'), '[Bloom]\r\nEnabled=1\r\n\r\n[ASSAO]\r\nEnabled=0');
} finally {
  await fs.remove(temp);
}
console.log('PostProcessingConfig AO checks passed');
