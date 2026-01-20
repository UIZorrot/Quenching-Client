/**
 * 为生产环境打包dist目录,此脚本并非将代码打包为exe, pack.ts才是
 */
Promise.all( [
	webpack_promise( webpack_conf_for_electron_main ) ,
	webpack_promise( webpack_conf_for_electron_preload ) ,
] ).
then( ( [ main , preload ] ) => {
	parentPort.postMessage( {
		status : 'main&preload success' ,
		
	} );
} ).
catch( e => {
	parentPort.postMessage( {
		status : 'error' ,
		message : e.message, // 传递错误信息
	} );
} );

import { parentPort } from 'node:worker_threads';
import { webpack_promise } from '../../engine/utils';
import { webpack_conf_for_electron_main , webpack_conf_for_electron_preload } from '../utils/mixedRepoWebpackConf.ts';
