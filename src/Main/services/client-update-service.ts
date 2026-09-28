import { app } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { statfs } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { fetchReleaseGate, previewUpdatesEnabled } from './release-gate-service';
import { isNewerClientVersion } from '../../shared/client-version';

function defaultManifestUrls(version: string): string[] {
  // A separate cumulative manifest is published for each supported starting
  // version, so 3.5.0 and 3.5.1 can both upgrade directly to 3.6 later.
  if (!VERSION.test(version)) return [];
  return [
    `https://qm.txzy.net/api/quenching/client-manifests/${version}.json`,
    `https://qm.txzy.net/quenching/client-manifests/${version}.json`,
  ];
}
const MAX_MANIFEST = 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const VERSION = /^\d+\.\d+(?:\.\d+)?$/;
const DOWNLOAD_LIMIT = 2 * 1024 * 1024 * 1024;
let preparing = false;

export interface ClientUpdateFile {
  path: string;
  oldSha256: string | null;
  newSha256: string;
  newSize: number;
  method: 'zstd-delta' | 'replace';
  artifact: { size: number; sha256: string; sources: string[] };
}
export interface ClientUpdateManifest {
  schema: 1;
  product: 'quenching-client';
  platform: 'win32-x64';
  baseVersion: string;
  targetVersion: string;
  files: ClientUpdateFile[];
  signature: { algorithm: 'ed25519'; value: string };
}
export interface ClientUpdateStatus {
  decision: 'available' | 'upToDate' | 'blocked' | 'unavailable' | 'incompatible';
  currentVersion: string;
  targetVersion?: string;
  reason: string;
  downloadBytes?: number;
}

function canonical(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
function safePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !/[\\:\0]/.test(value) && !value.startsWith('/') &&
    value.split('/').every(segment => segment && segment !== '.' && segment !== '..') &&
    (value === 'QMClient.exe' || value === 'resources/app.asar' ||
      value.startsWith('resources/assets/') || value.startsWith('resources/statics/') || value.startsWith('resources/app.asar.unpacked/'));
}
function validateManifest(raw: any, publicKey: string): ClientUpdateManifest {
  const signature = raw?.signature;
  if (signature?.algorithm !== 'ed25519' || typeof signature.value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature.value)) throw new Error('client manifest signature missing');
  const unsigned = { ...raw };
  delete unsigned.signature;
  if (!crypto.verify(null, Buffer.from(canonical(unsigned)), publicKey, Buffer.from(signature.value, 'base64'))) throw new Error('client manifest signature invalid');
  if (raw.schema !== 1 || raw.product !== 'quenching-client' || raw.platform !== 'win32-x64' ||
      !VERSION.test(raw.baseVersion) || !VERSION.test(raw.targetVersion) ||
      !isNewerClientVersion(raw.targetVersion, raw.baseVersion) || !Array.isArray(raw.files) || raw.files.length === 0 || raw.files.length > 20000) {
    throw new Error('unsupported client manifest');
  }
  const seen = new Set<string>();
  let total = 0;
  for (const file of raw.files) {
    if (!safePath(file.path) || seen.has(file.path.toLowerCase()) ||
        (file.oldSha256 !== null && !(typeof file.oldSha256 === 'string' && HASH.test(file.oldSha256))) ||
        typeof file.newSha256 !== 'string' || !HASH.test(file.newSha256) ||
        !Number.isSafeInteger(file.newSize) || file.newSize <= 0 || file.newSize > DOWNLOAD_LIMIT ||
        !['zstd-delta', 'replace'].includes(file.method) ||
        (file.method === 'zstd-delta' && !['QMClient.exe', 'resources/app.asar'].includes(file.path)) ||
        (file.method === 'zstd-delta' && file.oldSha256 === null) ||
        (file.method === 'replace' && ['QMClient.exe', 'resources/app.asar'].includes(file.path)) ||
        !file.artifact || !Number.isSafeInteger(file.artifact.size) || file.artifact.size <= 0 || file.artifact.size > DOWNLOAD_LIMIT ||
        !HASH.test(file.artifact.sha256) || !Array.isArray(file.artifact.sources) || file.artifact.sources.length === 0 || file.artifact.sources.length > 8 ||
        !file.artifact.sources.every((url: unknown) => typeof url === 'string' &&
          (/^https:\/\//.test(url) || (process.env.QUENCHING_CLIENT_UPDATE_TEST === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(url))))) {
      throw new Error(`invalid client file entry: ${String(file?.path)}`);
    }
    seen.add(file.path.toLowerCase());
    total += file.artifact.size;
    if (!Number.isSafeInteger(total) || total > 8 * DOWNLOAD_LIMIT) throw new Error('client update too large');
  }
  if (seen.has('qmclient.exe') !== seen.has('resources/app.asar')) throw new Error('EXE and ASAR must update together');
  return raw as ClientUpdateManifest;
}
function request(url: string, limit: number, redirects = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    if (!/^https:\/\//.test(url) && !(process.env.QUENCHING_CLIENT_UPDATE_TEST === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(url))) return reject(new Error('unsafe update URL'));
    const transport = url.startsWith('https:') ? https : http;
    const req = transport.get(url, { headers: { 'User-Agent': 'QMClient-Updater/1' } }, res => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume(); return request(new URL(res.headers.location, url).toString(), limit, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode || 0}`)); }
      const chunks: Buffer[] = [];
      let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > limit) req.destroy(new Error('download exceeds declared limit'));
        else chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.setTimeout(30000, () => req.destroy(new Error('update download timed out')));
    req.on('error', reject);
  });
}
async function hashFile(file: string): Promise<string> {
  process.noAsar = true;
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}
async function publicKey(): Promise<string> {
  const file = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'quenching', 'update-public-key.pem')
    : path.join(process.cwd(), 'assets', 'quenching', 'update-public-key.pem');
  return fsp.readFile(file, 'utf8');
}
async function fetchManifest(): Promise<ClientUpdateManifest> {
  const key = await publicKey();
  const override = process.env.QUENCHING_CLIENT_MANIFEST_URL?.trim();
  const urls = [...new Set([...(override ? [override] : []), ...defaultManifestUrls(app.getVersion())])];
  const errors: string[] = [];
  for (const url of urls) {
    try { return validateManifest(JSON.parse((await request(url, MAX_MANIFEST)).toString('utf8')), key); }
    catch (error: any) { errors.push(`${url}: ${error?.message || String(error)}`); }
  }
  throw new Error(errors.join('; '));
}
async function gateAllows(): Promise<boolean> {
  const { gate } = await fetchReleaseGate();
  return gate.allowed === 1 || previewUpdatesEnabled();
}
export async function getClientUpdateStatus(): Promise<ClientUpdateStatus> {
  const currentVersion = app.getVersion();
  if (!app.isPackaged || process.platform !== 'win32' || process.arch !== 'x64') return { decision: 'incompatible', currentVersion, reason: '仅支持 Windows x64 便携版' };
  try {
    if (!await gateAllows()) return { decision: 'blocked', currentVersion, reason: '更新尚未公开' };
    const manifest = await fetchManifest();
    if (!isNewerClientVersion(manifest.targetVersion, currentVersion)) return { decision: 'upToDate', currentVersion, targetVersion: manifest.targetVersion, reason: '已是最新版本' };
    if (manifest.baseVersion !== currentVersion) return { decision: 'incompatible', currentVersion, targetVersion: manifest.targetVersion, reason: '当前客户端没有对应的增量包，请手动下载新客户端' };
    return { decision: 'available', currentVersion, targetVersion: manifest.targetVersion, downloadBytes: manifest.files.reduce((sum, file) => sum + file.artifact.size, 0), reason: '可以自动更新' };
  } catch (error: any) {
    return { decision: 'unavailable', currentVersion, reason: error?.message || String(error) };
  }
}
function assertNoLinks(root: string, relative: string): void {
  let cursor = root;
  for (const segment of relative.split('/')) {
    cursor = path.join(cursor, segment);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`更新路径是链接: ${relative}`);
  }
}
async function download(file: ClientUpdateFile, destination: string): Promise<void> {
  const errors: string[] = [];
  for (const url of file.artifact.sources) {
    try {
      await fsp.mkdir(path.dirname(destination), { recursive: true });
      await requestFile(url, destination, file.artifact.size, file.artifact.sha256);
      return;
    } catch (error: any) {
      await fsp.rm(destination, { force: true }).catch(() => undefined);
      errors.push(`${url}: ${error?.message || String(error)}`);
    }
  }
  throw new Error(`全部下载源失败: ${errors.join('; ')}`);
}
async function requestFile(url: string, destination: string, expectedSize: number, expectedHash: string, redirects = 0): Promise<void> {
  if (redirects > 5) throw new Error('too many redirects');
  if (!/^https:\/\//.test(url) && !(process.env.QUENCHING_CLIENT_UPDATE_TEST === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(url))) throw new Error('unsafe update URL');
  const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const req = (url.startsWith('https:') ? https : http).get(url, { headers: { 'User-Agent': 'QMClient-Updater/1' } }, resolve);
    req.setTimeout(30000, () => req.destroy(new Error('download timed out')));
    req.on('error', reject);
  });
  if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
    response.resume();
    return requestFile(new URL(response.headers.location, url).toString(), destination, expectedSize, expectedHash, redirects + 1);
  }
  if (response.statusCode !== 200) { response.resume(); throw new Error(`HTTP ${response.statusCode || 0}`); }
  let bytes = 0;
  const digest = crypto.createHash('sha256');
  response.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > expectedSize) response.destroy(new Error('download exceeds declared size'));
    else digest.update(chunk);
  });
  await pipeline(response, fs.createWriteStream(destination, { flags: 'wx' }));
  if (bytes !== expectedSize || digest.digest('hex') !== expectedHash) throw new Error('download checksum mismatch');
}
async function reconstruct(base: string, delta: string, output: string): Promise<void> {
  const zstd = path.join(process.resourcesPath, 'assets', 'updater', 'zstd.exe');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(zstd, ['-d', '--long=28', `--patch-from=${base}`, delta, '-o', output], { windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`zstd exited ${code}`)));
  });
}
export async function prepareClientUpdate(onProgress?: (message: string, completed: number, total: number) => void): Promise<void> {
  if (preparing) throw new Error('客户端更新已经进行中');
  preparing = true;
  let stage = '';
  let createdHelperExe = '';
  let activePath = '';
  try {
    process.noAsar = true;
    if (!await gateAllows()) throw new Error('此更新尚未公开');
    const manifest = await fetchManifest();
    if (manifest.baseVersion !== app.getVersion()) throw new Error('没有适用于当前客户端版本的增量包');
    const root = path.dirname(process.execPath);
    const management = path.join(root, '.quenching-client-update');
    if (fs.existsSync(management) && fs.lstatSync(management).isSymbolicLink()) throw new Error('更新目录是链接');
    await fsp.mkdir(management, { recursive: true });
    activePath = path.join(management, 'active.json');
    if (fs.existsSync(activePath)) throw new Error('有尚未完成的客户端更新事务，请先恢复');
    let required = manifest.files.reduce((sum, file) => sum + file.artifact.size + file.newSize, 0);
    for (const file of manifest.files) {
      if (file.oldSha256 !== null) required += (await fsp.stat(path.join(root, ...file.path.split('/')))).size;
      if (file.path === 'QMClient.exe') required += file.newSize;
    }
    const volume = await statfs(root);
    if (Number(volume.bavail) * Number(volume.bsize) < required * 1.1) throw new Error('客户端所在磁盘空间不足，无法保留回滚备份');
    stage = path.join(management, crypto.randomBytes(12).toString('hex'));
    await fsp.mkdir(stage);
    const total = manifest.files.length;
    for (const [index, file] of manifest.files.entries()) {
      const installed = path.join(root, ...file.path.split('/'));
      assertNoLinks(root, file.path);
      if (file.oldSha256 === null ? fs.existsSync(installed) : !fs.existsSync(installed) || await hashFile(installed) !== file.oldSha256) throw new Error(`本地文件与补丁基线不符: ${file.path}`);
      onProgress?.(`正在下载 ${file.path}`, index, total);
      const artifact = path.join(stage, 'artifacts', String(index));
      const output = path.join(stage, 'new', ...file.path.split('/'));
      await download(file, artifact);
      await fsp.mkdir(path.dirname(output), { recursive: true });
      if (file.method === 'zstd-delta') await reconstruct(installed, artifact, output);
      else await fsp.copyFile(artifact, output);
      const stat = await fsp.stat(output);
      if (stat.size !== file.newSize || await hashFile(output) !== file.newSha256) throw new Error(`重建校验失败: ${file.path}`);
      onProgress?.(`已校验 ${file.path}`, index + 1, total);
    }
    const token = crypto.randomBytes(16).toString('hex');
    const relaunchArgs = process.argv.slice(1).filter(arg => arg.startsWith('--user-data-dir=') ||
      (process.env.QUENCHING_CLIENT_UPDATE_TEST === '1' && arg.startsWith('--remote-debugging-port=')));
    const plan = { root, stage, token, relaunchArgs,
      files: manifest.files.map(({ path: relative, oldSha256, newSha256 }) => ({ path: relative, oldSha256, newSha256 })) };
    const planPath = path.join(stage, 'plan.json');
    await fsp.writeFile(planPath, JSON.stringify(plan), { flag: 'wx' });
    const nextExe = path.join(root, 'QMClient.next.exe');
    if (fs.existsSync(nextExe)) throw new Error('发现上次遗留的 QMClient.next.exe；请先检查更新状态');
    await fsp.copyFile(path.join(stage, 'new', 'QMClient.exe'), nextExe, fs.constants.COPYFILE_EXCL);
    createdHelperExe = nextExe;
    const helper = path.join(process.resourcesPath, 'assets', 'updater', 'client-update-helper.cjs');
    const child = spawn(nextExe, [helper, planPath, String(process.pid)], {
      cwd: root, detached: true, windowsHide: true, stdio: 'ignore',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });
    await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    await fsp.writeFile(activePath, JSON.stringify({ stage, token, helperPid: child.pid }), { flag: 'wx' });
    child.unref();
    // The helper performs the swap only after this process has exited.
    setTimeout(() => app.quit(), 100);
  } catch (error) {
    if (activePath) await fsp.rm(activePath, { force: true }).catch(() => undefined);
    if (createdHelperExe) await fsp.rm(createdHelperExe, { force: true }).catch(() => undefined);
    if (stage) await fsp.rm(stage, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  } finally { preparing = false; }
}

export async function acknowledgeClientUpdate(): Promise<void> {
  const ack = process.env.QUENCHING_CLIENT_UPDATE_ACK;
  const token = process.env.QUENCHING_CLIENT_UPDATE_TOKEN;
  if (!ack || !token || !/^[a-f0-9]{32}$/.test(token)) return;
  const root = path.dirname(process.execPath);
  if (!path.resolve(ack).startsWith(path.join(root, '.quenching-client-update') + path.sep)) return;
  await fsp.writeFile(ack, token, { flag: 'wx' });
}

/** Remove only a transaction whose helper has committed and removed its rollback backup. */
export async function cleanupCompletedClientUpdate(): Promise<void> {
  if (!app.isPackaged || process.platform !== 'win32') return;
  const root = path.dirname(process.execPath);
  const management = path.join(root, '.quenching-client-update');
  if (!fs.existsSync(management) || fs.lstatSync(management).isSymbolicLink()) return;
  if (fs.existsSync(path.join(management, 'active.json'))) return;
  for (const name of await fsp.readdir(management)) {
    if (!/^[a-f0-9]{24}$/.test(name)) continue;
    const stage = path.join(management, name);
    const journal = await fsp.readFile(path.join(stage, 'journal.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (journal?.state === 'rolled-back') {
      // Keep error.txt and backups for diagnosis, but remove the running-helper
      // copy after it exits so the user can retry the update.
      await fsp.rm(path.join(root, 'QMClient.next.exe'), { force: true }).catch(() => undefined);
      continue;
    }
    if (journal?.state !== 'complete' || fs.existsSync(path.join(stage, 'backup'))) continue;
    try {
      await fsp.rm(path.join(root, 'QMClient.next.exe'), { force: true });
      await fsp.rm(stage, { recursive: true, force: true });
    } catch { /* The helper may still hold its executable; retry on next start. */ }
  }
}

export async function checkInterruptedClientUpdate(): Promise<'clear' | 'healthy' | 'recovering' | 'busy'> {
  if (!app.isPackaged || process.platform !== 'win32') return 'clear';
  const root = path.dirname(process.execPath);
  const management = path.join(root, '.quenching-client-update');
  if (!fs.existsSync(management)) return 'clear';
  if (fs.lstatSync(management).isSymbolicLink()) throw new Error('client update directory is a link');
  const activePath = path.join(management, 'active.json');
  if (!fs.existsSync(activePath)) return 'clear';
  const active = JSON.parse(await fsp.readFile(activePath, 'utf8'));
  if (typeof active.stage !== 'string' || path.dirname(path.resolve(active.stage)) !== management ||
      typeof active.token !== 'string' || !/^[a-f0-9]{32}$/.test(active.token) || !Number.isInteger(active.helperPid)) throw new Error('invalid update recovery marker');
  if (process.env.QUENCHING_CLIENT_UPDATE_TOKEN === active.token) return 'healthy';
  try { process.kill(active.helperPid, 0); return 'busy'; } catch { /* Helper stopped unexpectedly. */ }
  const nextExe = path.join(root, 'QMClient.next.exe');
  const planPath = path.join(active.stage, 'plan.json');
  if (!fs.existsSync(nextExe) || !fs.existsSync(planPath)) throw new Error('update interrupted but recovery files are missing');
  const helper = path.join(process.resourcesPath, 'assets', 'updater', 'client-update-helper.cjs');
  const child = spawn(nextExe, [helper, planPath, String(process.pid), '--recover'], {
    cwd: root, detached: true, windowsHide: true, stdio: 'ignore', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
  await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
  return 'recovering';
}
