import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import { GameChannel } from '../../shared/game-channel';

const execFile = promisify(execFileCallback);

export function getLocalFilesGameName(channel: GameChannel): string {
    return channel === 'ptr' ? 'Warcraft III Public Test' : 'Warcraft III';
}

async function isAllowLocalFilesEnabled(channel: GameChannel): Promise<boolean> {
    const gameName = getLocalFilesGameName(channel);
    try {
        if (process.platform === 'win32') {
            const key = `HKCU\\Software\\Blizzard Entertainment\\${gameName}`;
            const { stdout } = await execFile('reg.exe', ['query', key, '/v', 'Allow Local Files'], { windowsHide: true });
            return /\b0x0*1\b/i.test(stdout);
        }
        if (process.platform === 'darwin') {
            const { stdout } = await execFile('defaults', ['read', `com.blizzard.${gameName}`, 'Allow Local Files']);
            return stdout.trim() === '1';
        }
    } catch {
        return false;
    }
    return false;
}

/** Enable and verify Warcraft III's loose-file override setting. Skips a branch that is already enabled. */
export async function ensureLocalFiles(channel: GameChannel): Promise<void> {
    if (await isAllowLocalFilesEnabled(channel)) return;
    const gameName = getLocalFilesGameName(channel);
    if (process.platform === 'win32') {
        const key = `HKCU\\Software\\Blizzard Entertainment\\${gameName}`;
        await execFile('reg.exe', ['add', key, '/v', 'Allow Local Files', '/t', 'REG_DWORD', '/d', '1', '/f'], {
            windowsHide: true,
        });
        // Preserve the marker written by older launcher versions.
        await execFile('reg.exe', ['add', key, '/v', 'Quenching', '/t', 'REG_SZ', '/d', '1.31', '/f'], {
            windowsHide: true,
        });
        const { stdout } = await execFile('reg.exe', ['query', key, '/v', 'Allow Local Files'], { windowsHide: true });
        if (!/\b0x0*1\b/i.test(stdout)) throw new Error(`Could not verify Allow Local Files for ${gameName}`);
    } else if (process.platform === 'darwin') {
        const domain = `com.blizzard.${gameName}`;
        await execFile('defaults', ['write', domain, 'Allow Local Files', '-int', '1']);
        const { stdout } = await execFile('defaults', ['read', domain, 'Allow Local Files']);
        if (stdout.trim() !== '1') throw new Error(`Could not verify Allow Local Files for ${gameName}`);
    }
}

/** Writes after the client has started. Does not run on the game-launch path. */
export function registerLocalFilesInBackground(channel: GameChannel): void {
    if (process.platform !== 'win32' && process.platform !== 'darwin') return;
    void ensureLocalFiles(channel).catch((error) => {
        console.warn(`[LocalFiles] Automatic registration failed for ${channel}:`, error);
    });
}
