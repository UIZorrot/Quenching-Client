import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quenching-custom-textures-'));
const f = { config: { war3Path: root, customSkins: [] } as any, channel: 'retail',
  stock: new Map([['war3.w3mod:_hd.w3mod:Textures\\Black32.blp', Buffer.from('stock black')]]), storageOpens: 0, cascUnavailable: false };
(globalThis as any).__customTextureFixture = f;
const bundle = await build({
  stdin: { contents: `export { customSkinService } from './src/Main/services/custom-skin-service';
    export { ModelResourceService } from './src/Main/services/model-resource-service';
    export * from './src/Main/services/custom-model-textures';`, resolveDir: process.cwd(), loader: 'ts' },
  platform: 'node', format: 'cjs', packages: 'external', bundle: true, write: false,
  plugins: [{ name: 'skin-fixture', setup(plugin) {
    plugin.onResolve({ filter: /(?:\/config-manager|\/game-channel|\/version-skin-service|@jamiephan\/casclib)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: 'const f=globalThis.__customTextureFixture;' + (
      args.path.endsWith('config-manager') ? 'export const configManager={get:k=>f.config[k],set:(k,v)=>{f.config[k]=v}};'
      : args.path.endsWith('game-channel') ? 'export const getSelectedGameFolder=()=>f.channel==="ptr"?"_ptr_":"_retail_";'
      : args.path.endsWith('version-skin-service') ? 'export const versionSkinService={resetCustomSkin:async()=>{}, panel:async()=>({originals:{}}), portrait:async()=>({source:"unavailable",rejected:[]})};'
      : `export class Storage { open(){f.storageOpens++; if(f.cascUnavailable) throw new Error('CASC offline')} close(){} fileExists(k){return f.stock.has(k)}
          openFile(k){const bytes=f.stock.get(k);return {getSize64:()=>bytes.length,readAll:()=>bytes,close(){}}} }`
    ) }));
  } }],
});
const module = { exports: {} as any };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { customSkinService: service, ModelResourceService, modelTextureReferences, rewriteModelTexturePaths, textureKey } = module.exports;

function chunk(tag: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8); header.write(tag, 0, 'ascii'); header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data]);
}
function mdx(textures: Array<[string, number?]>): Buffer {
  const version = Buffer.alloc(4); version.writeUInt32LE(1000);
  return Buffer.concat([Buffer.from('MDLX'), chunk('VERS', version), chunk('TEXS', Buffer.concat(textures.map(([ref, id = 0]) => {
    const data = Buffer.alloc(268); data.writeUInt32LE(id); data.write(ref, 4, 'utf8'); data.writeUInt32LE(3, 264); return data;
  }))), chunk('TEST', Buffer.from('unknown chunk with Fake.blp and animation data'))]);
}
const gamePath = (ref: string, branch = '_retail_') => path.join(root, branch, ref.replace(/\\/g, '/'));
const resources = new ModelResourceService();
try {
  await fs.ensureDir(path.join(root, '_retail_'));
  const source = path.join(root, 'source');
  const baseModel = mdx([['A\\body.blp'], ['B/body.blp'], ['war3mapImported/Old.blp'], ['Diffuse.tif'],
    ['Textures/Black32.blp'], ['ReplaceableTextures/TeamColor/TeamColor00.blp', 1], ['', 2]]);
  const model = path.join(source, 'hero.mdx');
  await fs.outputFile(model, baseModel);
  await fs.outputFile(path.join(source, 'A', 'body.blp'), 'A texture');
  await fs.outputFile(path.join(source, 'B', 'body.blp'), 'B texture');
  await fs.outputFile(path.join(source, 'renamed.dds'), 'explicit DDS texture');
  await fs.outputFile(path.join(source, 'Diffuse.dds'), 'TIF alias DDS');
  await fs.outputFile(path.join(source, 'icon.blp'), 'icon');
  const hdModel = path.join(source, 'hd', 'hero.mdx');
  const hdBytes = mdx([['hd-only.dds']]);
  await fs.outputFile(hdModel, hdBytes);
  await fs.outputFile(path.join(source, 'hd', 'hd-only.dds'), 'HD-only texture');
  const inspection = await service.inspectExternalModel(model, 'hd');
  assert.equal(inspection.references.includes('Fake.blp'), false, 'never scan arbitrary binary strings');
  assert.equal(inspection.references.some((ref: string) => ref.includes('TeamColor')), false);
  assert.equal(inspection.textureBindings['A/body.blp'], path.join(source, 'A', 'body.blp'));
  assert.equal(inspection.textureBindings['B/body.blp'], path.join(source, 'B', 'body.blp'));
  assert.deepEqual(inspection.gameReferences, ['Textures/Black32.blp']);
  assert.deepEqual(inspection.unresolved, ['war3mapImported/Old.blp']);

  // Stock dependencies supplied by Warcraft must not ask the player for files.
  f.stock.set('war3.w3mod:_hd.w3mod:ReplaceableTextures\\EnvironmentMap.dds', Buffer.from('HD environment map'));
  f.stock.set('war3.w3mod:_de.w3mod:ReplaceableTextures\\EnvironmentMap.dds', Buffer.from('DE environment map'));
  const environmentModel = path.join(source, 'environment.mdx');
  const environmentBytes = mdx([['EnvironmentMap.blp'], ['Textures/EnvironmentMap.blp'], ['Black32.blp']]);
  await fs.outputFile(environmentModel, environmentBytes);
  const environmentInspection = await service.inspectExternalModel(environmentModel, 'hd');
  assert.deepEqual(environmentInspection.unresolved, []);
  assert.equal(environmentInspection.gameTextureBindings['EnvironmentMap.blp'], 'ReplaceableTextures/EnvironmentMap.dds');
  assert.equal(environmentInspection.gameTextureBindings['Textures/EnvironmentMap.blp'], 'ReplaceableTextures/EnvironmentMap.dds');
  assert.equal(environmentInspection.gameTextureBindings['Black32.blp'], 'Textures/Black32.blp');
  const environmentSkin = await service.create({ artSet: 'hd', targetId: 'hfoo', name: 'Warcraft shared maps', category: 'unit',
    source: 'external', modelPath: environmentModel, iconPath: path.join(source, 'icon.blp'), disabledIconPath: path.join(source, 'icon.blp') });
  const environmentCopy = gamePath(environmentSkin.config.find((c: any) => c.field === 'file').value);
  assert.deepEqual(modelTextureReferences(environmentCopy, await fs.readFile(environmentCopy)), ['ReplaceableTextures\\EnvironmentMap.dds', 'Textures\\Black32.blp']);
  assert.deepEqual(await fs.readFile(environmentModel), environmentBytes, 'the downloaded model must stay unchanged');
  const hdEnvironment = await resources.read({ path: 'EnvironmentMap.blp', artSet: 'hd' }, root);
  assert.equal(hdEnvironment.bytes.toString(), 'HD environment map');
  assert.equal((await resources.read({ path: 'EnvironmentMap.blp', artSet: 'de' }, root)).bytes.toString(), 'DE environment map');
  assert((await service.inspectExternalModel(environmentModel, 'sd')).unresolved.includes('EnvironmentMap.blp'), 'do not borrow an HD/DE-only texture for SD');

  // An actual texture included with the model still takes precedence over stock aliases.
  await fs.outputFile(path.join(source, 'EnvironmentMap.blp'), 'custom environment map');
  assert.equal((await service.inspectExternalModel(environmentModel, 'hd')).textureBindings['EnvironmentMap.blp'], path.join(source, 'EnvironmentMap.blp'));
  await fs.remove(path.join(source, 'EnvironmentMap.blp'));

  // Large dependency sets use one local index and one CASC handle, not one per texture.
  const pack = path.join(root, 'nested-textures');
  const manyRefs = Array.from({ length: 80 }, (_, i) => `war3mapImported/Layer${i}.blp`);
  for (const [i] of manyRefs.entries()) await fs.outputFile(path.join(pack, 'Textures', 'nested', `Layer${i}.blp`), `texture ${i}`);
  await fs.outputFile(path.join(pack, 'export', 'A', 'Body.dds'), 'suffix A');
  await fs.outputFile(path.join(pack, 'export', 'B', 'Body.dds'), 'suffix B');
  await fs.outputFile(path.join(pack, 'one', 'ambiguous.blp'), 'wrong one');
  await fs.outputFile(path.join(pack, 'two', 'ambiguous.blp'), 'wrong two');
  // A built-in exact path wins over a same-basename external file.
  await fs.outputFile(path.join(pack, 'unrelated', 'Black32.blp'), 'not the stock texture');
  await fs.outputFile(gamePath('Textures/Loose.dds'), 'loose game texture');
  f.stock.set('war3.w3mod:Textures\\StockAlias.dds', Buffer.from('stock alias'));
  f.stock.set('war3.w3mod:_de.w3mod:Textures\\DEOnly.blp', Buffer.from('DE-only'));
  const manyModel = path.join(pack, 'large.mdx');
  const manyBytes = mdx([...manyRefs.map(ref => [ref] as [string]), ['A/body.blp'], ['B/BODY.blp'],
    ['ambiguous.blp'], ['Textures/Black32.blp'], ['Textures/StockAlias.tif'], ['Textures/Loose.blp'], ['not-yet.blp']]);
  await fs.outputFile(manyModel, manyBytes);
  const beforeOpens = f.storageOpens;
  const many = await service.inspectExternalModel(manyModel, 'hd');
  assert.equal(f.storageOpens - beforeOpens, 1, 'one CASC open for all dependencies');
  assert.equal(Object.keys(many.textureBindings).length, 82);
  assert.deepEqual(many.unresolved, ['ambiguous.blp', 'not-yet.blp']);
  assert.equal(many.textureBindings['A/body.blp'], path.join(pack, 'export', 'A', 'Body.dds'));
  assert.equal(many.textureBindings['B/BODY.blp'], path.join(pack, 'export', 'B', 'Body.dds'));
  assert.equal(many.gameTextureBindings['Textures/Black32.blp'], 'Textures/Black32.blp');
  assert.equal(many.gameTextureBindings['Textures/StockAlias.tif'], 'Textures/StockAlias.dds');
  assert.equal(many.gameTextureBindings['Textures/Loose.blp'], 'Textures/Loose.dds');
  await fs.outputFile(path.join(pack, 'added-later', 'not-yet.blp'), 'found on rescan');
  assert.deepEqual((await service.inspectExternalModel(manyModel, 'hd')).unresolved, ['ambiguous.blp']);

  const builtinModel = path.join(pack, 'builtin.mdx');
  await fs.outputFile(builtinModel, mdx([['Textures/StockAlias.tif'], ['Textures/Loose.blp']]));
  const builtinSkin = await service.create({ artSet: 'hd', targetId: 'hfoo', name: 'Built-in aliases', category: 'unit',
    source: 'external', modelPath: builtinModel, iconPath: path.join(source, 'icon.blp'), disabledIconPath: path.join(source, 'icon.blp') });
  const builtinCopy = gamePath(builtinSkin.config.find((c: any) => c.field === 'file').value);
  const builtinRefs = modelTextureReferences(builtinCopy, await fs.readFile(builtinCopy));
  assert.deepEqual(builtinRefs, ['Textures\\StockAlias.dds', 'Textures\\Loose.dds']);
  assert.equal(await fs.pathExists(path.join(builtinSkin.resourceDir, 'textures')), false, 'built-in textures are referenced, not exported/copied');
  for (const [i, bytes] of ['stock alias', 'loose game texture'].entries()) {
    assert.equal((await resources.read({ path: builtinRefs[i], basePath: builtinCopy, artSet: 'hd' }, root)).bytes.toString(), bytes);
  }
  assert.deepEqual(await fs.readFile(manyModel), manyBytes);

  const layersModel = path.join(pack, 'layers.mdx');
  await fs.outputFile(layersModel, mdx([['Textures/DEOnly.blp'], ['Textures/Black32.blp'], ['Textures/StockAlias.tif']]));
  assert.deepEqual((await service.inspectExternalModel(layersModel, 'de')).gameReferences, ['Textures/DEOnly.blp', 'Textures/StockAlias.tif']);
  assert.deepEqual((await service.inspectExternalModel(layersModel, 'sd')).gameReferences, ['Textures/StockAlias.tif']);
  // Local recursion still succeeds when there is no installation or CASC cannot open.
  f.cascUnavailable = true;
  const offline = await service.inspectExternalModel(manyModel, 'hd');
  assert.equal(offline.textureBindings[manyRefs[79]], path.join(pack, 'Textures', 'nested', 'Layer79.blp'));
  assert(offline.gameReferences.includes('Textures/Loose.blp'), 'loose exact lookups work even when CASC is unavailable');
  f.cascUnavailable = false;

  const input = { artSet: 'hd', targetId: 'Hamg', name: '导入贴图路径测试'.repeat(5), category: 'hero', source: 'external',
    modelPath: model, modelPathHd: hdModel, iconPath: path.join(source, 'icon.blp'), disabledIconPath: path.join(source, 'icon.blp'),
    textureBindings: { 'WAR3MAPIMPORTED\\OLD.BLP': path.join(source, 'renamed.dds') } };
  const skin = await service.create(input);
  const copied = gamePath(skin.config.find((c: any) => c.field === 'file').value);
  const patched = await fs.readFile(copied);
  const references: string[] = modelTextureReferences(copied, patched);
  assert.equal(references.length, 5);
  assert.equal(references[4], 'Textures/Black32.blp');
  assert(references.slice(0, 4).every(ref => /^cos\\custom\\hd\\heroes\\Hamg\\.*\\textures\\texture-\d+\.(blp|dds)$/.test(ref)));
  assert.equal(references[2].endsWith('.dds'), true, 'explicit binding uses real file extension');
  assert.equal(references[3].endsWith('.dds'), true, 'TIF aliases resolve to a sibling DDS');
  assert.notEqual(references[0], references[1], 'same basenames in different directories stay distinct');
  for (const [index, bytes] of ['A texture', 'B texture', 'explicit DDS texture', 'TIF alias DDS'].entries()) {
    assert.equal(await fs.readFile(gamePath(references[index]), 'utf8'), bytes);
    assert.equal((await resources.read({ path: references[index], basePath: copied, artSet: 'hd' }, root)).bytes.toString(), bytes);
  }
  assert.equal((await resources.read({ path: references[4], basePath: copied, artSet: 'hd' }, root)).bytes.toString(), 'stock black');
  assert.equal(patched.length, baseModel.length);
  const expected = rewriteModelTexturePaths(model, baseModel, new Map(references.slice(0, 4).map((ref, i) => [textureKey(inspection.references[i]), ref])));
  assert.deepEqual(patched, expected, 'unknown chunks, replaceable IDs and flags remain byte-identical');
  const restoredPaths = Buffer.from(patched);
  for (let offset = 4; offset < baseModel.length;) {
    const start = offset + 8, end = start + baseModel.readUInt32LE(offset + 4);
    if (baseModel.toString('ascii', offset, offset + 4) === 'TEXS') {
      for (let pos = start; pos < end; pos += 268) baseModel.copy(restoredPaths, pos + 4, pos + 4, pos + 264);
    }
    offset = end;
  }
  assert.deepEqual(restoredPaths, baseModel, 'every byte outside texture path slots must remain unchanged');
  assert.deepEqual(await fs.readFile(model), baseModel, 'source model is never modified');
  assert.deepEqual(await fs.readFile(hdModel), hdBytes, 'source HD model is never modified');
  const importedHd = gamePath(skin.config.find((c: any) => c.field === 'file:hd').value);
  const hdReference = modelTextureReferences(importedHd, await fs.readFile(importedHd))[0];
  assert.equal(await fs.readFile(gamePath(hdReference), 'utf8'), 'HD-only texture');

  // MDL follows the same root-relative rule; comments and non-texture paths survive.
  const mdl = path.join(source, 'hero.mdl');
  const mdlText = 'Version { FormatVersion 800, }\nTextures 2 {\nBitmap { Image "A\\body.blp", WrapWidth, }\n' +
    'Bitmap { Image "ReplaceableTextures\\TeamColor\\TeamColor00.blp", ReplaceableId 1, }\n}\n' +
    '// Bitmap { Image "do-not-change.blp", }\nAttachment "hand" { Path "A\\body.blp", }\n';
  await fs.outputFile(mdl, mdlText);
  const mdlSkin = await service.create({ ...input, modelPath: mdl, modelPathHd: undefined, name: 'MDL test' });
  const mdlCopy = gamePath(mdlSkin.config.find((c: any) => c.field === 'file').value);
  const mdlResult = await fs.readFile(mdlCopy, 'utf8');
  assert(mdlResult.includes('Image "cos\\custom\\'));
  assert(mdlResult.includes('// Bitmap { Image "do-not-change.blp", }'));
  assert(mdlResult.includes('Attachment "hand" { Path "A\\body.blp", }'));
  assert(mdlResult.includes('ReplaceableId 1'));
  assert.equal(await fs.readFile(mdl, 'utf8'), mdlText);

  const paired = path.join(source, 'paired.mdx');
  const pairedPortrait = path.join(source, 'paired_portrait.mdx');
  const portraitBytes = mdx([['portrait-only.blp']]);
  await fs.outputFile(paired, mdx([['A/body.blp']]));
  await fs.outputFile(pairedPortrait, portraitBytes);
  await fs.outputFile(path.join(source, 'portrait-only.blp'), 'portrait-only texture');
  const pairInspection = await service.inspectExternalModel(paired, 'hd');
  assert.equal(pairInspection.portraitPath, pairedPortrait);
  assert(pairInspection.references.includes('portrait-only.blp'), 'portrait dependencies enter the guided association list');
  const pairSkin = await service.create({ ...input, modelPath: paired, modelPathHd: undefined, name: 'Paired portrait' });
  const portraitCopy = gamePath(pairSkin.config.find((c: any) => c.field === 'portrait').value);
  assert.match(path.basename(portraitCopy), /^model_portrait\.mdx$/);
  const portraitRef = modelTextureReferences(portraitCopy, await fs.readFile(portraitCopy))[0];
  assert.equal(await fs.readFile(gamePath(portraitRef), 'utf8'), 'portrait-only texture');
  assert.deepEqual(await fs.readFile(pairedPortrait), portraitBytes, 'source portrait remains unchanged');
  await service.remove(pairSkin.id);
  assert.equal(await fs.pathExists(portraitCopy), false, 'portrait is deleted with its imported skin');
  const badPortrait = path.join(source, 'broken_portrait.mdx');
  await fs.outputFile(badPortrait, mdx([['missing-portrait.blp']]));
  assert((await service.inspectExternalModel(paired, 'hd', badPortrait)).unresolved.includes('missing-portrait.blp'));
  await assert.rejects(service.create({ ...input, modelPath: paired, modelPathHd: undefined, portraitPath: badPortrait, name: 'Broken portrait', textureBindings: {} }), /missing-portrait.blp/);

  // Failed imports leave neither records nor partial resource folders behind.
  const badModel = path.join(source, 'missing.mdx');
  await fs.outputFile(badModel, mdx([['missing.blp']]));
  const parent = path.dirname(skin.resourceDir);
  const before = (await fs.readdir(parent)).sort();
  const count = service.getAll().length;
  await assert.rejects(service.create({ ...input, modelPath: badModel, name: 'Missing', textureBindings: {} }), /缺少贴图关联/);
  assert.deepEqual((await fs.readdir(parent)).sort(), before);
  assert.equal(service.getAll().length, count);

  // Existing 3.5 copies used nested original paths without a COS prefix.
  const legacy = gamePath('cos/custom/hd/heroes/Hamg/legacy/model.mdx');
  const legacyBytes = mdx([['war3mapImported\\old.blp']]);
  await fs.outputFile(legacy, legacyBytes);
  await fs.outputFile(path.join(path.dirname(legacy), 'war3mapImported', 'old.blp'), 'legacy texture');
  f.config.customSkins.push({ id: 'legacy', artSet: 'hd', source: 'external', config: [{ field: 'file', value: 'cos\\custom\\hd\\heroes\\Hamg\\legacy\\model.mdx' }] });
  await service.repairImportedModels();
  const repairedBytes = await fs.readFile(legacy);
  const repairedRef = modelTextureReferences(legacy, repairedBytes)[0];
  assert.equal(repairedRef, 'cos\\custom\\hd\\heroes\\Hamg\\legacy\\war3mapImported\\old.blp');
  assert.equal(await fs.readFile(gamePath(repairedRef), 'utf8'), 'legacy texture');
  await service.repairImportedModels();
  assert.deepEqual(await fs.readFile(legacy), repairedBytes, 'repair is idempotent');

  const manual = gamePath('cos/custom/manual/model.mdx');
  await fs.outputFile(manual, legacyBytes);
  await fs.outputFile(path.join(path.dirname(manual), 'war3mapImported', 'old.blp'), 'manual game resource');
  await service.create({ artSet: 'hd', targetId: 'hfoo', name: 'Game path only', category: 'unit', source: 'game-paths',
    modelPath: 'cos/custom/manual/model.mdx' });
  await service.repairImportedModels();
  assert.deepEqual(await fs.readFile(manual), legacyBytes, 'game-path-only skins must not modify their original models');

  f.channel = 'ptr';
  await fs.ensureDir(path.join(root, '_ptr_'));
  const ptrSkin = await service.create({ ...input, artSet: 'sd', modelPath: mdl, modelPathHd: undefined, name: 'PTR SD' });
  const ptrCopy = gamePath(ptrSkin.config.find((c: any) => c.field === 'file').value, '_ptr_');
  const ptrRef = modelTextureReferences(ptrCopy, await fs.readFile(ptrCopy))[0];
  assert.equal((await resources.read({ path: ptrRef, basePath: ptrCopy, artSet: 'sd' }, root)).bytes.toString(), 'A texture');
  assert.deepEqual(await fs.readFile(copied), patched, 'PTR import does not modify Retail');

  // Verify the same fixed-slot rewrite against an actual existing COS model.
  const realModel = 'D:/Quenching/QM/3.5/QMF3.5/cos/DarkIronCaptain/DarkIronCaptain.mdx';
  if (await fs.pathExists(realModel)) {
    const realBytes = await fs.readFile(realModel);
    const refs: string[] = modelTextureReferences(realModel, realBytes);
    const replacements = new Map(refs.filter(ref => /^cos[\\/]/i.test(ref)).map((ref, i) => [textureKey(ref), `cos\\custom\\test\\texture-${i}.dds`]));
    const result = rewriteModelTexturePaths(realModel, realBytes, replacements);
    assert.equal(result.length, realBytes.length);
    assert.deepEqual(modelTextureReferences(realModel, result), refs.map(ref => replacements.get(textureKey(ref)) || ref));
    assert.deepEqual(await fs.readFile(realModel), realBytes, 'real full-package model is read-only');
  }
  console.log('PASS: MDX/MDL texture rebasing, root-relative game/preview resolution, HD dependencies, actual extensions, duplicate basenames, stock/replaceable textures, legacy repair, source preservation, PTR/SD isolation');
} finally {
  resources.close();
  assert.equal(path.dirname(root), os.tmpdir());
  assert(path.basename(root).startsWith('quenching-custom-textures-'));
  await fs.remove(root);
  delete (globalThis as any).__customTextureFixture;
}
