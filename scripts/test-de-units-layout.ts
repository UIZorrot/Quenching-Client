import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: 'export {parkNonHdUnitsAndBuildings, restoreHdUnitsAndBuildings} from "./src/Main/services/graphics-layout-service";',
    resolveDir: process.cwd(), loader: 'ts',
  },
  platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'retail-fixture', setup(plugin) {
    plugin.onResolve({ filter: /full-package-service$/ }, () => ({ path: 'retail-fixture', namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: 'export async function resolveRetailDir(root) { return root; }',
    }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { parkNonHdUnitsAndBuildings, restoreHdUnitsAndBuildings } = module.exports;

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-de-units-'));
try {
  await fs.outputFile(path.join(root, 'buildings', 'keep.mdx'), 'HD building');
  await fs.outputFile(path.join(root, 'units', 'hero.mdx'), 'HD unit');
  await fs.outputFile(path.join(root, 'units', 'unitskin.txt'), 'active skin');
  await fs.outputFile(path.join(root, 'units', 'destructableskin.txt'), 'active tree skin');
  await parkNonHdUnitsAndBuildings(root);
  assert.equal(await fs.pathExists(path.join(root, 'buildings')), false);
  assert.equal(await fs.pathExists(path.join(root, 'units', 'hero.mdx')), false);
  assert.equal(await fs.readFile(path.join(root, 'QMoff', 'buildings', 'keep.mdx'), 'utf8'), 'HD building');
  assert.equal(await fs.readFile(path.join(root, 'QMoff', 'units', 'hero.mdx'), 'utf8'), 'HD unit');
  assert.equal(await fs.readFile(path.join(root, 'units', 'unitskin.txt'), 'utf8'), 'active skin');
  assert.equal(await fs.readFile(path.join(root, 'units', 'destructableskin.txt'), 'utf8'), 'active tree skin');

  await fs.outputFile(path.join(root, 'units', 'hero.mdx'), 'unexpected duplicate');
  await restoreHdUnitsAndBuildings(root);
  assert.equal(await fs.readFile(path.join(root, 'units', 'hero.mdx'), 'utf8'), 'HD unit');
  assert.equal(await fs.readFile(path.join(root, 'buildings', 'keep.mdx'), 'utf8'), 'HD building');
  assert.equal(await fs.readFile(path.join(root, 'units', 'unitskin.txt'), 'utf8'), 'active skin');
  console.log('PASS: DE parks buildings and non-skin units; HD restores them first');
} finally {
  await fs.remove(root);
}
