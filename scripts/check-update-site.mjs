import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const release = process.argv.includes('--release');
const staged = process.argv.includes('--staged');
if (release && staged) throw new Error('--release and --staged are exclusive');
const legacy = 'https://www.tianxiazhengyi.net';
const current = 'https://qm.txzy.net';
const publicKey = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/quenching/update-public-key.pem'));
const errors = [];
const versionBodies = [];

function request(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Quenching-Site-Readiness/1' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 3) return reject(new Error('too many redirects'));
        return request(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      }
      const chunks = [];
      let bytes = 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > 1024 * 1024) return req.destroy(new Error('response exceeds 1 MiB'));
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.setTimeout(15000, () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
  });
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

function check(label, condition, detail) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) errors.push(label);
}

for (const [label, base] of [['3.4 legacy', legacy], ['3.5 current', current]]) {
  for (const name of ['newscn.md', 'newsen.md']) {
    try {
      const res = await request(`${base}/${name}`);
      const valid = res.status === 200 && !/html/i.test(res.type) &&
        !/^\s*(?:<!doctype|<html)/i.test(res.body) &&
        /^#\s+\S/m.test(res.body) && /^##\s+\d{4}-\d{2}-\d{2}\b/m.test(res.body);
      check(`${label} ${name}`, valid, `HTTP ${res.status}, ${res.type}, ${Buffer.byteLength(res.body)} bytes`);
    } catch (error) { check(`${label} ${name}`, false, error.message); }
  }
  try {
    const res = await request(`${base}/version.que`);
    let gate = null;
    try { gate = JSON.parse(res.body); } catch { /* Legacy plain-text release state. */ }
    const expected = staged || release
      ? gate?.schema === 1 && gate.version === 'v3.5' && gate.modVersion === '3.5' && gate.allowed === (release ? 1 : 0)
      : res.body.trim() === 'v3.4';
    const valid = res.status === 200 && !/html/i.test(res.type) && expected;
    check(`${label} version.que`, valid,
      `HTTP ${res.status}, ${res.type}, value ${JSON.stringify(res.body.trim().slice(0, 100))}`);
    if (valid) versionBodies.push(res.body.trim());
  } catch (error) { check(`${label} version.que`, false, error.message); }
}
if (staged || release) check('version.que matches on both domains', versionBodies.length === 2 && versionBodies[0] === versionBodies[1]);

const manifests = [];
for (const name of ['api/quenching/manifest.json', 'quenching/manifest.json']) {
  const label = `3.5 ${name}`;
  try {
    const res = await request(`${current}/${name}`);
    if (!release) {
      check(label, res.status === 404 || res.status === 503, `pre-release expects explicit 404/503; got HTTP ${res.status}, ${res.type}`);
      continue;
    }
    let value;
    try { value = JSON.parse(res.body); } catch { value = null; }
    const signature = value?.signature;
    const unsigned = value && { ...value };
    if (unsigned) delete unsigned.signature;
    const verified = signature?.algorithm === 'ed25519' &&
      typeof signature.value === 'string' &&
      crypto.verify(null, Buffer.from(canonicalJson(unsigned)), publicKey, Buffer.from(signature.value, 'base64'));
    const valid = res.status === 200 && /json/i.test(res.type) && verified && value.product === 'quenching-mod' &&
      value.sequence === 35 && value.version === '3.5' &&
      value.patches?.some((patch) => patch.fromSequence === 34 && patch.toSequence === 35 && patch.sources?.length >= 2);
    check(label, valid, `HTTP ${res.status}, ${res.type}, signature ${verified ? 'valid' : 'invalid'}`);
    if (valid) manifests.push(res.body);
  } catch (error) { check(label, false, error.message); }
}
if (release) check('manifest backup matches primary', manifests.length === 2 && manifests[0] === manifests[1]);

if (errors.length) {
  console.error(`${errors.length} site readiness check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`Site endpoints passed ${release ? 'release' : staged ? 'staged' : 'pre-release'} checks.`);
}
