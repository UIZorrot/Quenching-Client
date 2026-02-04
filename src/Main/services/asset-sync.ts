import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import { app } from 'electron';
import { configManager } from './config-manager';

export class AssetSyncService {
  static async getAssetsDir(): Promise<string> {
    const appPath = app.getAppPath();
    if (process.env.NODE_ENV === 'development') {
      const candidates = [
        path.join(process.cwd(), 'assets'),
        path.join(process.cwd(), 'public', 'assets'),
        path.join(process.cwd(), 'projects', 'QuenChing-Mod-Client', 'assets'),
        path.join(appPath, 'assets'),
        path.join(appPath, 'projects', 'QuenChing-Mod-Client', 'assets'),
      ];
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

    for (const name of coreZips) {
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
        return files.length > 0;
      })();

      const hasQmoff = await (async () => {
        if (!qmoffDir) return false;
        if (!(await fs.pathExists(qmoffDir))) return false;
        const files = await fs.readdir(qmoffDir);
        return files.length > 0;
      })();

      if (hasBase || hasQmoff) {
        console.log(`[AssetSync] Assets for ${name} found (active or backup). Skipping.`);
        continue;
      }

      console.log(`[AssetSync] Missing core assets for ${name}, extracting to ${targetDir}...`);
      await this.extractZip(zipPath, targetDir);
    }

    // --- 同步 WebUI 资源 ---
    const targetWebUIDir = path.join(war3Path, '_retail_', 'webui');
    await fs.ensureDir(targetWebUIDir);

    // 1. 根据语言选择同步 QuenchingOn.png
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

    // 2. 同步其他 WebUI 文件 (如 index.html)
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
  }
}
