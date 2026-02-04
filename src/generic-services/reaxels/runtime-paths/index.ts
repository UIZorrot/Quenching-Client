/**
 * 判断运行在electron的哪个runtime下面
 */
export let reaxel_ElectronENV : () => Reaxel_ENV;

if(main()){
	const {app} = await import('electron');
	reaxel_ElectronENV = reaxel( () => {
		/**
		 * 可以将renderer和main的api整合在一起,但是初始化必须是空值,当在main或者renderer第一次使用时
		 * 再初始化,从而避免掉在main中调用到webview api或者相反.
		 */
		const { store , setState } = createReaxable( {
			/**
			 * common apis below
			 */
			//是否运行在打包后的环境
			runInExcutable : !dev(),
			
			/**
			 * main(nodejs) apis below
			 */
			//
			//打包为exe后的main.js运行目录,会返回asar/dist/的目录,
			absAppRunningPath : path.join(app.getAppPath(),'dist'),
			//返回resources/statics的目录
			absAppStaticsPath : path.join( app.getAppPath() , dev() ? 'dist/statics' : '../statics' ),
			//在<electron .>环境中,'./'代表执行命令的文件夹,一般在package.json目录。  而在打包环境中,'./'代表的是win-unpacked的根目录
			relMainScriptPath : dev() ? path.join( './' , 'dist' ) : path.join( './' , '' ),
			
			/**
			 * renderer apis below
			 */
		} );
		logger.log('relative path: ' , path.resolve('./'));
		const ret = {
			reaxelENV_Store:store,
			reaxelENV_SetState:setState,
			//是否运行在打包后的环境
			get runInExcutable() {
				return store.runInExcutable;
			},
			get absAppRunningPath(){
				return store.absAppRunningPath;
			},
			get absAppStaticsPath() {
				return store.absAppStaticsPath;
			},
			
		};
		return () => {
			
			return ret;
		};
	} );
}else if(renderer()){
	
}

type MainStore = {
	//绝对路径:打包为exe后的main.js运行目录,会返回asar/dist目录,
	absAppRunningPath : string,
	//绝对路径:返回resources/statics目录
	absAppStaticsPath:string,
};

type RendererStore = {
	
};

type CommonStore = {
	runInExcutable : boolean,
	
};

type Reaxel_ENV = MainStore & RendererStore & CommonStore

// import {} from '';
import path from 'node:path';
import { dev , main , renderer } from 'electron-is';
import logger from 'electron-log';
