const { runInExcutable } = reaxel_ElectronENV();
const { observedMainWindow } = reaxel_MainProcessHub();

observedMainWindow( ( win ) => {
	win.webContents.on( 'before-input-event' , ( event , input ) => {
		if( input.control && input.shift && input.key === 'R' ) {
			console.log( 'Ctrl+Shift+R was pressed' );
			useIpcSend( win )( "clear-localstorage" ).send( null );
		}
	} );
} );

observedMainWindow( ( win ) => {
	if( reaxel_AhkSpawner.store.ahk ) {
		useIpcSend( reaxel_MainProcessHub().mainWindow )( "ahk-cp-status" ).send( true );
	}
} );
observedMainWindow( ( win ) => {
	win.webContents.on( 'devtools-closed' , () => {
		// reaxel_MainProcessHub().toggleDevTools( false );
	} );
} );

observedMainWindow( ( win ) => {
	const { scaleFactor } = screen.getPrimaryDisplay();
	
	win.webContents.on( 'devtools-opened' , () => {
		win.webContents.focus();
		
		const devtoolsWidth = 1366;
		const bounds = win.getBounds(); // 获取当前窗口尺寸
		const currentHeight = bounds.height;
		
		// win.setBounds( {
		// 	x : 350 / scaleFactor ,
		// 	y : 180 / scaleFactor ,
		// 	width : 2166 ,
		// 	height : currentHeight ,
		//	
		// } ,true);
	} );
	win.webContents.on( 'devtools-closed' , () => {
		win.webContents.focus();
		
		const devtoolsWidth = 1366;
		// win.setBounds( {
		// 	x : 1900 / scaleFactor ,
		// 	y : win.getBounds().y ,
		// 	width : 1800 / scaleFactor ,
		// 	height : 1800 / scaleFactor ,
		// } ,true);
	} );
} );

import { IpcMainOn , useIpcSend,IpcMainHandle } from '#main/utils/useIPC';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { reaxel_AhkSpawner } from '#main/reaxels/ahk-spawner';
import { screen } from 'electron';
