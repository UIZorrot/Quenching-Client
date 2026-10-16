// Adapted from PR #7 by dariuszsikorski; local launch synchronization is retained.
import { execFile as execFileCallback, spawn, type SpawnOptions } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { GameChannel } from '../../shared/game-channel';
import { readBattleNetInstallPath } from './battle-net-install-db';

const execFile = promisify(execFileCallback);

const PRODUCT_CODES = { retail: 'W3', ptr: 'W3T' } as const;
const UNINSTALL_KEY = 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall';

async function readInstallLocation(appName: 'Warcraft III' | 'Warcraft III Public Test' | 'Battle.net'): Promise<string | null> {
    try {
        // Query fixed install keys with UTF-8 output so Chinese paths are preserved.
        const script = `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); (Get-ItemProperty -LiteralPath 'Registry::${UNINSTALL_KEY.replace('HKLM', 'HKEY_LOCAL_MACHINE')}\\${appName}' -Name InstallLocation -ErrorAction Stop).InstallLocation`;
        const { stdout } = await execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
            windowsHide: true, timeout: 5000,
        });
        return stdout.trim() || null;
    } catch {
        return null;
    }
}

/** True when both paths point to the same Warcraft III root folder. */
export function isSameWar3Root(configuredPath: string, registeredPath: string, platform = process.platform): boolean {
    const paths = platform === 'darwin' ? path.posix : path.win32;
    const normalize = (value: string) => {
        if (!value.trim()) return '';
        let root = paths.normalize(value.trim());
        if (paths.basename(root).toLowerCase() === 'warcraft iii.exe' || paths.extname(root).toLowerCase() === '.app') root = paths.dirname(root);
        if (paths.basename(root).toLowerCase() === 'x86_64') root = paths.dirname(root);
        while (['_retail_', '_ptr_'].includes(paths.basename(root).toLowerCase())) root = paths.dirname(root);
        root = root.replace(/[\\/]+$/, '');
        return platform === 'darwin' ? root : root.toLowerCase();
    };
    return normalize(configuredPath) !== '' && normalize(configuredPath) === normalize(registeredPath);
}

/**
 * Battle.net expects the raw `--exec="launch W3"` form. Verbatim mode also skips quoting argv0,
 * so the exe path (which contains spaces) is quoted by hand.
 */
export function buildBattleNetLaunch(battleNetExe: string, channel: GameChannel = 'retail', platform = process.platform): { args: string[]; options: SpawnOptions } {
    if (platform === 'darwin') return { args: [`--exec=launch ${PRODUCT_CODES[channel]}`], options: { detached: true, stdio: 'ignore' } };
    return {
        args: [`--exec="launch ${PRODUCT_CODES[channel]}"`],
        options: { argv0: `"${battleNetExe}"`, detached: true, stdio: 'ignore', windowsVerbatimArguments: true },
    };
}

async function findBattleNetExe(): Promise<string | null> {
    if (process.platform === 'darwin') {
        for (const root of ['/Applications', path.join(os.homedir(), 'Applications')]) {
            const executable = path.join(root, 'Battle.net.app', 'Contents', 'MacOS', 'Battle.net');
            if (await fs.pathExists(executable)) return executable;
        }
        return null;
    }
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
 * Battle.net executable that can start this Warcraft III install, or null (unsupported platform, Battle.net missing,
 * or the configured folder is not the install Battle.net manages).
 */
export async function resolveBattleNetExe(gamePath: string, channel: GameChannel = 'retail'): Promise<string | null> {
    if (process.platform !== 'win32' && process.platform !== 'darwin') return null;
    const database = process.platform === 'darwin' ? '/Users/Shared/Battle.net/Agent/product.db'
        : path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Battle.net', 'Agent', 'product.db');
    let registeredWar3: string | null = null;
    try {
        if ((await fs.stat(database)).size <= 4 * 1024 * 1024) {
            registeredWar3 = readBattleNetInstallPath(await fs.readFile(database), channel === 'ptr' ? 'w3t' : 'w3');
        }
    } catch { /* Installed-path metadata may be unavailable; retain Windows registry compatibility. */ }
    if (!registeredWar3 && process.platform === 'win32') registeredWar3 = await readInstallLocation(channel === 'ptr' ? 'Warcraft III Public Test' : 'Warcraft III');
    if (!registeredWar3 || !isSameWar3Root(gamePath, registeredWar3)) {
        console.warn('[GameLauncher] Configured Warcraft III folder is not the Battle.net install; using direct launch');
        return null;
    }
    const battleNetExe = await findBattleNetExe();
    if (!battleNetExe) console.warn('[GameLauncher] Battle.net app not found; using direct launch');
    return battleNetExe;
}

/**
 * Launch the selected Warcraft III product through Battle.net so it can reuse the signed-in session.
 * A direct `Warcraft III.exe -launch` start can require a fresh in-game login and authenticator.
 * Mod files still load: they rely on the "Allow Local Files" registry value, not on the launch path.
 * Returns false (caller falls back to a direct start) when Battle.net is missing, manages another install,
 * or fails to start.
 */
export async function launchViaBattleNet(gamePath: string, channel: GameChannel = 'retail'): Promise<boolean> {
    const battleNetExe = await resolveBattleNetExe(gamePath, channel);
    if (!battleNetExe) return false;
    console.log(`Launching game via Battle.net: ${battleNetExe}`);
    const { args, options } = buildBattleNetLaunch(battleNetExe, channel);
    return spawnDetached(battleNetExe, args, options);
}

/** Start a detached process; resolves false instead of crashing when the exe is missing or blocked. */
export function spawnDetached(command: string, args: string[], options: SpawnOptions): Promise<boolean> {
    const child = spawn(command, args, options);
    // spawn reports a missing or blocked exe through the async 'error' event, not a throw.
    return new Promise<boolean>((resolve) => {
        child.once('spawn', () => {
            child.unref();
            resolve(true);
        });
        child.once('error', (error) => {
            console.warn(`[GameLauncher] ${command} failed to start; using direct launch`, error);
            resolve(false);
        });
    });
}
