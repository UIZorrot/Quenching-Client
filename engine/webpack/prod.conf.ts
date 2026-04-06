const {
	ProvidePlugin ,
	DefinePlugin,
} = webpack;
let first_main = true;
let first_renderer = true;
export const electronProdConf_Main:WebpackConfiguration = {
	stats: "verbose",
	devtool: "cheap-source-map",
	mode : "production",
	watch : false,
	plugins : [
		new DefinePlugin({
			__DEV__ : JSON.stringify( false ),
		}),
		// new LogWhenSucceed('development'),
		new LoggerWebpackPlugn( {
			initialize() {
				// console.log(`webpack is starting...\n`);
			} ,
			done() {
				if( !first_main ) {
					console.log( `electron-main重新打包完成,${ dayjs().
					format( 'HH:mm:ss' ) }\n` );
				}
				first_main = false;
			} ,
		} ) ,
	],
	
};

export const electronProdConf_Renderer:WebpackConfiguration = {
	stats: "verbose",
	devtool: "cheap-source-map",
	mode : "production",
	watch:false,
	plugins : [
		new DefinePlugin({
			__DEV__ : JSON.stringify( false ),
		}),
		new LoggerWebpackPlugn({
			initialize() {
				// console.log(`webpack is starting...\n`);
			},
			done() {
				if(!first_renderer){
					console.log(`electron-renderer重新打包完成,${dayjs().format('HH:mm:ss')}\n`);
				}
				first_renderer = false;
			},
		}),
	]
}
import dayjs from 'dayjs';
import { LoggerWebpackPlugn } from "../toolkit";
import webpack from 'webpack';
