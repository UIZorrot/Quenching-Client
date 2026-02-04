const { absAppStaticsPath } = reaxel_ElectronENV();

app.whenReady().then( () => {
	
	const trayIconPath = path.join( absAppStaticsPath , 'assets/ico/logo - mixin.ico' );
	const contextMenu = Menu.buildFromTemplate( [
		{
			label : '显示魔兽reaxes助手' ,
			async click() {
				
				reaxel_MainProcessHub().mainWindow?.show();
				console.log( '打开应用' );
				// 在这里处理打开应用的逻辑（例如打开窗口）
			} ,
		} ,
		{
			label : '退出' ,
			async click() {
				appQuitHook = () => {
					appQuitHook = () => false;
					return true;
				}
				app.quit();
			} ,
		} ,
	] );
	const tray = new Tray( trayIconPath );
	
	tray.setContextMenu( contextMenu );
	
	tray.setToolTip( '魔兽reaxes助手' );
	
	tray.on( 'click' , async() => {
		reaxel_MainProcessHub().mainWindow?.show();
	} );
	
} );

export let appQuitHook = () => false;

import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { Tray , Menu , app } from 'electron';
import path from 'node:path';
