/**
 * 将重载参数匹配转换为对象key-value
 * @example 
 */
export const overload = (params,processer) => {
	return params.reduce((accumulator,current) => {
		processer.forEach(({
			regExp ,
			key,
		}) => {
			if ( regExp.test(current) ) {
				accumulator[key] = current;
			}
		});
		return accumulator;
	}, {});
};
