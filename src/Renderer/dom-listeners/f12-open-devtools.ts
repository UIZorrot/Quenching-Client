if(isElectron){
	var { IPC } = await import('#renderer/ENV/electron');
}
window.addEventListener( 'keydown' , ( event ) => {
	if( event.key === 'F12' ) {
		IpcRendererSend( 'shortcut' ).send( {
			key : event.key ,
			type : "keydown" ,
		} );
	}
} );


import { isElectron } from '#renderer/ENV';
import { IpcRendererSend } from '#renderer/utils/useIPC';
