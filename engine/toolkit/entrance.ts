/**
 * 此文件是所有打包行为的入口,为后续流程提供依赖
 */
const args = process.argv.slice(2);

export let {
	inputPort = 3333,
	runtime = 'web',
	mock = null,
	analyze = false,
	method = "server",
	env = "unset",
	node_env = "development" as "development" | "production",
	experimental = "non-exp",
} = reflect(args, [
	{
		/*本应由正则判断,但这里将其伪造为正则调用test函数.*/
		regExp: {
			test(inputPort) {
				const num = parseInt(inputPort);
				return Number.isSafeInteger(num) && num >= 0 && num <= 65535;
			},
		},
		key: "inputPort" as const,
	},
	{
		regExp: /\bweb|electron|andriod-webview|\b/i,
		key: "runtime" as const,
	},
	{
		regExp: /\bmock\b/,
		key: "mock" as const,
	},
	{
		regExp: /\banalyze\b/,
		key: "analyze" as const,
	},
	{
		/*启动模式,构建还是本地服务*/
		regExp: /\bbuild|server\b/,
		key: "method" as const,
	},
	{
		/*网络请求环境*/
		regExp: /\bserver_dev|server_production\b/,
		key: "env" as const,
	},
	{
		/*webpack的mode*/
		regExp: /\bdevelopment|production\b/,
		key: "node_env" as const,
	},
	{
		/*是否开启实验特性*/
		regExp: /\bexperimental\b/i,
		key: "experimental" as const,
	},
]);
/*如果没有明确指定node_env:  npm.server下自动dev,npm.build是production*/
if (!node_env) {
	if (method === "server") {
		node_env = 'development';
	} else if (method === "build") {
		node_env = 'production';
	} else {
		node_env = 'development';
	}
} else if (node_env === "production") {

}

export function setNodeEnv(newEnv) {
	node_env = newEnv;
}

console.log('entreance: ');
purdy({
	inputPort,
	mock,
	analyze,
	method,
	env,
	node_env,
	experimental,
}, { indent: 2 })


export const port = await getPort(inputPort);




import { getPort, reflect } from "../utils";
import { absolutelyFileProtocolPath_RepositoryRoot, absolutelyPath_RepositoryRoot } from './paths';
import { readdirSync } from 'fs';
import path from "path";
import purdy from 'purdy';
