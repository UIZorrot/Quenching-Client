export type GameChannel = 'retail' | 'ptr';

export function gameChannelFolder(channel: GameChannel): '_retail_' | '_ptr_' {
    return channel === 'ptr' ? '_ptr_' : '_retail_';
}
