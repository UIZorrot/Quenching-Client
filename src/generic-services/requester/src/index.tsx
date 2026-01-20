
export const Requester = class {
	
	constructor(options){
		
	}
	
}

/**
 * 支持payload是个(异步)函数
 */
class AsyncPayloadPlugin {
	
	constructor(){
		
	}
	
	apply({}){
		
	}
}

/**
 * 给payload包装一层对象
 */
class FormatPayloadPlugin {
	
}

new Requester({
	plugins : [
		new AsyncPayloadPlugin(),
		new FormatPayloadPlugin(),
	],
});


import {
	SyncHook ,
	SyncWaterfallHook ,
	SyncLoopHook ,
	SyncBailHook ,
	MultiHook ,
	AsyncParallelBailHook ,
	AsyncSeriesHook ,
	AsyncSeriesBailHook ,
	AsyncHook ,
	AsyncSeriesWaterfallHook ,
	AsyncParallelHook ,
	AsyncSeriesLoopHook,
} from 'tapable';
