type Reaxel_Core = Pick<typeof import('./').reaxel_Core,"mutate"|"store"|"setState"|"statics">;

const useDisable = (disabled:boolean|number,reason?:string) => {
	type Disabled = {
		disabled : boolean;
		reason?:string;
	};
	return {disabled:!!disabled,reason} as Disabled;
}

export const enhancerReason_ModToggleDisabled = ({store}:Reaxel_Core) => {
	collectDeps(store , [ 'gameRunning' , 'patching' ]);
	if(store.gameRunning) return useDisable(1 , '游戏运行时无法切换');
	if(store.patching) return useDisable(1 , '正在操作游戏文件,无法修改选项');
	return useDisable(0);
}
export const enhancerReason_GameEditionToggleDisabled = ({store}:Reaxel_Core) => {
	collectDeps(store , [ 'gameRunning' , 'modEnabled' , 'patching' ]);
	if(store.gameRunning) return useDisable(1 , '游戏运行时无法切换');
	if(!store.modEnabled) return useDisable(1 , 'Mod关闭时无法使用');
	if(store.patching) return useDisable(1 , '正在操作游戏文件,无法修改选项');
	
	return useDisable(0);
}
export const enhancerReason_GameVersionToggleDisabled = ({store}:Reaxel_Core) => {
	collectDeps(store , [ 'gameRunning' , 'modEnabled' , 'patching' ]);
	if(store.gameRunning) return useDisable(1 , '游戏运行时无法切换');
	if(!store.modEnabled) return useDisable(1 , 'Mod关闭时无法使用');
	if(store.patching) return useDisable(1 , '正在操作游戏文件,无法修改选项');
	
	return useDisable(0);
}
// export const enhancerReason_GameVersionToggleDisabled = ({store}:Reaxel_Core) => {
// 	if(store.gameRunning) return useDisable(1 , '游戏运行时无法切换');
// 	if(!store.modEnabled) return useDisable(1 , 'Mod关闭时无法使用');
// 	if(store.patching) return useDisable(1 , '正在操作游戏文件,无法修改选项');
//	
// 	return false;
// }


import { collectDeps } from 'reaxes';
