/**
 * 将请求体转换为后端要求格式的Formdata对象
 */
export const toFormdata = (source , formdata = null , parentKey : string = null) => {
	
	if(_.isArray(source)){
		source.forEach((value) => {
			if( _.isObject(value) && Object.getPrototypeOf(value) !== File.prototype ) {
				toFormdata(value , formdata , parentKey ? `${ parentKey }[]` : "[]");
			} else {
				formdata.append(parentKey ? `${ parentKey }[]` : "[]" , value);
			}
			
		});
		return;
	}
	return _.keys(source).reduce((formdata , key : string,index) => {
		
		const value = source[key];
		if( _.isObject(value) && Object.getPrototypeOf(value) !== File.prototype ) {
			toFormdata(value , formdata , parentKey ? `${ parentKey }[${ key }]` : key);
		} else {
			formdata.append(parentKey ? `${ parentKey }[${ key }]` : key , value);
		}
		return formdata;
	} , formdata ?? new FormData);
}; 
