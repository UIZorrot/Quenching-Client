//windows文本缩放比例
export const textScaleFactor = await getTextScaleFactor();
//windows显示缩放比例
export const displayScaleFactor = screen.getPrimaryDisplay().scaleFactor / textScaleFactor;

/**
 * 计算受dpr影响过的屏幕宽高
 * *为什么不直接用display.size? --因为size会被textScale和displayScale同时影响,而这个函数计算的是只受displayScaleSize影响的分辨率,因为textScaleSize并不影响UI的大小
 * display.size.width === realWithPx * displayScale * textScale 
 */
export const calcDprEffectedRes = (display:Display) => {
	return {
		dprWidth : display.size.width / textScaleFactor,
		dprHeight : display.size.height / textScaleFactor,
	}
}

/**
 * 获取屏幕宽高中短的那一边
 */
export const getShortSide = (display : Display) => {
	const min = Math.min( display.size.width , display.size.height );
	return {
		shortSide : (min === display.size.width ? "width" : "height") as "width"|"height",
		value : min,
	}
}

/**
 * 获取屏幕的物理参数
 */
export const getPhysicalScreens = () => {
	const exePath = `${ reaxel_ElectronENV().absAppStaticsPath }/assets/py_screen_info/screen_info.exe`;
	const cp = spawn(exePath);
	const promise = xPromise<PhysicalScreen[]>();
	cp.stdout.on( 'data' , ( data ) => {
		const physicalScreens = JSON.parse( data ) as PhysicalScreen[];
		promise.resolve( physicalScreens );
	} );
	cp.on('error' , ( e ) => {
		console.error(e);
		promise.reject(e);
	});
	
	return promise;
}
export const HoFCachedGetPhysicalScreens = ({store,setState}) => async () => {
	if(store.screenInfos.length){
		return store.screenInfos;
	}
	const physicalScreen = await getPhysicalScreens();
	setState( {
		screenInfos : physicalScreen,
	} );
	return physicalScreen;
}

export const convertActualSizeToScaleSize = async ({width,height}) => {
	const {width:primaryWidthPx,height:primaryHeightPx} = (await getPhysicalScreens()).find(s => s.is_primary)!;
	const { size } = screen.getPrimaryDisplay();
	return {
		width : Math.ceil((width / primaryWidthPx) * size.width),
		height : Math.ceil((height / primaryHeightPx) * size.height),
	}
}

export type PhysicalScreen = {
	"x": number,
	"y": number,
	"width": number,
	"height": number,
	"width_mm": number,
	"height_mm": number,
	"name": string,
	"is_primary": boolean,
	"ppi": number,
	"display_scale_factor": number,
	"text_scale_factor": number,
};
import { getTextScaleFactor } from './getWindowsTextScale';
import { screen } from 'electron';
import type { Display , Size } from 'electron';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
import { spawn } from 'child_process';
