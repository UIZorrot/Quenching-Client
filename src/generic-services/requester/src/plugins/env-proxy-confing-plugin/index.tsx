/**
 * 根据环境不同应用不同的env,
 */
export function ApplyEnvConfigPlugin(env_config = __ENV_CONFIG__ , env = __ENV__) {
	return (hooks) => {
		/*如果没设置全局的env, 根据启动环境来判断默认用测试环境还是生产环境*/
		if(!env || env === "unset"){
			env = __NODE_ENV__ === "development" ? "server_dev" : "server_production";
		}
		hooks.onInvoke(async (slot,url:string,options) => {
			let currentEnv = env;
			/*如果请求时指定了env*/
			if(options.env && env_config.some((conf) => conf.env === options.env )){
				currentEnv = options.env;
			}
			const {proxy_path_dev,proxy_path_server} = env_config.find((conf) => conf.env === currentEnv);
			if(!url.startsWith('http')){
				slot.target.pathname = `${__METHOD__ === "server" ? proxy_path_dev : proxy_path_server}` + slot.target.pathname;
			}
		});
	};
}


type __ENV_CONFIG__ = {
	"env" : string,
		"proxy_path_dev" : string ,
		"proxy_path_server" : string ,
		"server_host" : string ,
		"path_rewrite" : {
		[p:string] : string,
	} ,
	"secure" : boolean,
}[];
