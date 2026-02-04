export const reaxel_MainWinMenu = reaxel(() => {
	
	const { store , mutate , setState } = createReaxable({});
	
	function createSetBoundsMenu( {
		size , checked , label ,
	}: {
		label: string,
		checked: boolean,
		size: PresetResoK
	} ): MenuItemConstructorOptions{
		
		return {
			label ,
			checked ,
			type : "radio" ,
			click(){
				const { mainWindow } = reaxel_MainProcessHub.store;
				const { size : _size , zoomFactor } = reaxel_ScreenAdapter.statics.mainWindowResolutionPresets[size];
				
				mainWindow.webContents.setZoomFactor(zoomFactor);
				mainWindow.setContentBounds({
					...mainWindow.getContentBounds(),
					..._size,
				});
			} ,
		};
	}
	
	const statics = {
		menus : [
			{
				label : '⚙️' ,
				click( menuItem , window , event ){
					
				} ,
				submenu : [
					{
						label : 'Exit' ,
						click( menuItem , window , event ){
							quit('menu-exit');
						} ,
					} ,
					{
						label : 'Window Size' ,
						submenu : [
							createSetBoundsMenu({
								label : 'Auto' ,
								checked : true ,
								size : 'auto' ,
							}) ,
							createSetBoundsMenu({
								label : '480P' ,
								checked : false ,
								size : "_480P" ,
							}) ,
							createSetBoundsMenu({
								label : '720P' ,
								checked : false ,
								size : "_720P" ,
							}) ,
							createSetBoundsMenu({
								label : '1080P' ,
								checked : false ,
								size : "_1080P" ,
							}) ,
							createSetBoundsMenu({
								label : '1440P' ,
								checked : false ,
								size : "_1440P" ,
							}) ,
							createSetBoundsMenu({
								label : '2160P' ,
								checked : false ,
								size : "_2160P" ,
							}) ,
						] ,
					} ,
				] ,
			} ,
		] as MenuItemConstructorOptions[] ,
	};
	
	obsReaction(async() => {
		const { mainWindow } = reaxel_MainProcessHub.store;
		if( mainWindow ) {
			await app.whenReady();
			const menu = Menu.buildFromTemplate(statics.menus);
			Menu.setApplicationMenu(menu);
		}
	} , () => [ reaxel_MainProcessHub.store.mainWindow ]);
	
	const rtn = {};
	return Object.assign(() => rtn , {
		store ,
		setState ,
		mutate ,
		statics ,
	});
});

type PresetResoK = keyof ( typeof reaxel_ScreenAdapter.statics.mainWindowResolutionPresets );

import { quit } from '../../useQuitEvent';
import { reaxel_ScreenAdapter } from '#main/reaxels/screen-adpater';
import { reaxel_MainProcessHub } from '../main-process-hub';
import { app , Menu , MenuItem , MenuItemConstructorOptions } from 'electron';

