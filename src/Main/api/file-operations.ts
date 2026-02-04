import { ipcMain, dialog } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import yauzl from 'yauzl';

const execAsync = promisify(exec);

// 文件操作API
export class FileOperationsAPI {
  static register() {
    // 读取文件
    ipcMain.handle('file:read', async (event, filePath: string) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
      } catch (error) {
        console.error('Failed to read file:', error);
        throw error;
      }
    });

    // 写入文件
    ipcMain.handle('file:write', async (event, filePath: string, content: string) => {
      try {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content, 'utf-8');
        return true;
      } catch (error) {
        console.error('Failed to write file:', error);
        throw error;
      }
    });

    // 复制文件
    ipcMain.handle('file:copy', async (event, sourcePath: string, targetPath: string) => {
      try {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
        return true;
      } catch (error) {
        console.error('Failed to copy file:', error);
        throw error;
      }
    });

    // 移动/重命名文件
    ipcMain.handle('file:move', async (event, sourcePath: string, targetPath: string) => {
      try {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.move(sourcePath, targetPath, { overwrite: true });
        return true;
      } catch (error) {
        console.error('Failed to move file:', error);
        throw error;
      }
    });

    // 递归移动/合并目录
    ipcMain.handle('file:move-directory', async (event, sourceDir: string, targetDir: string) => {
      const moveRecursive = async (src: string, dest: string) => {
        const srcExists = await fs.pathExists(src);
        if (!srcExists) return;

        const destExists = await fs.pathExists(dest);
        const srcStat = await fs.stat(src);

        if (srcStat.isDirectory()) {
          await fs.ensureDir(dest);
          const items = await fs.readdir(src);
          for (const item of items) {
            await moveRecursive(path.join(src, item), path.join(dest, item));
          }
          // 移动完所有子项后，尝试删除源目录
          try {
            const remaining = await fs.readdir(src);
            if (remaining.length === 0) {
              await fs.remove(src);
            }
          } catch (e) {
            // 忽略非空或权限错误
          }
        } else {
          // 如果是文件，直接移动（覆盖）
          await fs.move(src, dest, { overwrite: true });
        }
      };

      try {
        await moveRecursive(sourceDir, targetDir);
        return true;
      } catch (error) {
        console.error('Failed to move directory recursively:', error);
        throw error;
      }
    });

    // 删除文件
    ipcMain.handle('file:delete', async (event, filePath: string) => {
      try {
        await fs.remove(filePath);
        return true;
      } catch (error) {
        console.error('Failed to delete file:', error);
        throw error;
      }
    });

    // 检查路径是否存在
    ipcMain.handle('file:exists', async (event, filePath: string) => {
      try {
        return await fs.pathExists(filePath);
      } catch (error) {
        return false;
      }
    });

    // 获取当前工作目录
    ipcMain.handle('file:getCurrentDirectory', async () => {
      return process.cwd();
    });

    // 选择模型文件
    ipcMain.handle('file:select-model', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Warcraft III Model', extensions: ['mdx', 'mdl'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        title: '选择自定义模型文件'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    // 通用文件选择
    ipcMain.handle('file:select', async (event, options: { title?: string, filters?: { name: string, extensions: string[] }[] }) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: options.title || '选择文件',
        filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    // 选择目录
    ipcMain.handle('file:select-directory', async (event, title?: string) => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: title || '选择目录'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    });

    // 复制多个文件（支持通配符）
    ipcMain.handle('file:copyFiles', async (event, sourcePattern: string, targetDir: string) => {
      try {
        const glob = require('glob');
        const files = glob.sync(sourcePattern);

        for (const file of files) {
          const relativePath = path.relative(path.dirname(sourcePattern), file);
          const targetPath = path.join(targetDir, relativePath);
          await fs.ensureDir(path.dirname(targetPath));
          await fs.copy(file, targetPath);
        }

        return true;
      } catch (error) {
        console.error('Failed to copy files:', error);
        throw error;
      }
    });

    // 解压ZIP文件
    ipcMain.handle('file:extractZip', async (event, zipPath: string, extractPath: string) => {
      return new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            reject(err);
            return;
          }

          zipfile.readEntry();
          zipfile.on('entry', (entry) => {
            if (/\/$/.test(entry.fileName)) {
              // Directory entry
              zipfile.readEntry();
            } else {
              // File entry
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  reject(err);
                  return;
                }

                const outputPath = path.join(extractPath, entry.fileName);
                fs.ensureDir(path.dirname(outputPath)).then(() => {
                  const writeStream = fs.createWriteStream(outputPath);
                  readStream.pipe(writeStream);
                  writeStream.on('close', () => {
                    zipfile.readEntry();
                  });
                });
              });
            }
          });

          zipfile.on('end', () => {
            resolve(true);
          });

          zipfile.on('error', (err) => {
            reject(err);
          });
        });
      });
    });

    // 创建ZIP文件
    ipcMain.handle('file:createZip', async (event, sourceDir: string, outputPath: string) => {
      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          resolve(true);
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
      });
    });

    // 启动可执行文件
    ipcMain.handle('file:launchExecutable', async (event, executablePath: string, args: string[] = []) => {
      return new Promise((resolve, reject) => {
        const child = spawn(executablePath, args, {
          detached: true,
          stdio: 'ignore'
        });

        child.unref();

        child.on('error', (error) => {
          reject(error);
        });

        // 给进程一些时间启动
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });
    });

    // 下载文件
    ipcMain.handle('file:download', async (event, url: string, outputPath: string) => {
      try {
        const https = require('https');
        const http = require('http');

        return new Promise((resolve, reject) => {
          const client = url.startsWith('https:') ? https : http;

          const file = fs.createWriteStream(outputPath);

          client.get(url, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
              return;
            }

            response.pipe(file);

            file.on('finish', () => {
              file.close();
              resolve(true);
            });

            file.on('error', (err) => {
              fs.unlink(outputPath, () => { }); // 删除部分下载的文件
              reject(err);
            });
          }).on('error', (err) => {
            reject(err);
          });
        });
      } catch (error) {
        console.error('Failed to download file:', error);
        throw error;
      }
    });

    // 获取文件信息
    ipcMain.handle('file:getStats', async (event, filePath: string) => {
      try {
        const stats = await fs.stat(filePath);
        return {
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          mtime: stats.mtime,
          ctime: stats.ctime
        };
      } catch (error) {
        console.error('Failed to get file stats:', error);
        throw error;
      }
    });

    // 列出目录内容
    ipcMain.handle('file:readDir', async (event, dirPath: string) => {
      try {
        const items = await fs.readdir(dirPath);
        const itemsWithStats = await Promise.all(
          items.map(async (item) => {
            const itemPath = path.join(dirPath, item);
            const stats = await fs.stat(itemPath);
            return {
              name: item,
              path: itemPath,
              isFile: stats.isFile(),
              isDirectory: stats.isDirectory(),
              size: stats.size,
              mtime: stats.mtime
            };
          })
        );
        return itemsWithStats;
      } catch (error) {
        console.error('Failed to read directory:', error);
        throw error;
      }
    });

    // 执行系统命令
    ipcMain.handle('system:exec', async (event, command: string) => {
      try {
        const { stdout, stderr } = await execAsync(command);
        return { stdout, stderr };
      } catch (error) {
        console.error('Failed to execute command:', error);
        throw error;
      }
    });
  }
}
