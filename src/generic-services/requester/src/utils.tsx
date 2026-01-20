/*串行执行一组异步函数*/
export const asyncListRunner = async (list) => {
	
	for(const callback of list){
		await callback();
	}
}


/**/
export const urlToTarget = (url:string) => {
	
}
