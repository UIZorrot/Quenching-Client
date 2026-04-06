export const IpcMainHandle = function () {
	const registry: {
		[k in keyof IpcJsonHandle]?: ( e: IpcMainInvokeEvent , data: IpcJsonHandle[k]['data'] ) => IpcJsonHandle[k]['reply']
	} = {};
	const proxifier = <T extends keyof IpcJsonHandle>( e: IpcMainInvokeEvent , data: { type: T, data: IpcJsonHandle[T]["data"] } ) => {
		
		if( typeof data !== 'object' || !data.type || !data.data ) {
			console.error( `Invalid data format: ${ JSON.stringify( data ) }` );
			return { error : 'Invalid data format' }; // 或自定义错误处理
		}
		
		const cb = registry[data.type];
		if( cb ) {
			return cb( e , data.data );
		} else {
			console.error( `No handler registered for type: ${ data.type }` );
			return { error : `Handler not found for type: ${ data.type }` };
		}
	};
	
	ipcMain.handle( 'json::handle' , proxifier );
	
	return <T extends keyof IpcJsonHandle>( type: T ) => {
		
		return {
			handle( cb: ( e: IpcMainInvokeEvent , data: IpcJsonHandle[T]['data'] ) => IpcJsonHandle[T]['reply'] ) {
				registry[type] = cb as any;
			} ,
		};
	};
}();


export const IpcMainOn = function () {
	
	const registry: {
		[k in keyof IpcJsonOn]?: ( e: IpcMainEvent , data: IpcJsonOn[k]['data'] , reply : ReturnType<typeof $reply>) => void
	} = {};
	function $reply(e : IpcMainEvent){
		return <T extends keyof IpcJsonOn>(type : T) => {
			return {
				send:( data : IpcJsonOn[T]["data"] ) => {
					e.reply( 'json::on' , {
						type ,
						data ,
					} );
				}
			}
		}
	}
	const proxifier = <T extends keyof IpcJsonOn>( e: IpcMainEvent , data: { type: T, data: IpcJsonOn[T]["data"] } ) => {
		
		if( typeof data !== 'object' || !data.type || !data.hasOwnProperty('data') ) {
			console.error( `Invalid data format: ${ JSON.stringify( data ) }` );
			return { error : 'Invalid data format' }; // 或自定义错误处理
		}
		
		const cb = registry[data.type];
		if( cb ) {
			return cb( e , data.data , $reply(e) );
		} else {
			console.error( `No handler registered for type: ${ data.type }` );
			return { error : `Handler not found for type: ${ data.type }` };
		}
	};
	
	ipcMain.on( 'json::on' , proxifier );
	
	return <T extends keyof IpcJsonOn>( type: T ) => {
		
		return {
			on( cb: ( e: IpcMainEvent , data: IpcJsonOn[T]['data'] , reply : ReturnType<typeof $reply>) => void ) {
				registry[type] = cb as any;
			} ,
		};
	};
}();

export const useIpcSend = (window:BrowserWindow) => {
	if(!window){
		throw new Error( 'useIpcSend:window不存在' );
	}
	return <T extends keyof IpcJsonOn>(type : T) => {
		return {
			send:( data : IpcJsonOn[T]["data"] ) => {
				window.webContents.send( 'json::on' , {
					type ,
					data ,
				} );
			}
		};
	}
}

import type { IpcJsonHandle , IpcJsonOn } from '#src/IPC-channels';
import { ipcMain , IpcMainInvokeEvent , IpcMainEvent , BrowserWindow } from 'electron';
