import http from 'node:http';
import https from 'node:https';
import { parseReleaseGate, ReleaseGate } from '../../shared/release-gate';

const DEFAULT_URLS = [
  'https://qm.txzy.net/version.que',
  'https://www.tianxiazhengyi.net/version.que',
];

export function previewUpdatesEnabled(): boolean {
  // Internal test launch only. A production manifest remains unavailable at
  // its default URLs while allowed=0, even if a user sets this environment flag.
  return process.env.QUENCHING_PREVIEW_UPDATES === '1';
}

function fetchVersionQueText(url: string, redirects = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : url.startsWith('http://') ? http : null;
    if (!client) return reject(new Error('unsupported version.que URL'));
    const request = client.get(url, { headers: { 'User-Agent': 'Quenching-Release-Gate/1' } }, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 3) return reject(new Error('too many version.que redirects'));
        return fetchVersionQueText(new URL(response.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode || 0}`));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 4096) return request.destroy(new Error('version.que exceeds 4 KiB'));
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      response.on('error', reject);
    });
    request.setTimeout(15_000, () => request.destroy(new Error('version.que request timed out')));
    request.on('error', reject);
  });
}

export async function fetchReleaseGate(): Promise<{ gate: ReleaseGate; source: string }> {
  const override = process.env.QUENCHING_VERSION_URL?.trim();
  const urls = [...new Set([...(override ? [override] : []), ...DEFAULT_URLS])];
  const errors: string[] = [];
  for (const source of urls) {
    try {
      return { gate: parseReleaseGate(await fetchVersionQueText(source)), source };
    } catch (error: any) {
      errors.push(`${source}: ${error?.message || String(error)}`);
    }
  }
  throw new Error(`all version.que sources failed: ${errors.join('; ')}`);
}
