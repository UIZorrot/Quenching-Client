import chalk from 'chalk';
import dayjs from 'dayjs';
import {
	getIPV4address ,
} from '../utils';
import type { Stats } from 'webpack';
import { port } from './';

/**
 * 每次打包完成后输出日志
 */
export class LogWhenSucceed {
	env = null;
	constructor (env = "production") {
		this.env = env;
	}
	
	count = 0;
	
	onFail = (error) => {
		console.log(chalk.red(`compiled failed at ${ dayjs().format("HH:mm:ss") }\n\r`));
	};
	
	apply (compiler) {
		this.count ++;
		compiler.hooks.done.tap('LogAtSucceed' , (stats:Stats) => {
			
			if ( stats.hasErrors() ) {
				return this.onFail(stats.toJson().errors);
			}
			const whisper = this.env === "production" ? "" : ` , host : https://${ getIPV4address() }:${port}\n\r`;
			console.log(chalk.green(`compiled successfully at ${ dayjs().format("HH:mm:ss") }${whisper}`));
		});
		compiler.hooks.failed.tap('LogAtSucceed' , (error) => {
			this.onFail(error);
		});
	}
}


/**
 * 提供开始构建和结束构建打印日志钩子的插件
 */
export class LoggerWebpackPlugn {
	
	PLUGIN_NAME = "logger-webpack-plugin";
	
	constructor ({initialize,done}) {
		Object.assign(this , {
			initialize : initialize || this.initialize ,
			done : done || this.done,
		});
	}
	
	initialize = () => {
		console.log(`webpack is going to compile`);
	}
	
	done = () => {
		console.log(chalk.green(`compiled successfully at ${ dayjs().format("HH:mm:ss") }`));
	}
	
	apply (compiler){
		const logger = compiler.getInfrastructureLogger(this.PLUGIN_NAME);
		
		compiler.hooks.initialize.tap(this.PLUGIN_NAME , (stats) => {
			
			if ( stats?.hasErrors() ) {
				console.error(stats);
				return failLog();
			}
			this.initialize();
			// const whisper = this.env === "production" ? "" : ` , host : https://${ getIPV4address() }:${port}\n\r`;
			// console.log(chalk.green(`compiled successfully at ${ dayjs().format("HH:mm:ss") }${whisper}`));
		});
		compiler.hooks.done.tap(this.PLUGIN_NAME , (stats:Stats) => {
			const logger = compiler.getInfrastructureLogger(this.PLUGIN_NAME);
			if ( stats.hasErrors() ) {
				console.error(stats.toJson().errors);
				// debugger;
				return failLog();
			}
			this.done();
			// const whisper = this.env === "production" ? "" : ` , host : https://${ getIPV4address() }:${port}\n\r`;
			// console.log(chalk.green(`compiled successfully at ${ dayjs().format("HH:mm:ss") }${whisper}`));
		});
		
		const failLog = () => {
			console.log(chalk.red(`compiled failed at ${ dayjs().format("HH:mm:ss") }\n\r`));
		}
	}
}
