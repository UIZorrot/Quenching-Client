let promise = createPromiseWithState<BrowserWindow>();
/**
 * 会将main的log发送至mainWindow的devtools异步打印
 */
export const IPCLogger = ( ...log: any ) => {
	promise.then( ( win ) => {
		win.webContents.send( 'console' , ...log );
	} );
};

reaxel_MainProcessHub().observedMainWindow( ( win ) => {
	if( win ) {
		if( promise.state === 'fulfilled' ) {
			promise = createPromiseWithState<BrowserWindow>();
		}else if(promise.state === 'pending'){
			
		}
		win.webContents.on('did-finish-load',() => {
			promise.resolve(win);
		})
		// promise.resolve( win );
	}
} );

function createPromiseWithState<T extends any>() {
	type PromiseState =
		| 'pending'
		| 'fulfilled'
		| 'rejected';
	
	const p: XPromise<T> & { state?: PromiseState; } = xPromise();
	p.state = 'pending';
	
	p.then( () => p.state = "fulfilled" );
	p.catch( () => p.state = 'rejected' );
	return p;
};

import { useIpcSend } from '#main/utils/useIPC';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import type { BrowserWindow } from 'electron';
import {XPromise} from 'reaxes-utils'
