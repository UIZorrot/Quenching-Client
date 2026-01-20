/**
 * 支持实时签名的请求重播 , 形如
 * <code>
 * request.post(``,{payload:async() => {
 *    return {
 *       signature:await reax_user.sign();
 *    };
 * });
 * </code>
 */

export function AsyncReplayablePayloadPlugin() {
	return (hooks) => {
		hooks.onInit((slot) => {
			// crayon.orange(`AsyncReplayablePayloadPlugin.onInit()`);
		});
		hooks.onInvoke(async (slot,url,options) => {
			const payload = (options.body ?? slot.options.body);
			if(typeof payload === "function"){
				const payloadData = await payload();
				if(_.isPlainObject( payloadData )){
					slot.options.body = stringify(payloadData);
				}else {
					slot.options.body = payloadData;
				}
			}
		});
		/*todo 完善当后端返回登录失效等错误状态时的处理*/
		hooks.onError(() => {
			
		});
	};
}


