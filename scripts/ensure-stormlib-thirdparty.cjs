const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const JSZip = require('jszip');

const repoRoot = path.resolve(__dirname, '..');
const stormlibDir = path.join(repoRoot, 'node_modules', '@jamiephan', 'stormlib');
const targetDir = path.join(repoRoot, 'node_modules', 'thirdparty', 'StormLib');
const markerFile = path.join(targetDir, 'src', 'StormLib.h');
const archiveUrl = 'https://codeload.github.com/ladislav-zezula/StormLib/zip/refs/heads/master';

function stormlibPrebuildPath() {
  return path.join(stormlibDir, 'prebuilds', `${process.platform}-${process.arch}`, '@jamiephan+stormlib.node');
}

function stormlibBuiltPath() {
  return path.join(stormlibDir, 'build', 'Release', 'stormlib.node');
}

function needsNativeRebuild() {
  if (!fs.existsSync(stormlibDir)) return false;
  if (fs.existsSync(stormlibPrebuildPath())) return false;
  // @jamiephan/stormlib ships no darwin prebuilds; compile from thirdparty sources.
  return process.platform === 'darwin' && !fs.existsSync(stormlibBuiltPath());
}

function rebuildStormlibNative() {
  console.log('[stormlib] rebuilding @jamiephan/stormlib for', `${process.platform}-${process.arch}`);
  execSync('npm rebuild @jamiephan/stormlib --foreground-scripts', {
    stdio: 'inherit',
    cwd: repoRoot,
  });
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(response.headers.location).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  await ensureThirdpartySources();
  if (needsNativeRebuild()) {
    rebuildStormlibNative();
  }
}

async function ensureThirdpartySources() {
  if (fs.existsSync(markerFile)) {
    console.log('[stormlib] thirdparty StormLib source already present.');
    return;
  }

  console.log('[stormlib] downloading thirdparty StormLib source...');
  const buffer = await download(archiveUrl);
  const zip = await JSZip.loadAsync(buffer);
  let extracted = 0;

  fs.rmSync(targetDir, { recursive: true, force: true });

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;

    const normalizedName = entry.name.replace(/\\/g, '/');
    const relativePath = normalizedName.split('/').slice(1).join('/');
    if (!relativePath) continue;

    const destination = path.join(targetDir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, await entry.async('nodebuffer'));
    extracted += 1;
  }

  if (!fs.existsSync(markerFile)) {
    throw new Error('StormLib source download completed, but src/StormLib.h was not found.');
  }

  console.log(`[stormlib] extracted ${extracted} files to ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
