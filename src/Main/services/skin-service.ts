import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import { configManager } from './config-manager';

export interface SkinChange {
  field: string;
  value: string;
}

export interface UnitSkinChange extends SkinChange {
  unitId: string;
}

export class SkinService {
  /**
   * 获取 assets 目录路径
   */
  private async getAssetsDir(): Promise<string> {
    const appPath = app.getAppPath();
    let assetsDir = '';

    if (process.env.NODE_ENV === 'development') {
      const possiblePaths = [
        path.join(process.cwd(), 'assets'),
        path.join(process.cwd(), 'projects', 'QuenChing-Mod-Client', 'assets'),
        path.join(appPath, 'assets'),
        path.join(appPath, 'projects', 'QuenChing-Mod-Client', 'assets')
      ];

      for (const p of possiblePaths) {
        if (await fs.pathExists(p)) {
          assetsDir = p;
          break;
        }
      }
    } else {
      assetsDir = path.join(path.dirname(appPath), 'assets');
    }

    return assetsDir;
  }

  /**
   * 获取游戏 units 目录
   */
  private async getUnitsDir(): Promise<{ baseDir: string; unitsDir: string } | null> {
    const war3Path = configManager.get('war3Path');
    if (!war3Path) return null;

    const retailPath = path.join(war3Path, '_retail_');
    const baseDir = (await fs.pathExists(retailPath)) ? retailPath : war3Path;
    return { baseDir, unitsDir: path.join(baseDir, 'units') };
  }

  /**
   * 关闭皮肤：unitskin.txt -> unitskin-dis.txt
   */
  async disableSkins(): Promise<boolean> {
    const dirs = await this.getUnitsDir();
    if (!dirs) throw new Error('Warcraft III path not configured');

    const unitskinPath = path.join(dirs.unitsDir, 'unitskin.txt');
    const disabledPath = path.join(dirs.unitsDir, 'unitskin-dis.txt');

    if (await fs.pathExists(unitskinPath)) {
      if (await fs.pathExists(disabledPath)) {
        await fs.remove(disabledPath);
      }
      await fs.move(unitskinPath, disabledPath, { overwrite: true });
      console.log('[SkinService] Disabled skins: unitskin.txt -> unitskin-dis.txt');
    }

    return true;
  }

  /**
   * 启用皮肤：unitskin-dis.txt -> unitskin.txt，必要时从模板初始化
   */
  async enableSkins(forceRefresh: boolean = false): Promise<void> {
    const dirs = await this.getUnitsDir();
    if (!dirs) return;

    const unitskinPath = path.join(dirs.unitsDir, 'unitskin.txt');
    const disabledPath = path.join(dirs.unitsDir, 'unitskin-dis.txt');

    if (!(await fs.pathExists(unitskinPath)) && (await fs.pathExists(disabledPath))) {
      await fs.move(disabledPath, unitskinPath, { overwrite: true });
      console.log('[SkinService] Enabled skins: unitskin-dis.txt -> unitskin.txt');
    }

    await this.ensureUnitSkinExists(forceRefresh);
  }

  async isSkinEnabled(): Promise<boolean> {
    const dirs = await this.getUnitsDir();
    if (!dirs) return false;
    return fs.pathExists(path.join(dirs.unitsDir, 'unitskin.txt'));
  }

  /**
   * 确保 unitskin.txt 存在并应用淬火版模板
   */
  async ensureUnitSkinExists(forceRefresh: boolean = false): Promise<void> {
    const dirs = await this.getUnitsDir();
    if (!dirs) return;

    const { baseDir, unitsDir } = dirs;
    const unitskinPath = path.join(unitsDir, 'unitskin.txt');
    const disabledPath = path.join(unitsDir, 'unitskin-dis.txt');
    const exists = await fs.pathExists(unitskinPath);

    if (await fs.pathExists(disabledPath) && !exists) {
      return;
    }

    if (!exists || forceRefresh) {
      await fs.ensureDir(unitsDir);

      const assetsDir = await this.getAssetsDir();
      if (!assetsDir) throw new Error('Assets directory not found');

      const sourceFile = path.join(assetsDir, 'quenching', 'unitskin-new.txt');
      if (await fs.pathExists(sourceFile)) {
        console.log(`[SkinService] Initializing unitskin.txt with quenching template from ${sourceFile}`);
        await fs.copy(sourceFile, unitskinPath, { overwrite: true });
      } else {
        console.warn(`[SkinService] Quenching template missing: ${sourceFile}`);
      }
    }
  }

  async applySkin(unitId: string, changes: SkinChange[]): Promise<boolean> {
    return this.applyBatchSkin([{ unitId, changes }]);
  }

  async applyBatchSkin(batchChanges: { unitId: string; changes: SkinChange[] }[]): Promise<boolean> {
    console.log(`[SkinService] applyBatchSkin called with ${batchChanges.length} units`);
    const war3Path = configManager.get('war3Path');
    if (!war3Path) {
      console.error('[SkinService] Warcraft III path not configured');
      throw new Error('Warcraft III path not configured');
    }

    // 自动检测并初始化 unitskin.txt（若已关闭则先恢复）
    await this.enableSkins();

    const dirs = await this.getUnitsDir();
    if (!dirs) {
      console.error('[SkinService] Warcraft III path not configured');
      throw new Error('Warcraft III path not configured');
    }

    const unitskinPath = path.join(dirs.unitsDir, 'unitskin.txt');
    const baseDir = dirs.baseDir;
    console.log(`[SkinService] Target unitskin.txt: ${unitskinPath}`);

    // 如果初始化后还是不存在，则报错
    if (!(await fs.pathExists(unitskinPath))) {
      console.error(`[SkinService] unitskin.txt not found at ${unitskinPath}`);
      throw new Error(`unitskin.txt not found at ${unitskinPath}`);
    }

    let content = await fs.readFile(unitskinPath, 'utf-8');
    let lines = content.split(/\r?\n/);

    for (const item of batchChanges) {
      const { unitId, changes } = item;
      console.log(`[SkinService] Applying changes to unit [${unitId}]:`, changes);

      // Find the section
      const sectionHeader = `[${unitId}]`;
      let sectionStartIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === sectionHeader) {
          sectionStartIndex = i;
          break;
        }
      }

      if (sectionStartIndex === -1) {
        // If section not found, append it to the end
        lines.push('');
        lines.push(sectionHeader);
        sectionStartIndex = lines.length - 1;
      }

      // Update fields within the section
      for (const change of changes) {
        let finalValue = change.value;

        // 如果是本地绝对路径，需要处理模型搬家
        if (path.isAbsolute(change.value) && (change.value.endsWith('.mdx') || change.value.endsWith('.mdl'))) {
          try {
            const fileName = path.basename(change.value);
            const customSkinsDir = path.join(baseDir, 'CustomSkins', unitId);
            await fs.ensureDir(customSkinsDir);
            const targetPath = path.join(customSkinsDir, fileName);

            // 复制文件到魔兽目录
            await fs.copy(change.value, targetPath);

            // 转换成相对路径供 unitskin.txt 使用
            finalValue = `CustomSkins\\${unitId}\\${fileName}`;
          } catch (error) {
            console.error('Failed to copy custom model file:', error);
            // 如果复制失败，保留原值（虽然可能不生效）
          }
        }

        let found = false;
        // Search from the section header downwards until the next section or end of file
        for (let i = sectionStartIndex + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('[') && line.endsWith(']')) {
            // Reached next section without finding the field
            break;
          }

          if (line.startsWith(`${change.field}=`)) {
            lines[i] = `${change.field}=${finalValue}`;
            found = true;
            break;
          }
        }

        if (!found) {
          // If field not found, insert it right after the section header
          lines.splice(sectionStartIndex + 1, 0, `${change.field}=${finalValue}`);
        }
      }
    }

    await fs.writeFile(unitskinPath, lines.join('\r\n'), 'utf-8');
    return true;
  }
}

export const skinService = new SkinService();
