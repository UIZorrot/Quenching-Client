export const reaxel_MainProcessHub = reaxel(() => {
	const { store , setState , mutate } = createReaxable({
		mainWindow : null as BrowserWindow ,
	});
	
	const obsCallbacks = [];
	
	const observedMainWindow = ( cb: ( win: BrowserWindow ) => any ) => {
		obsReaction(() => {
			if( store.mainWindow ) {
				cb(store.mainWindow);
			}
		} , () => [ store.mainWindow ]);
	};
	
	const recreateMainWindow = ( options = {} ) => {
		if( store.mainWindow ) {
			store.mainWindow.destroy();
			setState({ mainWindow : null });
		}
		const newWindow = initializeMainWindow().then(( mainWindow ) => {
			setState({ mainWindow });
		});
		return newWindow;
	};
	
	obsReaction(() => {
		const { mainWindow } = store;
		if( mainWindow ) {
			
			mainWindow.webContents.on('devtools-closed' , async() => {
				const { calcActualAppSize } = reaxel_ScreenAdapter();
				console.log(1111111 , 'resized');
				console.log(store.mainWindow.getBounds());
				const { height , width } = await calcActualAppSize();
				mainWindow.setBounds({});
				
			});
		}
	} , () => [ store.mainWindow ]);
	
	const rtn = {
		observedMainWindow ,
		recreateMainWindow ,
		get mainWindow(){
			return store.mainWindow;
		} ,
	};
	return Object.assign(() => rtn , {
		store ,
		setState ,
		mutate ,
	});
});

import { reaxel_ScreenAdapter } from '#main/reaxels/screen-adpater';
import { initializeMainWindow } from '#main/initialize-main-window';
import { dev } from 'electron-is';
import type { BrowserWindow , WebContents } from 'electron';
