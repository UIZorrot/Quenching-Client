export const reaxel_Devtools = reaxel(() => {
	const { store , setState , mutate } = createReaxable({
		ori_devtool_width : 1300 ,
		
	});
	
	const rtn = {
		get devtool_width(){
			return store.ori_devtool_width / screen.getPrimaryDisplay().scaleFactor;
		},
	};
	return Object.assign(() => rtn , {
		store , setState , mutate ,
	});
});


import { screen } from 'electron';
