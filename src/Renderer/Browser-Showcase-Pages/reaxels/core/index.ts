export const reaxel_Core = reaxel(() => {
	
	const { store , setState , mutate } = createReaxable({
		gameRunning : false ,
		modEnabled : true ,
		modInstalled : false ,
		modInstalling : false ,
		gameEdition : 'reforged' as GameEdition ,
		// graphicCard : 'Nvidia' as GraphicCard,
		gameVersion : '1.33+' as GameVersion ,
		enableGore : false ,
		//正在操作文件
		patching : false,
	});
	
	const statics = {};
	const rtn = {
		get gameEditionToggleDisabled (){
			return enhancerReason_GameEditionToggleDisabled({ store , setState , mutate , statics });
		},
		get gameVersionToggleDisabled (){
			return enhancerReason_GameVersionToggleDisabled({ store , setState , mutate , statics });
		},
		get modToggleDisabled (){
			return enhancerReason_ModToggleDisabled({ store , setState , mutate , statics });
		},
	};
	return Object.assign(() => rtn , {
		store ,
		setState ,
		mutate ,
		statics ,
	});
});

import {
	enhancerReason_GameEditionToggleDisabled,
	enhancerReason_GameVersionToggleDisabled,
	enhancerReason_ModToggleDisabled
} from './reasons';
export type GameEdition = 'reforged' | 'classic';
export type GraphicCard = 'Nvidia' | 'Intel/AMD';
export type GameVersion = '1.33+' | '1.32';
