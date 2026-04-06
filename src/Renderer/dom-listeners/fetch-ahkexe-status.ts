window.addEventListener('load',(e) => {
	IpcRendererSend( 'fetch-ahk_cp-status' ).send( null );;
});

import { IpcRendererSend } from '#renderer/utils/useIPC';
