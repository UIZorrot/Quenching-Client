/**
 * 创建一个订阅状态机
 */
export const subscribeTunnel = function(description? : string){
	const subscribe_symbol_map : { [p : symbol] : Function[] } = {};
	const symbol = Symbol(description);
	
	return () : [
		(callback : Function) => () => void ,
		{ () : void; then(callback : Function) : void; } ,
		Symbol
	] => {
		
		const subscribe = (callback) => {
			if( subscribe_symbol_map.hasOwnProperty(symbol) ) {
				subscribe_symbol_map[symbol].push(callback);
			} else {
				subscribe_symbol_map[symbol] = [ callback ];
			}
			return function unsubscribe(){
				_.remove(subscribe_symbol_map[symbol] , (_cb) => {
					return _cb === callback;
				});
			};
		};
		
		
		const invoke = () => {
			const callbackList = subscribe_symbol_map[symbol];
			try {
				for( const fn of callbackList ) {
					fn();
				}
			} catch ( e ) {
				throw e;
				console.error(e);
			}
		};
		
		invoke.then = (callback) => {
			queueMicrotask(callback);
			return invoke.then;
		};
		
		return [
			subscribe ,
			invoke ,
			symbol ,
		];
	};
};
