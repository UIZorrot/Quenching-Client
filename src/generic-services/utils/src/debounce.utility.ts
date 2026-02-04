/**
 * @description 防抖功能
 * @param {function} fn 要进行防抖处理的function
 * @param {number} wait  间隔时间 ms为单位
 * @param {boolean} immediate  开启后在最初的一次会立即执行,后续的触发进行防抖.
 * @return {function} 进行防抖处理后的函数
 */
export const debounce = <F extends any[],T extends ((...args:F) => any)>( callback : T , wait : number = 1000 , immediate : boolean = false )
	: T => {
	let lastTimestamp = 0;
	let timeoutID;
	return (( ...args : F) => {
		/*immediate模式*/
		if ( immediate ) {
			if ( Date.now() - lastTimestamp > wait ) {
				callback( ...args );
				lastTimestamp = Date.now();
				return;
			} else {
				lastTimestamp = Date.now();
				clearTimeout( timeoutID );
				timeoutID = setTimeout( () => callback( ...args ) , wait );
				return;
			}
		} else {
			/*普通模式*/
			clearTimeout( timeoutID );
			timeoutID = setTimeout( () => callback( ...args ) , wait );
		}
	}) as T;
};
