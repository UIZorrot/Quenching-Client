/**
 * 成对使用数据
 * @param value 也可是callback
 */
export const makePair =
	<I , F extends (value : I) => any >
	(value : I , ...callbacks : F[]) : [ I , ...ReturnType<F>[] ] => {
		return [
			value ,
			...callbacks.map(callback => {
				if( typeof callback === 'function' ) {
					return callback(value);
				}
			}) ,
		];
	};

const [ value , computed ] = makePair({ a : 1 , b : 2 } , (value) => [value.a,'sdad']);
