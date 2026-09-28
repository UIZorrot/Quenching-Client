import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import archiver from 'archiver';
import { extractZipArchive, getZipUncompressedBytes } from '../src/Main/services/zip-extraction';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-zip-extract-'));
try {
  const archivePath = path.join(root, 'duplicates.zip');
  const output = fs.createWriteStream(archivePath);
  const archive = archiver('zip');
  archive.pipe(output);
  archive.append('old', { name: '_retail_/t00/same.txt' });
  archive.append('new content', { name: 't00/same.txt' });
  archive.append('left', { name: 'a/same.txt' });
  archive.append('right', { name: 'b/same.txt' });
  await new Promise<void>((resolve, reject) => {
    output.once('close', resolve);
    output.once('error', reject);
    archive.once('error', reject);
    void archive.finalize();
  });

  const expectedSize = Buffer.byteLength('new contentleftright');
  assert.equal(await getZipUncompressedBytes(archivePath, ['_retail_', '_ptr_']), expectedSize);
  const destination = path.join(root, 'out');
  assert.equal(await extractZipArchive(archivePath, destination, { stripLeadingDirectory: ['_retail_', '_ptr_'] }), expectedSize);
  assert.equal(await fs.readFile(path.join(destination, 't00', 'same.txt'), 'utf8'), 'new content');
  assert.equal(await fs.readFile(path.join(destination, 'a', 'same.txt'), 'utf8'), 'left');
  assert.equal(await fs.readFile(path.join(destination, 'b', 'same.txt'), 'utf8'), 'right');
  console.log('ZIP duplicate paths, separate same-name files, and one-pass space accounting passed');
} finally {
  await fs.remove(root);
}
