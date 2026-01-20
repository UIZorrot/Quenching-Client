export function FormdataPlugin (){
	
	return (hooks) => {
		
		hooks.onInvoke(async (slot,url,options) => {
			const payload = (slot.options.body);
			console.log(slot.options.body);
			if(_.isObject( payload ) && payload instanceof FormData){
				slot.options.body = payload;
			}
		});
	};
}
