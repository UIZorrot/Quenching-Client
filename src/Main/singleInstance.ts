app.whenReady().then( e => {
	if( !app.requestSingleInstanceLock() ) {
		dialog.showErrorBox('错误','此程序仅允许开启一例!')
		app.quit();  // 如果已有实例，退出当前进程
		return;
	}
} );

import { app , dialog } from 'electron';
