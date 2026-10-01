import fs from 'fs-extra';
import path from 'node:path';
import { extractZipArchive } from './zip-extraction';

/** Official A/B downloads are ordinary ZIPs. Selecting either finds its
 * sibling, while a single older ZIP or an explicit set of ZIPs also works. */
export async function resolvePackageArchives(input: string | string[]): Promise<string[]> {
  const files = [...new Set(Array.isArray(input) ? input : [input])];
  if (files.length === 1) {
    const match = /^(QMF\d+(?:\.\d+)+-Full-)([AB])(\.zip)$/i.exec(path.basename(files[0]));
    if (match) {
      const sibling = path.join(path.dirname(files[0]), `${match[1]}${match[2].toUpperCase() === 'A' ? 'B' : 'A'}${match[3]}`);
      if (!(await fs.pathExists(sibling))) throw new Error('请先下载完整包 A、B 两个 ZIP 并放在同一文件夹，再选择安装。');
      files.push(sibling);
    }
  }
  return files;
}

/** Installation uses archive contents, never a manifest to require files.
 * All archives are extracted before writing to the selected game branch. */
export async function installPackageArchives(
  zipPaths: string[], targetDir: string,
  onProgress?: (percent: number, message: string) => void,
): Promise<number> {
  const staging = await fs.mkdtemp(path.join(path.dirname(targetDir), '.quenching-zip-stage-'));
  try {
    for (let i = 0; i < zipPaths.length; i++) {
      await extractZipArchive(zipPaths[i], staging, {
        stripLeadingDirectory: ['_retail_', '_ptr_'],
        mapFile: (name) => name.replace(/^QMF\d+(?:\.\d+)+\//i, ''),
        onProgress: (percent, name) => onProgress?.(
          Math.round((i + percent / 100) / zipPaths.length * 70),
          `正在解压 ${i + 1}/${zipPaths.length}：${name}`,
        ),
      });
    }
    const files: Array<{ relative: string; bytes: number }> = [];
    const visit = async (dir: string) => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await visit(file);
        else if (entry.isFile()) files.push({ relative: path.relative(staging, file), bytes: (await fs.stat(file)).size });
      }
    };
    await visit(staging);
    for (let i = 0; i < files.length; i++) {
      const relative = files[i].relative;
      await fs.copy(path.join(staging, relative), path.join(targetDir, relative), {
        overwrite: true, preserveTimestamps: true,
      });
      if (i % 100 === 0 || i === files.length - 1) {
        onProgress?.(70 + Math.round((i + 1) / files.length * 28), '正在安装资源包');
      }
    }
    return files.reduce((sum, file) => sum + file.bytes, 0);
  } finally {
    await fs.remove(staging);
  }
}
