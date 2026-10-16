import { getSelectedGameFolder } from './game-channel';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { configManager } from './config-manager';
import { assertArtSet, SkinArtSet } from '../../shared/skin-versions';
import { versionSkinService } from './version-skin-service';
import { Storage } from '@jamiephan/casclib';
import { openGameCascStorage } from './casc-storage';
import { resourceCandidates } from './model-resource-service';
import { modelTextureReferences, rewriteModelTexturePaths, repairImportedModelTextures, textureKey } from './custom-model-textures';
import { indexTextureDirectory } from './texture-directory-index';
import { CustomIconFiles, installCustomIconPair, removeCustomIconPair } from './custom-skin-icons';
import { isBranchModDisabled, resolveBranchModFile } from './branch-mod-toggle';
import { companionPortraits, PortraitAssociation } from './skin-portrait';

export type CustomSkinCategory = 'unit' | 'building' | 'hero';
export type CustomSkinSource = 'game-paths' | 'external';

export interface CustomSkinRecord {
  artSet: SkinArtSet;
  id: string;
  targetId: string;
  category: CustomSkinCategory;
  race?: string;
  name: string;
  source: CustomSkinSource;
  config: { field: string; value: string }[];
  preview?: string;
  resourceDir?: string;
  iconFiles?: CustomIconFiles;
  createdAt: string;
  portraitAssociation?: PortraitAssociation;
}

export interface ExternalModelInspection {
  modelPath: string;
  references: string[];
  siblingCandidates: string[];
  unresolved: string[];
  textureBindings: Record<string, string>;
  gameReferences: string[];
  gameTextureBindings: Record<string, string>;
  portraitPath?: string;
}

interface CreateCustomSkinInput {
  artSet: SkinArtSet;
  targetId: string;
  category: CustomSkinCategory;
  race?: string;
  name: string;
  source: CustomSkinSource;
  modelPath?: string;
  modelPathHd?: string;
  portraitPath?: string;
  iconPath?: string;
  disabledIconPath?: string;
  unitSound?: string;
  textureBindings?: Record<string, string>;
}

const IMAGE_EXTENSIONS = new Set(['.blp', '.dds', '.tga', '.tif', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
const MODEL_EXTENSIONS = new Set(['.mdx', '.mdl']);
const MAX_ASSET_SIZE = 128 * 1024 * 1024;

function cleanName(value: string, fallback: string): string {
  const clean = value.trim().replace(/[^\w\-\u4e00-\u9fff ]+/g, '_').replace(/\s+/g, '_').slice(0, 48);
  return clean || fallback;
}

function normalizeRef(value: string): string {
  return value.replace(/\\/g, '/').replace(/^[/]+/, '').replace(/^\.\//, '');
}

function safeRelative(value: string): string {
  const normalized = normalizeRef(value);
  if (!normalized || /[:\r\n\0]/.test(normalized) || normalized.split('/').some((part) => part === '..')) {
    throw new Error(`Invalid model resource path: ${value}`);
  }
  return normalized;
}

async function validateFile(filePath: string, extensions: Set<string>): Promise<void> {
  if (!path.isAbsolute(filePath)) throw new Error('外部资源必须使用绝对路径');
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size > MAX_ASSET_SIZE) throw new Error(`资源不可用或过大: ${filePath}`);
  if (!extensions.has(path.extname(filePath).toLowerCase())) throw new Error(`不支持的资源类型: ${filePath}`);
}

async function resolveBaseDir(): Promise<string> {
  const war3Path = configManager.get('war3Path');
  if (!war3Path) throw new Error('Warcraft III path not configured');
  const retail = path.join(war3Path, getSelectedGameFolder());
  return (await fs.pathExists(retail)) ? retail : war3Path;
}

async function copyAsset(sourcePath: string, targetPath: string): Promise<void> {
  await validateFile(sourcePath, new Set([...MODEL_EXTENSIONS, ...IMAGE_EXTENSIONS]));
  await fs.ensureDir(path.dirname(targetPath));
  await fs.copy(sourcePath, targetPath, { overwrite: true });
}

async function externalPortrait(modelPath: string, explicit?: string): Promise<string | undefined> {
  if (explicit?.trim()) { await validateFile(explicit, MODEL_EXTENSIONS); return explicit; }
  for (const candidate of companionPortraits(modelPath)) {
    if ((await fs.stat(candidate).catch(() => null))?.isFile()) return candidate;
  }
}

export class CustomSkinService {
  getAll(): CustomSkinRecord[] {
    return ((configManager.get('customSkins') as unknown as CustomSkinRecord[] | undefined) ?? [])
      .map(skin => ({ ...skin, artSet: skin.artSet || 'hd' }));
  }

  getForTarget(targetId: string): CustomSkinRecord[] {
    return this.getAll().filter((skin) => skin.targetId === targetId);
  }

  async remove(id: string): Promise<void> {
    const records = this.getAll();
    const skin = records.find(record => record.id === id);
    if (!skin) return;
    await versionSkinService.resetCustomSkin(id);
    // Delete only this imported skin's own directory, never game-path resources.
    if (skin.source === 'external') {
      const base = await resolveBaseDir();
      await removeCustomIconPair(base, skin.id);
      const model = skin.config.find(change => change.field === 'file')?.value;
      // The branch switch can move the import after resourceDir was recorded.
      const dir = model && /^cos[\\/]custom[\\/]/i.test(model)
        ? path.dirname(path.join(base, safeRelative(model))) : skin.resourceDir || '';
      const normalized = dir.replace(/\\/g, '/');
      if (dir && /\/cos\/custom\/(sd|hd|de)\/(units|buildings|heroes)\/[^/]+\/[^/]+$/i.test(normalized)) {
        const relative = path.relative(base, dir);
        if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
          await fs.remove(dir);
          await fs.remove(path.join(base, 'QMoff', relative));
          if (model) {
            const parkedDir = path.dirname(await resolveBranchModFile(base, safeRelative(model)));
            if (parkedDir !== dir && parkedDir.startsWith(base + path.sep) &&
              /\/cos\/custom\/(sd|hd|de)\/(units|buildings|heroes)\/[^/]+\/[^/]+$/i.test(parkedDir.replace(/\\/g, '/'))) {
              await fs.remove(parkedDir);
            }
          }
        }
      }
    }
    configManager.set('customSkins', records.filter(record => record.id !== id) as never);
  }

  async repairImportedModels(): Promise<void> {
    if (!configManager.get('war3Path')) return;
    const base = await resolveBaseDir();
    if (await isBranchModDisabled(base)) { await this.repairImportedIcons(); return; }
    for (const skin of this.getAll()) {
      if (skin.source !== 'external') continue;
      for (const change of skin.config) {
        if (!['file', 'file:hd', 'portrait', 'portrait:hd'].includes(change.field) || !/^cos[\\/]custom[\\/]/i.test(change.value)) continue;
        await repairImportedModelTextures(path.join(base, safeRelative(change.value)), base);
      }
    }
    await this.repairImportedIcons();
  }

  /** Upgrade old btn/disablebtn imports and retain originals for future branch restores. */
  async repairImportedIcons(refreshSelections = true): Promise<void> {
    if (!configManager.get('war3Path')) return;
    const base = await resolveBaseDir();
    const disabled = await isBranchModDisabled(base);
    const records = this.getAll();
    let changed = false;
    for (const skin of records) {
      if (skin.source !== 'external') continue;
      const model = skin.config.find(change => change.field === 'file')?.value;
      if (!model || !/^cos[\\/]custom[\\/](sd|hd|de)[\\/](units|buildings|heroes)[\\/][^\\/]+[\\/][^\\/]+[\\/]model\.(mdx|mdl)$/i.test(model)) continue;
      const relativeDir = path.dirname(safeRelative(model));
      let directory = path.dirname(await resolveBranchModFile(base, safeRelative(model)));
      if (!(await fs.pathExists(directory))) directory = path.join(base, 'QMoff', relativeDir);
      if (!(await fs.pathExists(directory))) continue;
      const names = await fs.readdir(directory);
      const enabled = names.find(name => /^btn\.(blp|dds|tga|tif|png|jpe?g|gif|webp)$/i.test(name));
      const inactive = names.find(name => /^disablebtn\.(blp|dds|tga|tif|png|jpe?g|gif|webp)$/i.test(name));
      if (!enabled || !inactive) continue;
      const deployment = disabled ? path.join(base, 'QMoff') : base;
      const ready = skin.iconFiles && (await Promise.all(Object.values(skin.iconFiles)
        .map(ref => fs.pathExists(path.join(deployment, safeRelative(ref)))))).every(Boolean);
      const files = ready ? skin.iconFiles! : await installCustomIconPair(deployment, skin.id,
        path.join(directory, enabled), path.join(directory, inactive));
      if (skin.iconFiles?.enabled === files.enabled && skin.config.filter(c => c.field === 'Art' || c.field === 'Art:hd')
        .every(c => c.value === files.enabled) && skin.config.some(c => c.field === 'Art')) continue;
      skin.iconFiles = files;
      skin.config = [...skin.config.filter(c => c.field !== 'Art' && c.field !== 'Art:hd'), { field: 'Art', value: files.enabled }];
      if (refreshSelections) await versionSkinService.refreshCustomSkin(skin.id, skin.config);
      changed = true;
    }
    if (changed) configManager.set('customSkins', records as never);
  }

  async inspectExternalModel(modelPath: string, artSet: SkinArtSet = 'hd', portraitPath?: string, includePortrait = true): Promise<ExternalModelInspection> {
    assertArtSet(artSet);
    await validateFile(modelPath, MODEL_EXTENSIONS);
    const data = await fs.readFile(modelPath);
    let references = modelTextureReferences(modelPath, data).map(normalizeRef);
    const directoryIndex = await indexTextureDirectory(path.dirname(modelPath));
    const textureBindings: Record<string, string> = {};
    for (const reference of references) {
      const hit = directoryIndex.resolve(reference);
      if (hit) textureBindings[reference] = hit;
    }
    // Exact game references take priority over an unrelated local basename.
    // Query CASC's index only; players never need to export built-in textures.
    const gameTextureBindings: Record<string, string> = {};
    const storage = new Storage();
    let storageOpened = false;
    let storageUnavailable = false;
    let releasePath: (() => void) | undefined;
    try {
      const root = configManager.get('war3Path');
      if (root && references.some(ref => !textureBindings[ref])) {
        const gameRoot = ['_retail_', '_ptr_'].includes(path.basename(root).toLowerCase()) ? path.dirname(root) : root;
        const branch = await resolveBaseDir();
        for (const reference of references.filter(ref => !textureBindings[ref])) {
          try {
            const candidates = resourceCandidates({ path: reference, artSet });
            const layer = candidates.prefix.includes('_de.') ? '_de.w3mod' : candidates.prefix.includes('_hd.') ? '_hd.w3mod' : '';
            for (const name of candidates.names) {
              const bases = layer ? [path.join(branch, layer), branch] : [branch];
              if ((await Promise.all(bases.map(base => fs.stat(path.join(base, name)).catch(() => null)))).some(stat => stat?.isFile())) {
                gameTextureBindings[reference] = name;
                break;
              }
            }
            if (gameTextureBindings[reference] || storageUnavailable) continue;
            if (!storageOpened) {
              try { releasePath = (await openGameCascStorage(storage, gameRoot)).release; storageOpened = true; }
              catch { storageUnavailable = true; continue; }
            }
            const match = candidates.casc.find(candidate => storage.fileExists(candidate));
            if (match) gameTextureBindings[reference] = normalizeRef(match.slice(match.lastIndexOf(':') + 1));
          } catch { /* A non-game reference remains available for manual binding. */ }
        }
      }
    } catch { /* Without CASC, unresolved files can still be explicitly bound. */ }
    finally { try { storage.close(); } catch {} releasePath?.(); }
    for (const reference of references) {
      if (textureBindings[reference] || gameTextureBindings[reference]) continue;
      const hit = directoryIndex.resolve(reference, true);
      if (hit) textureBindings[reference] = hit;
    }
    const portrait = includePortrait ? await externalPortrait(modelPath, portraitPath) : undefined;
    if (portrait) {
      const inspection = await this.inspectExternalModel(portrait, artSet, undefined, false);
      references = [...new Set([...references, ...inspection.references])];
      for (const [ref, value] of Object.entries(inspection.textureBindings)) if (!textureBindings[ref]) textureBindings[ref] = value;
      Object.assign(gameTextureBindings, inspection.gameTextureBindings);
    }
    const gameReferences = Object.keys(gameTextureBindings);
    return {
      modelPath,
      references,
      siblingCandidates: Object.values(textureBindings),
      textureBindings,
      gameReferences,
      gameTextureBindings,
      portraitPath: portrait,
      unresolved: references.filter(reference => !textureBindings[reference] && !gameReferences.includes(reference)),
    };
  }

  async create(input: CreateCustomSkinInput): Promise<CustomSkinRecord> {
    assertArtSet(input.artSet);
    if (!input.targetId || !input.name.trim()) throw new Error('目标单位和皮肤名称不能为空');
    if (!['unit', 'building', 'hero'].includes(input.category)) throw new Error('无效的皮肤类别');
    if (input.source === 'external' && !input.modelPath?.trim()) {
      throw new Error('外部模型皮肤需要模型');
    }
    const hasIcon = !!input.iconPath?.trim(), hasDisabledIcon = !!input.disabledIconPath?.trim();
    if (input.source === 'external' && hasIcon !== hasDisabledIcon) {
      throw new Error('自定义图标需同时配置 BTN 和 DISBTN；都留空时沿用原版图标');
    }
    if (input.unitSound?.trim() && input.source === 'external') {
      throw new Error('外部皮肤不允许导入声音，请使用单位原声音效');
    }

    const baseDir = await resolveBaseDir();
    // ASCII import directories keep Warcraft's fixed-size texture paths portable.
    const folder = `${cleanName(input.name, 'skin').replace(/[^\x20-\x7e]/g, '_').slice(0, 24)}-${crypto.randomUUID().slice(0, 8)}`;
    const categoryDir = input.category === 'building' ? 'buildings' : input.category === 'hero' ? 'heroes' : 'units';
    const skinId = `custom_${crypto.randomUUID()}`;
    const skinDir = path.join(baseDir, 'cos', 'custom', input.artSet, categoryDir, cleanName(input.targetId, 'target'), folder);
    await fs.ensureDir(skinDir);

    const config: { field: string; value: string }[] = [];
    let portraitAssociation: PortraitAssociation | undefined;
    let iconFiles: CustomIconFiles | undefined;
    const modelExtension = path.extname(input.modelPath || input.modelPathHd || '.mdx').toLowerCase();
    const relativeModel = `cos\\custom\\${input.artSet}\\${categoryDir}\\${cleanName(input.targetId, 'target')}\\${folder}\\model${modelExtension}`;

    if (input.source === 'game-paths') {
      if (input.modelPath?.trim()) config.push({ field: 'file', value: safeRelative(input.modelPath) });
      if (input.modelPathHd?.trim()) config.push({ field: 'file:hd', value: safeRelative(input.modelPathHd) });
      if (input.iconPath?.trim()) config.push({ field: 'Art', value: safeRelative(input.iconPath) });
      if (input.unitSound?.trim()) config.push({ field: 'unitSound', value: input.unitSound.trim().slice(0, 128) });
      try {
        const originalModel = (await versionSkinService.panel(input.artSet)).originals[input.targetId]?.find(c => c.field === 'file')?.value;
        const model = input.artSet === 'hd' && input.modelPathHd ? input.modelPathHd : input.modelPath?.trim() || originalModel;
        if (model) portraitAssociation = await versionSkinService.portrait(input.artSet, input.targetId, model,
          input.portraitPath?.trim() ? safeRelative(input.portraitPath) : undefined);
        if (portraitAssociation?.path) config.push({ field: 'portrait', value: portraitAssociation.path });
      } catch (error) { await fs.remove(skinDir); throw error; }
    } else {
      try {
        const textureTargets = new Map<string, string>();
        const explicitBindings = new Map(Object.entries(input.textureBindings ?? {}).map(([ref, source]) => [textureKey(ref), source]));
        const models: Array<[string, string]> = [[input.modelPath!, 'model']];
        if (input.modelPathHd) models.push([input.modelPathHd, 'model-hd']);
        const portrait = await externalPortrait(input.modelPath!, input.portraitPath);
        if (portrait) models.push([portrait, 'model_portrait']);
        const hdPortrait = input.modelPathHd ? await externalPortrait(input.modelPathHd) : undefined;
        if (hdPortrait) models.push([hdPortrait, 'model-hd_portrait']);
        for (const [sourceModel, name] of models) {
          const inspection = await this.inspectExternalModel(sourceModel, input.artSet, undefined, false);
          const replacements = new Map<string, string>();
          for (const reference of inspection.references) {
            const source = explicitBindings.get(textureKey(reference)) || inspection.textureBindings[reference];
            if (!source) {
              const gamePath = inspection.gameTextureBindings[reference];
              if (gamePath) {
                // Correct built-in aliases too (e.g. a model names .tif, CASC stores .dds).
                if (textureKey(gamePath) !== textureKey(reference)) replacements.set(textureKey(reference), gamePath.replace(/\//g, '\\'));
                continue;
              }
              throw new Error(`缺少贴图关联: ${reference}`);
            }
            await validateFile(source, IMAGE_EXTENSIONS);
            const sourceKey = path.resolve(source).toLowerCase();
            let target = textureTargets.get(sourceKey);
            if (!target) {
              // Use the supplied file's actual extension, not the old model path's.
              const filename = `texture-${textureTargets.size}${path.extname(source).toLowerCase()}`;
              const destination = path.join(skinDir, 'textures', filename);
              await copyAsset(source, destination);
              target = path.relative(baseDir, destination).split(path.sep).join('\\');
              textureTargets.set(sourceKey, target);
            }
            replacements.set(textureKey(reference), target);
          }
          const modelData = await fs.readFile(sourceModel);
          await fs.writeFile(path.join(skinDir, `${name}${path.extname(sourceModel).toLowerCase()}`),
            rewriteModelTexturePaths(sourceModel, modelData, replacements));
        }
        if (hasIcon) {
          const iconExt = path.extname(input.iconPath!).toLowerCase();
          const disabledIconExt = path.extname(input.disabledIconPath!).toLowerCase();
          await copyAsset(input.iconPath!, path.join(skinDir, `btn${iconExt}`));
          await copyAsset(input.disabledIconPath!, path.join(skinDir, `disablebtn${disabledIconExt}`));
          const deployment = await isBranchModDisabled(baseDir) ? path.join(baseDir, 'QMoff') : baseDir;
          iconFiles = await installCustomIconPair(deployment, skinId, input.iconPath!, input.disabledIconPath!);
        }

        config.push({ field: 'file', value: relativeModel });
        if (input.modelPathHd) config.push({ field: 'file:hd', value: relativeModel.replace(/\\model\.[^.]+$/i, `\\model-hd${path.extname(input.modelPathHd).toLowerCase()}`) });
        if (portrait) config.push({ field: 'portrait', value: relativeModel.replace(/\\model\.[^.]+$/i, `\\model_portrait${path.extname(portrait).toLowerCase()}`) });
        if (hdPortrait) config.push({ field: 'portrait:hd', value: relativeModel.replace(/\\model\.[^.]+$/i, `\\model-hd_portrait${path.extname(hdPortrait).toLowerCase()}`) });
        const selectedModel = input.artSet === 'hd' && input.modelPathHd ? config.find(c => c.field === 'file:hd')!.value : relativeModel;
        const selectedPortrait = input.artSet === 'hd' && hdPortrait ? config.find(c => c.field === 'portrait:hd')!.value : config.find(c => c.field === 'portrait')?.value;
        portraitAssociation = await versionSkinService.portrait(input.artSet, input.targetId, selectedModel, selectedPortrait);
        if (!selectedPortrait && portraitAssociation.path) config.push({ field: 'portrait', value: portraitAssociation.path });
        // No override means writeVersionSkins inherits this art set's baseline
        // Art, not a previous custom skin's icon. Do not create placeholder icons.
        if (iconFiles) config.push({ field: 'Art', value: iconFiles.enabled });
        // The game keeps the original unit sound when no sound field is written.
        if (input.unitSound?.trim()) config.push({ field: 'unitSound', value: input.unitSound.trim().slice(0, 128) });
      } catch (error) {
        await fs.remove(skinDir);
        await removeCustomIconPair(baseDir, skinId);
        throw error;
      }
    }

    const record: CustomSkinRecord = {
      artSet: input.artSet,
      id: skinId,
      targetId: input.targetId,
      category: input.category,
      race: input.race,
      name: input.name.trim().slice(0, 80),
      source: input.source,
      config,
      preview: input.source === 'external' && iconFiles ? path.join(skinDir, `btn${path.extname(input.iconPath!).toLowerCase()}`) : undefined,
      resourceDir: input.source === 'external' ? skinDir : undefined,
      iconFiles,
      createdAt: new Date().toISOString(),
      portraitAssociation,
    };
    const records = this.getAll().filter((item) => item.id !== record.id);
    configManager.set('customSkins', [...records, record] as never);
    return record;
  }
}

export const customSkinService = new CustomSkinService();
