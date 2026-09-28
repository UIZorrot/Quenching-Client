import { isValidClientVersion } from './client-version';

export interface ReleaseGate {
  version: string;
  modVersion: string;
  allowed: 0 | 1;
  legacyPlainText: boolean;
}

/**
 * version.que used to contain only `v3.4`. The JSON form binds a release
 * switch to both the portable client and its public MOD display version.
 */
export function parseReleaseGate(raw: string): ReleaseGate {
  const text = raw.trim();
  if (isValidClientVersion(text)) {
    return { version: text, modVersion: text.replace(/^v/i, ''), allowed: 1, legacyPlainText: true };
  }
  let value: any;
  try { value = JSON.parse(text); }
  catch { throw new Error('version.que is neither a version nor JSON'); }
  if (!value || Array.isArray(value) || value.schema !== 1 ||
      typeof value.version !== 'string' || !isValidClientVersion(value.version) ||
      typeof value.modVersion !== 'string' || !/^\d+(?:\.\d+){1,2}$/.test(value.modVersion) ||
      (value.allowed !== 0 && value.allowed !== 1)) {
    throw new Error('version.que release gate is invalid');
  }
  return { version: value.version, modVersion: value.modVersion, allowed: value.allowed, legacyPlainText: false };
}
