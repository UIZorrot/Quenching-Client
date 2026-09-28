import { GameChannel } from './game-channel';
import { EffectiveGraphics } from './mod-profile';

export function warcraftPreferencesFolder(channel: GameChannel): string {
  return channel === 'ptr' ? 'Warcraft III Public Test' : 'Warcraft III';
}

/** Game values: 0 classic, 1 HD, 2 Reforged/DE. Anything else is unknown. */
export function graphicsFromHdValue(raw: string | number | undefined | null): EffectiveGraphics | null {
  const value = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (value === 0) return 'sd';
  if (value === 1) return 'hd';
  if (value === 2) return 'de';
  return null;
}

export function hdValueForGraphics(graphics: EffectiveGraphics): number {
  if (graphics === 'sd') return 0;
  if (graphics === 'de') return 2;
  return 1;
}

/** Change only the requested settings. Warcraft's preferences file also holds
 * sections and player key bindings that the client must preserve verbatim. */
export function patchWar3Preferences(content: string, changes: Partial<Record<'hd' | 'reswidth' | 'resheight' | 'windowmode', boolean | number>>): string {
  let result = content;
  for (const [key, value] of Object.entries(changes)) {
    if (!['hd', 'reswidth', 'resheight', 'windowmode'].includes(key)) throw new Error(`Unsupported Warcraft preference: ${key}`);
    const replacement = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
    if (!/^(?:0|[1-9]\d*)$/.test(replacement)) throw new Error(`Invalid Warcraft preference: ${key}`);
    const pattern = new RegExp(`^([ \\t]*${key}[ \\t]*=[ \\t]*)[^\\r\\n]*`, 'gim');
    let found = false;
    result = result.replace(pattern, (_line, prefix: string) => {
      found = true;
      return `${prefix}${replacement}`;
    });
    if (!found) throw new Error(`Warcraft preference ${key} is missing; the file was left untouched`);
  }
  return result;
}
