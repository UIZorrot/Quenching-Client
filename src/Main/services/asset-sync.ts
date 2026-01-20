import fs from 'fs-extra';
import path from 'path';
import yauzl from 'yauzl';
import { app } from 'electron';

export class AssetSyncService {
  static async getAssetsDir(): Promise<string> {
    const appPath = app.getAppPath();
    if (process.env.NODE_ENV === 'development') {
      const candidates = [
        path.join(process.cwd(), 'assets'),
        path.join(process.cwd(), 'projects', 'QuenChing-Mod-Client', 'assets'),
        path.join(appPath, 'assets'),
        path.join(appPath, 'projects', 'QuenChing-Mod-Client', 'assets'),
      ];
      for (const p of candidates) {
        if (await fs.pathExists(p)) return p;
      }
      return candidates[0];
    } else {
      return path.join(path.dirname(appPath), 'assets');
    }
  }

  static async extractZip(zipPath: string, extractPath: string): Promise<void> {
    await fs.ensureDir(extractPath);
    await new Promise<void>((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) { reject(err); return; }
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
          } else {
            zipfile.openReadStream(entry, (err2, readStream) => {
              if (err2 || !readStream) { reject(err2); return; }
              const out = path.join(extractPath, entry.fileName);
              fs.ensureDir(path.dirname(out)).then(() => {
                const ws = fs.createWriteStream(out);
                readStream.pipe(ws);
                ws.on('close', () => zipfile.readEntry());
              }).catch(reject);
            });
          }
        });
        zipfile.on('end', () => resolve());
        zipfile.on('error', (e) => reject(e));
      });
    });
  }

  static async syncAssetsBeforeLaunch(war3Path: string): Promise<void> {
    const assetsDir = await this.getAssetsDir();
    const quenchingDir = path.join(assetsDir, 'quenching');
    const coreZips = [
      'zip-environment.zip',
      'zip-scripts.zip',
      'zip-shaders.zip',
      'zip-ui.zip',
    ];

    for (const name of coreZips) {
      const zipPath = path.join(quenchingDir, name);
      if (!(await fs.pathExists(zipPath))) {
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
        continue;
      }

      await this.extractZip(zipPath, war3Path);
    }
  }
}
