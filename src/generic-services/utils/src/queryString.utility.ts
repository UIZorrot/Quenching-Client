/**
 * @description 将字符串qs转换为对象(暂不支持多层嵌套)||注意:中文key-value需要decodeURIComponent!!!
 * @param str 要转换的字符串,不传默认是获取href query对象
 */

export const decodeQueryString = <result extends string[] = []>( str: string = location.href ): Batch<result , string> => {
	type ret = Batch<result , string>;
	const empty = {} as ret;
	const thr = () : never => {
		throw new Error( `非法的queryString , 原字符串为 : ${ str }` );
	};
	try {
		/**
		 * case1 : 一个不含?的queryString 
		 * 测试用例 : 
		  `csd=123`
		  `vasd=`
		  `=`
		 */
		{
			if(str.includes('?')){
				[,str] = str.split('?');
			}
			if(str.includes('/')){
				[str] = str.split('/');
			}
			
			
			if(!str.includes('=')){
				return empty;
			}
			
			if(str.includes('&')){
				return str.split('&').reduce((accumulator,current) => {
					const [key,value] = current.split('=');
					accumulator[key] = value;
					return accumulator;
				},{} as ret);
			}else {
				const temp = {};
				const [ key , value ] = str.split( '=' );
				temp[ key ] = value;
				return temp as ret;
			}
		}
	} catch ( e ) {
		console.error( `decodeQueryString -> 转换失败 , 原始字符串为 : ${ str }` );
		console.error( e );
		throw '';
	}
};



/**
 * 将对象转换为queryString不带问号(暂不支持多层嵌套)
 * @return {string} a=1&b=2
 */
export const encodeQueryString = ( source: object ):string => {
	let result = ``;
	for ( const key in source ) {
		const value = source[ key ];
		if ( typeof value === 'object' && value !== null ) {
			throw '暂不支持嵌套对象';
		}
		if ( typeof key === 'symbol' ) {
			throw '不支持key为Symbol';
		}
		result = `${ result }${ result && '&' }${ key }=${ value }`;
	}
	return result;
};





