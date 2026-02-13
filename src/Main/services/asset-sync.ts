import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import { app } from 'electron';
import { configManager } from './config-manager';
import crypto from 'crypto';

// 文件指纹配置：用于验证资源版本
const ASSET_FINGERPRINTS: Record<string, { file: string; expectedHash: string }> = {
  'zip-shaders.zip': {
    file: 'ps/hd.bls',
    expectedHash: '' // 留空，首次运行时计算
  },
  'zip-environment.zip': {
    file: 'foliage/foliage.txt',
    expectedHash: ''
  },
  'zip-scripts.zip': {
    file: 'blizzard.j',
    expectedHash: ''
  }
};

export class AssetSyncService {
  static async getAssetsDir(): Promise<string> {
    const appPath = app.getAppPath();
    if (process.env.NODE_ENV === 'development') {
      const candidates = [
        path.join(process.cwd(), 'assets'),
        path.join(process.cwd(), 'public', 'assets'),
        path.join(process.cwd(), 'QuenChing-Electron-Client', 'assets'),
        path.join(process.cwd(), 'projects', 'QuenChing-Mod-Client', 'assets'),
        path.join(appPath, 'assets'),
        path.join(appPath, 'projects', 'QuenChing-Mod-Client', 'assets'),
      ];
      console.log(`[AssetSync] Searching for assets in:`, candidates);
      for (const p of candidates) {
        if (await fs.pathExists(p)) {
          console.log(`[AssetSync] Found local assets at: ${p}`);
          return p;
        }
      }
      return candidates[0];
    } else {
      return path.join(path.dirname(appPath), 'assets');
    }
  }

  static async extractZip(zipPath: string, extractPath: string, onProgress?: (percent: number, currentFile: string) => void): Promise<void> {
    // ... existing extractZip code ...
    await fs.ensureDir(extractPath);
    await new Promise<void>((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) { reject(err); return; }

        const totalEntries = zipfile.entryCount;
        let extractedEntries = 0;

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          extractedEntries++;
          if (onProgress) {
            const percent = Math.round((extractedEntries / totalEntries) * 100);
            onProgress(percent, entry.fileName);
          }

          // 标准化路径，处理可能存在的反斜杠
          const normalizedFileName = entry.fileName.replace(/\\/g, '/');
          const fullPath = path.join(extractPath, normalizedFileName);

          if (normalizedFileName.endsWith('/')) {
            // 目录条目
            fs.ensureDir(fullPath)
              .then(() => zipfile.readEntry())
              .catch(reject);
          } else {
            // 文件条目
            zipfile.openReadStream(entry, (err2, readStream) => {
              if (err2 || !readStream) {
                reject(err2);
                return;
              }

              fs.ensureDir(path.dirname(fullPath))
                .then(() => {
                  const writeStream = fs.createWriteStream(fullPath);
                  readStream.pipe(writeStream);
                  writeStream.on('close', () => {
                    zipfile.readEntry();
                  });
                  writeStream.on('error', (err3) => {
                    reject(err3);
                  });
                })
                .catch(reject);
            });
          }
        });
        zipfile.on('end', () => resolve());
        zipfile.on('error', (e) => reject(e));
      });
    });
  }

  /**
   * 计算文件的 MD5 哈希值
   */
  private static async calculateFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      console.warn(`[AssetSync] Failed to calculate hash for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * 验证资源文件夹的版本指纹
   */
  private static async verifyAssetFingerprint(
    zipName: string,
    targetDir: string
  ): Promise<boolean> {
    const fingerprintConfig = ASSET_FINGERPRINTS[zipName];
    if (!fingerprintConfig) {
      // 没有配置指纹的资源，默认通过
      return true;
    }

    const signatureFile = path.join(targetDir, fingerprintConfig.file);
    if (!(await fs.pathExists(signatureFile))) {
      console.log(`[AssetSync] Signature file not found: ${signatureFile}`);
      return false;
    }

    const actualHash = await this.calculateFileHash(signatureFile);
    if (!actualHash) {
      return false;
    }

    // 如果没有设置期望的哈希值，记录当前哈希值
    if (!fingerprintConfig.expectedHash) {
      console.log(`[AssetSync] First run for ${zipName}, recording hash: ${actualHash}`);
      console.log(`[AssetSync] Add this to ASSET_FINGERPRINTS: expectedHash: '${actualHash}'`);
      return true;
    }

    if (actualHash !== fingerprintConfig.expectedHash) {
      console.log(`[AssetSync] Version mismatch for ${zipName}!`);
      console.log(`[AssetSync] Expected: ${fingerprintConfig.expectedHash}`);
      console.log(`[AssetSync] Actual:   ${actualHash}`);
      return false;
    }

    console.log(`[AssetSync] Version verified for ${zipName}`);
    return true;
  }

  static async syncAssetsBeforeLaunch(war3Path: string): Promise<void> {
    console.log('\n[AssetSync] ===== syncAssetsBeforeLaunch CALLED =====');
    console.log(`[AssetSync] Target War3 Path: ${war3Path}`);

    const modSettings = configManager.get('modSettings');
    const isModEnabled = modSettings?.modEnabled !== false; // default true

    console.log(`[AssetSync] Mod Enabled: ${isModEnabled}`);

    if (!isModEnabled) {
      console.log('[AssetSync] Mod is disabled. Skipping auto-extraction.');
      return;
    }

    const assetsDir = await this.getAssetsDir();
    const quenchingDir = path.join(assetsDir, 'quenching');

    console.log(`[AssetSync] Checking core assets in ${war3Path}`);
    console.log(`[AssetSync] Source directory: ${quenchingDir}`);

    const coreZips = [
      'zip-environment.zip',
      'zip-scripts.zip',
      'zip-shaders.zip',
      'zip-ui.zip',
    ];

    const uiType = modSettings?.ui || 'quenching'; // 默认 quenching

    // 如果选择了原版 UI (classic)，则跳过对 zip-ui.zip 的检查和解压
    const coreZipsToSync = uiType === 'classic'
      ? coreZips.filter(name => name !== 'zip-ui.zip')
      : coreZips;

    console.log(`[AssetSync] Syncing assets (UI Mode: ${uiType}, Skipping UI sync: ${uiType === 'classic'})`);

    for (const name of coreZipsToSync) {
      const zipPath = path.join(quenchingDir, name);
      if (!(await fs.pathExists(zipPath))) {
        console.warn(`[AssetSync] Zip not found: ${zipPath}`);
        continue;
      }

      let targetDir = '';
      let qmoffDir = '';
      if (name === 'zip-environment.zip') {
        targetDir = path.join(war3Path, '_retail_', 'environment');
        qmoffDir = path.join(war3Path, '_retail_', 'QMoff', 'environment');
      } else if (name === 'zip-scripts.zip') {
        targetDir = path.join(war3Path, '_retail_', 'scripts');
        qmoffDir = path.join(war3Path, '_retail_', 'QMoff', 'scripts');
      } else if (name === 'zip-shaders.zip') {
        targetDir = path.join(war3Path, '_retail_', 'shaders');
        qmoffDir = path.join(war3Path, '_retail_', 'QMoff', 'shaders');
      } else if (name === 'zip-ui.zip') {
        targetDir = path.join(war3Path, '_retail_', 'ui');
        qmoffDir = path.join(war3Path, '_retail_', 'QMoff', 'ui');
      }

      const hasBase = await (async () => {
        if (!targetDir) return false;
        if (!(await fs.pathExists(targetDir))) return false;
        const files = await fs.readdir(targetDir);
        if (files.length === 0) return false;

        // 验证文件指纹
        const isValid = await this.verifyAssetFingerprint(name, targetDir);
        if (!isValid) {
          console.log(`[AssetSync] Outdated asset detected in ${targetDir}, will re-extract`);
          await fs.remove(targetDir);
          return false;
        }
        return true;
      })();

      const hasQmoff = await (async () => {
        if (!qmoffDir) return false;
        if (!(await fs.pathExists(qmoffDir))) return false;
        const files = await fs.readdir(qmoffDir);
        if (files.length === 0) return false;

        // 验证备份文件夹的指纹
        const isValid = await this.verifyAssetFingerprint(name, qmoffDir);
        if (!isValid) {
          console.log(`[AssetSync] Outdated backup asset detected in ${qmoffDir}, will re-extract`);
          await fs.remove(qmoffDir);
          return false;
        }
        return true;
      })();

      if (hasBase || hasQmoff) {
        console.log(`[AssetSync] Assets for ${name} found (active or backup). Skipping.`);
        continue;
      }

      console.log(`[AssetSync] Missing core assets for ${name}, extracting to ${targetDir}...`);
      await this.extractZip(zipPath, targetDir);
    }

    // --- WebUI 资源同步 (任何情况下都执行，从不重置) ---
    const targetWebUIDir = path.join(war3Path, '_retail_', 'webui');
    // 1. 确保 webui 文件夹存在 (不删除现有文件夹，只确保存在)
    await fs.ensureDir(targetWebUIDir);

    // 2. 根据语言选择同步 QuenchingOn.png
    const language = configManager.get('language');
    const isChinese = language === 'zh-CN';
    const quenchingOnSource = path.join(quenchingDir, isChinese ? 'QuenchingOnCN.png' : 'QuenchingOnEN.png');
    const quenchingOnTarget = path.join(targetWebUIDir, 'QuenchingOn.png');

    if (await fs.pathExists(quenchingOnSource)) {
      try {
        await fs.copy(quenchingOnSource, quenchingOnTarget, { overwrite: true });
        console.log(`[AssetSync] Copied WebUI Image (${language}): ${path.basename(quenchingOnSource)} -> QuenchingOn.png`);
      } catch (err) {
        console.error(`[AssetSync] Failed to copy WebUI image:`, err);
      }
    } else {
      console.warn(`[AssetSync] WebUI source image not found: ${quenchingOnSource}`);
    }

    // 3. 同步其他 WebUI 文件 (如 index.html)
    const otherWebUIFiles = ['index.html'];
    for (const file of otherWebUIFiles) {
      const sourceFile = path.join(quenchingDir, file);
      if (await fs.pathExists(sourceFile)) {
        const targetFile = path.join(targetWebUIDir, file);
        try {
          await fs.copy(sourceFile, targetFile, { overwrite: true });
          console.log(`[AssetSync] Copied WebUI file: ${file} -> ${targetFile}`);
        } catch (err) {
          console.error(`[AssetSync] Failed to copy WebUI file ${file}:`, err);
        }
      }
    }

    // --- UI 资源配置 (仅在非 Classic 模式下) ---
    if (uiType !== 'classic') {
      console.log(`[AssetSync] Ensuring UI assets are ready. Selected UI type: ${uiType}`);
      try {
        // 调用 UIService 应用当前的 UI 设置
        const { UIService } = require('./ui-service');
        await UIService.applyUISettings(war3Path, uiType);
      } catch (err) {
        console.error('[AssetSync] Failed to apply initial UI settings:', err);
      }
    } else {
      console.log('[AssetSync] UI type is classic. Skipping UI settings application.');
    }
  }
}
