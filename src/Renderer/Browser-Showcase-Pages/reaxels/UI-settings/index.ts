export const reaxel_UISettings = reaxel(() => {
	
	
	const { store , setState , mutate } = createReaxable({
		bustPortrait : false ,
		UIScheme : 'original' as UIScheme,
	});
	
	
	
	const rtn = {
		get bustPortraitCheckboxDisabled(){
			return enhancerReason_BustPortrait({store,setState,mutate});
		}
	};
	return Object.assign(() => rtn , {
		store ,
		setState ,
		mutate ,
	});
});
import { enhancerReason_BustPortrait } from './reasons';
export type UIScheme = "original" | "carnival" | "quenching";
