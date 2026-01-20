type Reaxel_UISettings = Pick<typeof import('../').reaxel_UISettings,"mutate"|"store"|"setState">;

export const enhancerReason_BustPortrait = ({store}:Reaxel_UISettings) => {
	
	if(reaxel_Core.store.gameRunning) return useDisable(1 , '游戏运行时无法切换');
	if(reaxel_Core.store.patching) return useDisable(1 , '正在操作游戏文件,无法修改选项');
	if(!reaxel_Core.store.modEnabled) return useDisable(1 , 'Mod关闭时无法使用');
	if(reaxel_Core.store.gameEdition === 'classic') return useDisable(1 , '经典版魔兽无法使用');
	return useDisable(0);
}
export const enhancerReason_UIScheme = ({store}:Reaxel_UISettings) => {
	
	if(reaxel_Core.store.gameRunning) return useDisable(1 , '游戏运行时无法切换');
	if(reaxel_Core.store.patching) return useDisable(1 , '正在操作游戏文件,无法修改选项');
	if(!reaxel_Core.store.modEnabled) return useDisable(1 , 'Mod关闭时无法使用');
	return useDisable(0);
}

import { reaxel_Core } from '#renderer/Browser-Showcase-Pages/reaxels/core';
import { useDisable } from '#renderer/utils/useDisable';
