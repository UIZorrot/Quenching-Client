import { getSelectedGameFolder } from './game-channel';
import fs from 'fs-extra';
import path from 'path';
import { Storage } from '@jamiephan/casclib';
import { configManager } from './config-manager';
import { skinService, usesFullPackageSkinResource } from './skin-service';
import { assertFullPackageInstalled } from './full-package-service';
import { AssetSyncService } from './asset-sync';
import { assertArtSet, originalSkin, parseSkinSections, writeVersionSkins, SkinArtSet, SkinSections, SkinSelections, VersionSkinChoice } from '../../shared/skin-versions';
import { activeSkinProfile, storedSkinPath, unitSkinTemplate } from './unit-skin-profile';

class VersionSkinService {
  private queue: Promise<unknown> = Promise.resolve();
  private cache = new Map<string, SkinSections>();
  private async baseline(root: string, artSet: SkinArtSet) {
    const cached = this.cache.get(`${root}:casc`) || this.cache.get(`${root}:${artSet}`);
    if (cached) return cached;
    let text: string;
    let fromCasc = false;
    const storage = new Storage();
    try {
      storage.open(root + '*w3');
      const file = storage.openFile('war3.w3mod:units\\unitskin.txt');
      try { text = file.readAll().toString('utf8'); fromCasc = true; } finally { file.close(); }
    } catch {
      const assets = await AssetSyncService.getAssetsDir();
      if (!assets) throw new Error('无法读取游戏原版皮肤配置');
      text = await fs.readFile(unitSkinTemplate(path.join(assets, 'quenching'), artSet), 'utf8');
    } finally { try { storage.close(); } catch {} }
    const sections = parseSkinSections(text);
    this.cache.set(fromCasc ? `${root}:casc` : `${root}:${artSet}`, sections);
    return sections;
  }
  private root() {
    const root = configManager.get('war3Path');
    if (!root) throw new Error('请先配置魔兽争霸安装目录');
    return root;
  }
  private key(root: string) { return path.resolve(root).toLowerCase(); }
  async panel(artSet: SkinArtSet) {
    assertArtSet(artSet);
    const root = this.root();
    const sections = await this.baseline(root, artSet);
    const selections = (configManager.get('skinSelections') || {})[this.key(root)] || {};
    return { selections, originals: Object.fromEntries(Object.entries(sections).map(([id, section]) => [id, originalSkin(section, artSet)])) };
  }
  apply(artSet: SkinArtSet, choices: VersionSkinChoice[]): Promise<SkinSelections> {
    const root = this.root();
    const operation = this.queue.then(async () => {
      assertArtSet(artSet);
      if (this.root() !== root) throw new Error('游戏目录已切换，请重试');
      const baseline = await this.baseline(root, artSet);
      // Validate before enabling/writing any files.
      writeVersionSkins('', baseline, artSet, choices);
      if (choices.some(c => usesFullPackageSkinResource(c.changes))) await assertFullPackageInstalled(root);
      const retail = await fs.pathExists(path.join(root, getSelectedGameFolder())) ? path.join(root, getSelectedGameFolder()) : root;
      const targetProfile = artSet === 'hd' &&
        (configManager.get('retroSkinUnits') === true || configManager.get('retroSkinBuildings') === true)
        ? 'hd-retro' : artSet;
      const activeProfile = await activeSkinProfile(retail) || 'hd';
      let target: string;
      if (targetProfile === activeProfile) {
        await skinService.enableSkins();
        target = path.join(retail, 'units', 'unitskin.txt');
      } else {
        const parked = storedSkinPath(retail, targetProfile);
        const parkedDisabled = storedSkinPath(retail, targetProfile, true);
        target = await fs.pathExists(parked) ? parked
          : await fs.pathExists(parkedDisabled) ? parkedDisabled : parked;
        if (!(await fs.pathExists(target))) {
          const assets = await AssetSyncService.getAssetsDir();
          await fs.ensureDir(path.dirname(target));
          await fs.copy(unitSkinTemplate(path.join(assets, 'quenching'), targetProfile), target);
        }
      }
      const before = await fs.readFile(target, 'utf8');
      const after = writeVersionSkins(before, baseline, artSet, choices);
      await fs.writeFile(target, after, 'utf8');
      const all = configManager.get('skinSelections') || {};
      const current = all[this.key(root)] || {};
      const selections = { ...current, [artSet]: { ...current[artSet], ...Object.fromEntries(choices.map(c => [c.unitId, c.skinId])) } };
      configManager.set('skinSelections', { ...all, [this.key(root)]: selections });
      return selections;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
export const versionSkinService = new VersionSkinService();
