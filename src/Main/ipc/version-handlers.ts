import { ipcMain } from 'electron';
import { fetchReleaseGate, previewUpdatesEnabled } from '../services/release-gate-service';

const VERSION_CACHE_MS = 5 * 60 * 1000;
let cachedVersion = '';
let cachedAt = 0;
let pendingVersion: Promise<string> | null = null;

async function fetchClientVersion(): Promise<string> {
    try {
      const { gate, source } = await fetchReleaseGate();
      if (gate.allowed === 0 && !previewUpdatesEnabled()) {
        console.log(`[Version] ${gate.version} is staged, not public (${source})`);
        return '';
      }
      console.log(`[Version] Got ${gate.version} from ${source} (${gate.allowed ? 'public' : 'preview'})`);
      return gate.version;
    } catch (error) {
      console.warn('[Version] Failed to load release gate:', error);
      return '';
    }
}

export function registerVersionHandlers() {
  ipcMain.handle('version:fetch', () => {
    if (pendingVersion) return pendingVersion;
    if (cachedAt && Date.now() - cachedAt < VERSION_CACHE_MS) return cachedVersion;
    pendingVersion = fetchClientVersion()
      .then(version => {
        cachedVersion = version;
        cachedAt = Date.now();
        return version;
      })
      .finally(() => { pendingVersion = null; });
    return pendingVersion;
  });
}
