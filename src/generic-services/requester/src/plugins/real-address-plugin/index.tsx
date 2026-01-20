/**
 * 在request Header里显示真实的请求地址
 */
export function RealAddressPlugin(env_config = __ENV_CONFIG__ , env = __ENV__){
	
	return (hooks) => {
		
		/*如果没设置全局的env, 根据启动环境来判断默认用测试环境还是生产环境*/
		if(!env || env === "unset"){
			env = __NODE_ENV__ === "development" ? "server_dev" : "server_production";
		}
		
		hooks.onInvoke((slot,url,options) => {
			let currentEnv = env;
			/*如果请求时指定了env*/
			if(options.env && env_config.some((conf) => conf.env === options.env )){
				currentEnv = options.env;
			}
			const current_config = env_config.find((conf) => conf.env === currentEnv);
			const key = `*|Real-Address|`;
			if(url.startsWith('http')){
				slot.options.headers[key] = url;
			}else {
				slot.options.headers[key] = `${current_config.server_host}${url}`;
			}
		});
	};
}

