/**
 * 准则: fetch不能被中间件调用
 * configurable-only
 * 生命周期:
 * onInit:实例化Requester时直接调用[此时对slot的任何修改都不应该修改API形状],此时无法获取到请求的实时参数
 *
 * onInvoke:在请求即将发出的时候依次调用注册过的回调,可以拿到请求url和partialOptions
 *
 * onResolve: 请求完成且成功时调用, 可以访问response除了[json,text,stream]以外的属性(因为这三个只能调用任意一次)
 *
 * onFinish: return值作为调用.fetch().then((data) => void)时返回的data;(如果有多个则管道式调用,不应关心顺序)
 * 
 * onError: 请求成功但业务报错,接收response和errorCode
 * 
 * onFail:由于各种原因导致的物理请求失败,如cors或服务器错误等,接收errorCode
 * 
 * 
 * ----------------
 * Target是描述url的对象,包括了主机地址,路径名,协议类型
 */
export const Requester = function (plugins) {
	const initializeSlot = () => {
		const innerSlot = {
			target : {
				protocol : location.protocol ,
				host : location.host ,
				pathname : '' ,
				hash : '' ,
			} ,
			queryObject : {} ,
			options : {
				credentials : 'include' ,
				mode : 'cors' ,
				method : "POST" ,
				headers : {} ,
			} ,
			response : null ,
			async fetch(slot,url , options){
				slot.target = new URL(url , location.origin);
				_.merge(slot.options , options);
				await asyncListRunner(onInvokeStack.map((callback) => () => callback(slot , url , options)));
				try {
					let remote = slot.target.href;
					if( slot.options.method === "GET" ) {
						slot.target.search = utils.encodeQueryString(slot.options.body);
						slot.options = _.omit(slot.options , "body");
						remote = slot.target.href;
					}
					const response = (
						await window.fetch(remote , slot.options)
					).clone();
					Object.defineProperty(slot , "response" , {
						get(){
							return response.clone();
						} ,
						configurable : true ,
						enumerable : true ,
					});
					await asyncListRunner(onResolveStack.map((callback) => () => callback(slot , url , options)));
					return slot.response;
				} catch ( e ) {
					console.error(e);
					throw e;
				}
			} ,
		} as any;
		
		const onInvokeStack = [];
		const onErrorStack = [];
		const onResolveStack = [];
		const hooks = {
			onInit(callback){
				callback(innerSlot);
			} ,
			onInvoke(callback) {
				onInvokeStack.push(callback);
			},
			onResolve(callback){
				onResolveStack.push(callback);
			},
			/**/
			onError(callback){
				onErrorStack.push(callback);
			},
			onFailed (){
			
			},
			onFinished(){
			
			},
		};
		plugins.forEach((plugin) => {
			plugin(hooks);
		});
		return innerSlot;
	};
	
	
	Object.assign(this , {
		fetch (url , options){
			const slot = initializeSlot();
			return slot.fetch(slot , url , options);
		} ,
		post (url : string , options){
			const slot = initializeSlot();
			slot.options.method = "POST";
			return slot.fetch(slot,url , {
				...options ,
				method : 'POST' ,
			});
		} ,
		get (url : string , options){
			const slot = initializeSlot();
			slot.options.method = "GET";
			return slot.fetch(slot,url , {
				...options ,
				method : 'GET' ,
			});
		} ,
	});
};

export * from './plugins/async-replayable-payload-plugin';
export * from './plugins/env-proxy-confing-plugin';
export * from './plugins/formdata-plugin';
export * from './plugins/real-address-plugin';




import { asyncListRunner  } from './utils';


