export const reaxel_ServerTime = reaxel(() => {
	
	
	const { store , setState ,mutate } = createReaxable( {
		serverTime : 0,
		
	} );
	
	//本地接管的计时器, 每秒跳一次
	let heartbeatInterval;
	
	async function getServerTime(){
		
		const requestStartTime = Date.now();
		let requestEndTime = 0;
		fetch('https://worldtimeapi.org/api/timezone/Etc/UTC',{
			
		}).
		then(response => {
			// 确保请求成功
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			requestEndTime = Date.now() - requestStartTime;
			return response.json();  // 将响应解析为 JSON
		}).
		then(data => {
			
			const { unixtime : timestamp } = data;
			const serverTime = timestamp * 1000 + Math.ceil(requestEndTime / 2);
			
			setState( {
				//假设发起请求和收到请求的时间大致相同
				serverTime
			} );
			
			
			clearInterval( heartbeatInterval );
			//从服务器获取时间后由interval接管时间跳动
			heartbeatInterval = setInterval( () => {
				setState( { serverTime : store.serverTime + 1000 } );
			} , 1000 );
			
			// 输出服务器返回的时间数据
			console.log('Server time:', dayjs(serverTime).format('YYYY-MM-DD HH:mm:ss'));
		}).
		catch(error => {
			// 错误处理
			// console.warn('There was a problem with the fetch operation:', error);
		});
	};
	
	
	//每5分钟与服务器同步一次时间
	setInterval( (getServerTime(),getServerTime) , 5 * 60 * 1000 );
	
	const rtn = {
		get serverTime() {
			return store.serverTime;
		},
		
	};
	
	obsReaction( () => {
		// console.log( 'tik tok:' , dayjs(store.serverTime).format('YYYY-MM-DD HH:mm:ss') );
	} , () => [store.serverTime] );
	
	return Object.assign(() => {
		return rtn;
	} , {
		store ,
		setState ,
		mutate ,
	});
});

import dayjs from 'dayjs';
