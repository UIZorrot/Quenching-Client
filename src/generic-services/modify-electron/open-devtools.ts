export const useOpenDevtools = (window: BrowserWindow, options: Options) => {

	app.whenReady().then(() => {

		let devtoolsPostion = options.devtoolsOptions?.mode ?? 'left';
		const getters = {
			get widthWithDevtools() {
				const { width } = window.getBounds();
				switch (devtoolsPostion) {
					case "left":
					case "right": {
						return options.width + width;
					};
				}
			}
		};

		let current = window.getBounds().width;

		window.webContents.on('devtools-closed', () => {
			/* 
			// Disable auto-resize on devtools toggle as it causes click blocking issues
			if(options.width){
				window.setBounds({
					width:current = current - options.width
				});
			}
			*/
		});

		window.webContents.on('devtools-opened', () => {
			/*
			// Disable auto-resize on devtools toggle as it causes click blocking issues
			if(options.width) {
				window.setBounds({
					width : current = getters.widthWithDevtools,
				});
			}
			*/
		});

		window.webContents.openDevTools({ mode: devtoolsPostion });
	});
}


export type Options = {
	width?: number;
	bounds?: Rectangle;
	center?: "auto" | boolean,
	devtoolsOptions?: OpenDevToolsOptions
}


import { app } from 'electron';
import { BrowserWindow, OpenDevToolsOptions } from 'electron';
import type { Rectangle } from 'electron';
