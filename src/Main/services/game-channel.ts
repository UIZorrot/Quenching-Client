import path from 'path';
import fs from 'fs-extra';
import { GameChannel, gameChannelFolder } from '../../shared/game-channel';
import { configManager } from './config-manager';
import { normalizeWar3RootPath } from './war3-path';

export function getSelectedGameChannel(): GameChannel {
    return configManager.get('gameChannel');
}

export function getChannelModEnabled(channel: GameChannel): boolean {
    const configured = configManager.get('channelModEnabled')?.[channel];
    if (typeof configured === 'boolean') return configured;
    // Preserve the legacy Retail setting; PTR begins independently disabled.
    return channel === 'retail' && configManager.get('modSettings')?.modEnabled !== false;
}

export function setChannelModEnabled(channel: GameChannel, enabled: boolean): void {
    configManager.set('channelModEnabled', {
        ...configManager.get('channelModEnabled'),
        [channel]: enabled,
    });
}

export function getSelectedGameFolder(): '_retail_' | '_ptr_' {
    return gameChannelFolder(getSelectedGameChannel());
}

export function getSelectedGameDir(gamePath: string): string {
    return path.join(normalizeWar3RootPath(gamePath), getSelectedGameFolder());
}

export async function hasGameChannelDirectory(gamePath: string, channel: GameChannel): Promise<boolean> {
    try {
        return (await fs.stat(path.join(normalizeWar3RootPath(gamePath), gameChannelFolder(channel)))).isDirectory();
    } catch (error: any) {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false;
        throw error;
    }
}
