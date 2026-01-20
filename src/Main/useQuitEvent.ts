const quitEmitter = new EventEmitter();
quitEmitter.setMaxListeners(50);

export const quit = ( type: CloseType ) => {
	quitEmitter.emit('quit' , type);
};

export const onQuit = ( cb: ( type: CloseType ) => void | boolean ) => {
	quitEmitter.addListener('quit' , ( type:CloseType ) => {
		console.log(type);
		
		if( cb(type) !== false ) {
			quitReason = type;
			resetQuitReasonNextTick();
			app.quit();
		}
	});
};
export let quitReason: CloseType = null;
const resetQuitReasonNextTick = () => nextTick(() => quitReason = null); 
	
type CloseType = 'close-window' | 'tray-exit' | 'menu-exit' | 'hotkey-exit';

import { EventEmitter } from 'node:events';
import { app , BrowserWindow } from 'electron';
import { nextTick } from 'process';
