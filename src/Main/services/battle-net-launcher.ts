import { execFile as execFileCallback, spawn, type SpawnOptions } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import { normalizeWar3RootPath } from './war3-path';

const execFile = promisify(execFileCallback);

/** Battle.net product code of Warcraft III: Reforged (retail). */
const WAR3_RETAIL_PRODUCT_CODE = 'W3';
const UNINSTALL_KEY = 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall';

async function readInstallLocation(appName: string): Promise<string | null> {
    try {
        const { stdout } = await execFile('reg.exe', ['query', `${UNINSTALL_KEY}\\${appName}`, '/v', 'InstallLocation'], {
            windowsHide: true,
        });
        return stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/i)?.[1].trim() || null;
    } catch {
        return null;
    }
}

/** True when both paths point to the same Warcraft III root folder. */
export function isSameWar3Root(configuredPath: string, registeredPath: string): boolean {
    const normalize = (value: string) => normalizeWar3RootPath(value).replace(/[\\/]+$/, '').toLowerCase();
    return normalize(configuredPath) !== '' && normalize(configuredPath) === normalize(registeredPath);
}

/**
 * Battle.net expects the raw `--exec="launch W3"` form. Verbatim mode also skips quoting argv0,
 * so the exe path (which contains spaces) is quoted by hand.
 */
export function buildBattleNetLaunch(battleNetExe: string): { args: string[]; options: SpawnOptions } {
    return {
        args: [`--exec="launch ${WAR3_RETAIL_PRODUCT_CODE}"`],
        options: { argv0: `"${battleNetExe}"`, detached: true, stdio: 'ignore', windowsVerbatimArguments: true },
    };
}

async function findBattleNetExe(): Promise<string | null> {
    const registered = await readInstallLocation('Battle.net');
    const candidates = [registered, process.env['ProgramFiles(x86)'], process.env.ProgramFiles]
        .filter((root): root is string => Boolean(root))
        .map((root) => (root === registered ? path.join(root, 'Battle.net.exe') : path.join(root, 'Battle.net', 'Battle.net.exe')));
    for (const candidate of candidates) {
        if (await fs.pathExists(candidate)) return candidate;
    }
    return null;
}

/**
 * Launch retail Warcraft III through the Battle.net app so the game reuses the app's signed-in session.
 * A direct `Warcraft III.exe -launch` start shows the in-game login (and authenticator) on every launch.
 * Mod files still load: they rely on the "Allow Local Files" registry value, not on the launch path.
 * Returns false (caller falls back to a direct start) when Battle.net is missing or manages another install.
 */
export async function launchViaBattleNet(gamePath: string): Promise<boolean> {
    if (process.platform !== 'win32') return false;
    const registeredWar3 = await readInstallLocation('Warcraft III');
    if (!registeredWar3 || !isSameWar3Root(gamePath, registeredWar3)) {
        console.warn('[GameLauncher] Configured Warcraft III folder is not the Battle.net install; using direct launch');
        return false;
    }
    const battleNetExe = await findBattleNetExe();
    if (!battleNetExe) {
        console.warn('[GameLauncher] Battle.net app not found; using direct launch');
        return false;
    }
    console.log(`Launching game via Battle.net: ${battleNetExe}`);
    const { args, options } = buildBattleNetLaunch(battleNetExe);
    spawn(battleNetExe, args, options).unref();
    return true;
}
