import fs from 'fs-extra';
import path from 'path';
import { GameChannel, gameChannelFolder } from '../../shared/game-channel';
import { configManager } from './config-manager';
import { normalizeWar3RootPath } from './war3-path';
import { hasGameChannelDirectory } from './game-channel';
const LEGACY_MOVE_JOURNAL = '.quenching-channel-switch.json';

/** Old moving-based switches require manual inspection; do not mutate player files at startup. */
export async function assertNoInterruptedLegacyChannelSwitch(gamePath: string): Promise<void> {
    const root = normalizeWar3RootPath(gamePath);
    if (await fs.pathExists(path.join(root, LEGACY_MOVE_JOURNAL))) {
        throw new Error(`An old channel-move journal exists in ${root}; no files were moved`);
    }
}

/** Select only the branch used for launching/settings. Installation is independent per branch. */
export async function switchGameChannel(gamePath: string, next: GameChannel): Promise<void> {
    if (next !== 'retail' && next !== 'ptr') throw new Error('Invalid game channel');
    const root = normalizeWar3RootPath(gamePath);
    await assertNoInterruptedLegacyChannelSwitch(root);
    if (!(await hasGameChannelDirectory(root, next))) {
        throw new Error(`${gameChannelFolder(next)} does not exist in the selected Warcraft III folder`);
    }
    configManager.set('gameChannel', next);
}
