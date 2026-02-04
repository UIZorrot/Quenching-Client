if( isElectron ) {
	var { IPC } = await import('#renderer/ENV/electron');
}

export const IpcRendererInvoke = <T extends keyof IpcJsonHandle>(type: T) => {
	return {
		invoke(
			data: IpcJsonHandle[T]["data"]
		): Promise<IpcJsonHandle[T]["reply"]> {
			if (!IPC) return xPromise();
			return IPC?.invoke("json::handle", { type, data });
		},
	};
};
export const IpcRendererSend = <T extends keyof IpcJsonOn>( type: T ) => {
	return {
		send( data: IpcJsonOn[T]["data"] ) {
			return IPC?.send( 'json::on' , { type , data } );
		} ,
	};
};

export const IpcRendererOn = <T extends keyof IpcJsonOn>( type: T ) => {
	return {
		on( cb : (e: IpcRendererEvent , data: IpcJsonOn[T]["data"]) => void ) {
			return IPC?.on( 'json::on' , ( e , data ) => {
				if( !IPC ) {
					return;
				}
				if( type === data.type ) {
					cb( e , data.data );
				}
			} );
		} ,
	};
};


import type { IpcRendererEvent } from 'electron';
import type { IpcJsonHandle , IpcJsonOn } from '#src/IPC-channels';
import { isElectron } from '#renderer/ENV';
