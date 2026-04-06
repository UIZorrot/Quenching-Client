/**
 * 为生产环境打包dist目录,此脚本并非将代码打包为exe, pack.ts才是
 */

console.log('fffffffffffffffffff',workerData);
// if(parentPort){
// 	parentPort.postMessage( {
// 		status : 'success' ,
// 	} );
// }
webpack_promise( workerData.webpackConf ).
then( ( renderer ) => {
	parentPort.postMessage( {
		status : 'renderer success' ,
	} );
} ).
catch( e => {
	parentPort.postMessage( {
		status : 'error' ,
		message : e.message, // 传递错误信息
	} );
} );

import { parentPort,workerData } from 'node:worker_threads';
import { webpack_promise } from '../../engine/utils';
// import { webpack_conf_for_electron_renderer } from '../utils/mixedRepoWebpackConf.ts';

