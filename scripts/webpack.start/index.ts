/**
 * 1.混合配置
 * 2.打包renderer , preload , main
 * 3.启动devserver
 * 4.此时可以从工程目录下启动electron .
 */

/**
 * build-renderer
 */
const startRendererServer = async (conf: Configuration) => {
	if (!conf) {
		console.log(chalk.green('不需要打包renderer\n'));
		return Promise.resolve();
	}
	try {
		const { compiler } = await webpack_promise(conf);
		const webpackServer = new WebpackDevServer(conf.devServer, compiler);
		return webpackServer.
			start().
			then(() => {
				console.log(chalk.yellow(`Electron-Renderer打包成功`));
				console.log(chalk.yellow(`WDS已启动在https://${getIPV4address()}:${port}`));
			}).
			catch((e) => {
				console.error(e);
				// throw e;
			});
	} catch (e) {
		console.error(e);
		// console.warn( "WDS可能意外退出了!" );
		// return Promise.reject( e );
	}
};


const buildPreload = async (conf: Configuration) => {
	if (!conf) {
		console.log(chalk.green('不需要打包preload'));
		return Promise.resolve();
	}
	return webpack_promise(conf).
		then(({ stats }) => {
			console.log(chalk.green(`Electron-Preload打包成功`));
		}).
		catch((reason) => {
			console.log(reason);
			console.log(chalk.red(`electron-preload打包失败,请在inspect模式下查看详情`));
			// throw reason;
		});
}

/**
 * build main
 */
const buildMain = async (conf: Configuration) => {
	return webpack_promise(conf).
		then(({ stats }) => {
			console.log(chalk.green(`Electron-Main打包成功`));
		}).
		catch((reason) => {
			console.log(reason);
			console.log(chalk.red(`electron主进程打包失败,请在inspect模式下查看详情`));
			// throw reason;
		});
};

startRendererServer(webpack_conf_for_electron_renderer).
	then(() => buildPreload(webpack_conf_for_electron_preload)).
	then(() => buildMain(webpack_conf_for_electron_main)).
	then(() => {
		console.log(chalk.green('打包成功，点击启动Electron Dev'));
		console.log('file://package.json:10');
		console.log("Run the script: ./run-electron-start.sh");
		// console.log("npm run electron-start:ahk-war3");
		// exec('npm run electron-start:ahk-war3')'\x1b]8;;file:///path/to/your/file\x1b\\Click to open file\x1b]8;;\x1b\\'

	}).then(() => {
		// 保持进程存活，防止 WDS 退出
		setInterval(() => { }, 1000 * 60 * 60);
	}).catch(e => {
		console.log('打包失败!', purdy(e, {}));
	});


import purdy from 'purdy';
import { webpack_conf_for_electron_main, webpack_conf_for_electron_renderer, webpack_conf_for_electron_preload } from "../utils/mixedRepoWebpackConf";

import { port, mock, env, node_env, method, analyze, experimental } from "../../engine/toolkit";
import { getPort, getIPV4address, webpack_promise } from "../../engine/utils";
import { merge } from "webpack-merge";
import WebpackDevServer from "webpack-dev-server";
import chalk from "chalk";
import webpack, { Configuration } from "webpack";
import path from "node:path";
import { exec } from 'child_process';
