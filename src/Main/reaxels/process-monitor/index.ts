const { absAppStaticsPath } = reaxel_ElectronENV();

export const reaxel_ProcessMonitor = reaxel(() => {
	const {
		store ,
		setState ,
		mutate ,
	} = createReaxable({
		monitorEnabled : false ,
	});
	
	try {
		process.env.PS_LIST_BINARY_PATH = path.join(absAppStaticsPath , 'assets/ps-list/vendor' , `fastlist-0.3.0-${ {
			'x64' : 'x64' ,
			'ia32' : 'x86' ,
		}[arch] }.exe`);
	} catch ( e ) {
		IPCLogger(`process.env.PS_LIST_BINARY_PATH :${ e }`);
	}
	
	const pollingIsWar3Running = function (){
		let interval;
		
		const detectPSListSuccess = distinctCallback(() => {
			// IPCLogger('ps-list启动成功');
		} , () => [ interval ]);
		
		return async() => {
			const { monitorEnabled } = store;
			const { spawn , shutdown } = reaxel_AhkSpawner();
			//如果开启监听进程
			if( monitorEnabled ) {
				if( interval ) {
					clearInterval(interval);
				}
				interval = setInterval(async() => {
					const war3Running = (
						await psList()
					).some(ps => ps.name === 'Warcraft III.exe');
					
					detectPSListSuccess(() => [ interval ])();
					
					if( !war3Running && reaxel_AhkSpawner.store.ahk ) {
						shutdown();
					} else if( war3Running && !reaxel_AhkSpawner.store.ahk ) {
						spawn();
					}
				} , 1500);
			} else if( interval ) {
				clearInterval(interval);
				interval = null;
			} else {
				
			}
		};
	}();
	
	
	obsReaction(( first ) => {
		if( first ) return;
		pollingIsWar3Running();
	} , () => [ store.monitorEnabled ]);
	
	const rtn = {
		toggleWar3ProcessMonitor( directive ){
			console.log(directive);
			setState({
				monitorEnabled : {
					'start' : true ,
					'stop' : false ,
				}[directive] ,
			});
		} ,
	};
	return Object.assign(() => {
		return rtn;
	} , {
		store ,
		setState ,
		mutate ,
	});
});

import { IPCLogger } from '#main/utils/devtools-logger';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { reaxel_AhkSpawner } from '#main/reaxels/ahk-spawner';
import path from 'path';
import { arch } from 'process';
import psList from './ps-list';
