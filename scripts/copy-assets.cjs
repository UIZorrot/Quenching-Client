const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../../QuenchingModCN');
const targetDir = path.resolve(__dirname, '../projects/QuenChing-Mod-Client/assets/quenching');

// 需要复制的文件扩展名
const assetExtensions = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.tif', '.dds',
  '.mp4', '.webm', '.avi', '.mov',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.otf', '.ttf', '.woff', '.woff2',
  '.que', '.txt', '.slk', '.j', '.js', '.html'
];

// 需要排除的目录
const excludeDirs = ['bin', 'obj', 'publish', 'packages', 'Properties'];

async function copyAssets() {
  try {
    console.log('开始复制资源文件...');

    // 确保目标目录存在
    await fs.ensureDir(targetDir);

    // 递归复制文件
    await copyDirectory(sourceDir, targetDir);

    console.log('资源文件复制完成！');
  } catch (error) {
    console.error('复制资源文件时出错:', error);
  }
}

async function copyDirectory(src, dest) {
  const items = await fs.readdir(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = await fs.stat(srcPath);

    if (stat.isDirectory()) {
      // 跳过排除的目录
      if (excludeDirs.includes(item)) {
        continue;
      }

      await fs.ensureDir(destPath);
      await copyDirectory(srcPath, destPath);
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();

      // 只复制指定扩展名的文件
      if (assetExtensions.includes(ext)) {
        await fs.copy(srcPath, destPath);
        console.log(`已复制: ${item}`);
      }
    }
  }
}

// 运行复制脚本
copyAssets();
