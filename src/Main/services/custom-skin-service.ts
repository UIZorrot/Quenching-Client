import { getSelectedGameFolder } from './game-channel';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { configManager } from './config-manager';
import { assertArtSet, SkinArtSet } from '../../shared/skin-versions';

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
  createdAt: string;
}

export interface ExternalModelInspection {
  modelPath: string;
  references: string[];
  siblingCandidates: string[];
  unresolved: string[];
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
  iconPath?: string;
  disabledIconPath?: string;
  unitSound?: string;
  textureBindings?: Record<string, string>;
}

const IMAGE_EXTENSIONS = new Set(['.blp', '.dds', '.tga', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
const MODEL_EXTENSIONS = new Set(['.mdx', '.mdl', '.m3']);
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

function extractReferences(modelPath: string, data: Buffer): string[] {
  const ext = path.extname(modelPath).toLowerCase();
  const source = ext === '.mdl' ? data.toString('utf8') : data.toString('latin1');
  const found = new Set<string>();
  const patterns = [
    /(?:Image|Texture|ReplaceableId|file|Path)\s*[^\n\r{}]*["']([^"']+\.(?:blp|dds|tga|png|jpe?g|gif|webp))['"]/gi,
    /([A-Za-z0-9_./\\ -]+\.(?:blp|dds|tga|png|jpe?g|gif|webp))/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = normalizeRef(match[1]);
      if (value && !value.startsWith('replaceabletextures/teamcolor') && !value.startsWith('replaceabletextures/teamglow')) {
        found.add(value);
      }
    }
  }
  return [...found].slice(0, 256);
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

export class CustomSkinService {
  getAll(): CustomSkinRecord[] {
    return ((configManager.get('customSkins') as unknown as CustomSkinRecord[] | undefined) ?? [])
      .map(skin => ({ ...skin, artSet: skin.artSet || 'hd' }));
  }

  getForTarget(targetId: string): CustomSkinRecord[] {
    return this.getAll().filter((skin) => skin.targetId === targetId);
  }

  async inspectExternalModel(modelPath: string): Promise<ExternalModelInspection> {
    await validateFile(modelPath, MODEL_EXTENSIONS);
    const data = await fs.readFile(modelPath);
    const references = extractReferences(modelPath, data);
    const sourceDir = path.dirname(modelPath);
    const siblingCandidates: string[] = [];
    for (const reference of references) {
      const candidate = path.resolve(sourceDir, reference);
      if (await fs.pathExists(candidate)) siblingCandidates.push(candidate);
      else {
        const basename = path.basename(reference).toLowerCase();
        const siblings = await fs.readdir(sourceDir);
        const match = siblings.find((entry) => entry.toLowerCase() === basename);
        if (match) siblingCandidates.push(path.join(sourceDir, match));
      }
    }
    return {
      modelPath,
      references,
      siblingCandidates,
      unresolved: references.filter((reference) => !siblingCandidates.some((candidate) => path.basename(candidate).toLowerCase() === path.basename(reference).toLowerCase())),
    };
  }

  async create(input: CreateCustomSkinInput): Promise<CustomSkinRecord> {
    assertArtSet(input.artSet);
    if (!input.targetId || !input.name.trim()) throw new Error('目标单位和皮肤名称不能为空');
    if (!['unit', 'building', 'hero'].includes(input.category)) throw new Error('无效的皮肤类别');
    if (input.source === 'external' && (!input.modelPath || !input.iconPath || !input.disabledIconPath)) {
      throw new Error('外部模型皮肤需要模型、btn 图标和 disablebtn 图标');
    }
    if (input.unitSound?.trim() && input.source === 'external') {
      throw new Error('外部皮肤不允许导入声音，请使用单位原声音效');
    }

    const baseDir = await resolveBaseDir();
    const folder = `${cleanName(input.name, 'skin')}-${crypto.randomUUID().slice(0, 8)}`;
    const categoryDir = input.category === 'building' ? 'buildings' : input.category === 'hero' ? 'heroes' : 'units';
    const skinId = `custom_${crypto.randomUUID()}`;
    const skinDir = path.join(baseDir, 'cos', 'custom', input.artSet, categoryDir, cleanName(input.targetId, 'target'), folder);
    await fs.ensureDir(skinDir);

    const config: { field: string; value: string }[] = [];
    const modelExtension = path.extname(input.modelPath || input.modelPathHd || '.mdx').toLowerCase();
    const relativeModel = `cos\\custom\\${input.artSet}\\${categoryDir}\\${cleanName(input.targetId, 'target')}\\${folder}\\model${modelExtension}`;

    if (input.source === 'game-paths') {
      if (input.modelPath?.trim()) config.push({ field: 'file', value: safeRelative(input.modelPath) });
      if (input.modelPathHd?.trim()) config.push({ field: 'file:hd', value: safeRelative(input.modelPathHd) });
      if (input.iconPath?.trim()) config.push({ field: 'Art', value: safeRelative(input.iconPath) });
      if (input.unitSound?.trim()) config.push({ field: 'unitSound', value: input.unitSound.trim().slice(0, 128) });
    } else {
      await copyAsset(input.modelPath!, path.join(skinDir, `model${path.extname(input.modelPath!).toLowerCase()}`));
      if (input.modelPathHd) await copyAsset(input.modelPathHd, path.join(skinDir, `model-hd${path.extname(input.modelPathHd).toLowerCase()}`));
      const iconExt = path.extname(input.iconPath!).toLowerCase();
      const disabledIconExt = path.extname(input.disabledIconPath!).toLowerCase();
      await copyAsset(input.iconPath!, path.join(skinDir, `btn${iconExt}`));
      await copyAsset(input.disabledIconPath!, path.join(skinDir, `disablebtn${disabledIconExt}`));

      const inspection = await this.inspectExternalModel(input.modelPath!);
      const bindings = input.textureBindings ?? {};
      for (const reference of inspection.references) {
        const source = bindings[reference] || inspection.siblingCandidates.find((candidate) => path.basename(candidate).toLowerCase() === path.basename(reference).toLowerCase());
        if (!source) throw new Error(`缺少贴图关联: ${reference}`);
        await copyAsset(source, path.join(skinDir, safeRelative(reference)));
      }
      config.push({ field: 'file', value: relativeModel });
      if (input.modelPathHd) config.push({ field: 'file:hd', value: relativeModel.replace(/\\model\.[^.]+$/i, `\\model-hd${path.extname(input.modelPathHd).toLowerCase()}`) });
      config.push({ field: 'Art', value: relativeModel.replace(/\\model\.[^.]+$/i, `\\btn${iconExt}`) });
      config.push({ field: 'Art:hd', value: relativeModel.replace(/\\model\.[^.]+$/i, `\\btn${iconExt}`) });
      // The game keeps the original unit sound when no sound field is written.
      if (input.unitSound?.trim()) config.push({ field: 'unitSound', value: input.unitSound.trim().slice(0, 128) });
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
      preview: input.source === 'external' ? path.join(skinDir, `btn${path.extname(input.iconPath || '.blp').toLowerCase()}`) : undefined,
      createdAt: new Date().toISOString(),
    };
    const records = this.getAll().filter((item) => item.id !== record.id);
    configManager.set('customSkins', [...records, record] as never);
    return record;
  }
}

export const customSkinService = new CustomSkinService();
