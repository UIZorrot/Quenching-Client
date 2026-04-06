const {
	ProvidePlugin ,
	DefinePlugin,
	HotModuleReplacementPlugin
} = webpack;
let first_main = true;
let first_renderer = true;
export const electronDevConf_Main:WebpackConfiguration = {
	stats: "errors-only",
	devtool: "source-map",
	optimization: {
		minimize: false,
	},
	mode : "development",
	watch : true,
	plugins : [
		new DefinePlugin({
			__DEV__ : JSON.stringify( true ),
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

export const electronDevConf_Renderer:WebpackConfiguration = {
	mode : 'development',
	stats : 'normal',
	devtool : 'inline-source-map',
	cache: {
		type: 'filesystem',
		buildDependencies: {
			config : [
				// path.join( absolutelyPath_RepositoryRoot , 'engine' ).replaceAll('\\','/'),
				// path.join( absolutelyPath_RepositoryRoot , 'engine/webpack/base.conf.ts' ),
				'./engine/'
				// path.join( absolutelyPath_RepositoryRoot , '' ),
				// path.join( absolutelyPath_RepositoryRoot , '' ),
			], // 缓存依赖的配置文件
			
		},
	},
	externals : {
	// 	'mobx' : `commonjs ${path.join(absolutelyPath_RepositoryRoot , 'vendors','mobx.development@6.13.5#umd.js')}`,
	// 	'react' : `commonjs ${path.join(absolutelyPath_RepositoryRoot , 'vendors','react.development@18.3.1#umd.js')}`,
	// 	'react/jsx-runtime' : `commonjs ${path.join(absolutelyPath_RepositoryRoot , 'vendors','react-jsx-dev-runtime.production.min@18.3.1#cjs.js')}`,
	// 	'react-dom' : `commonjs ${path.join(absolutelyPath_RepositoryRoot , 'vendors','react-dom.development@18.3.1#umd.js')}`,
	// 	'react-dom/client' : `commonjs ${path.join(absolutelyPath_RepositoryRoot , 'vendors','react-dom.development@18.3.1#umd.js')}`,
	// 	'lodash' : `commonjs ${path.join(absolutelyPath_RepositoryRoot , 'vendors','lodash@4.17.21#umd.js')}`,
	// 	'antd' : `commonjs ${path.join(absolutelyPath_RepositoryRoot , 'vendors','antd-with-locales.min@5.22.3#umd.js')}`,
	// 	'mobx' : `__webpack_require__(${JSON.stringify(path.join(absolutelyPath_RepositoryRoot , 'vendors','mobx.development@6.13.5#umd.js'))})`,
	// 	'react' : `__webpack_require__(${JSON.stringify(path.join(absolutelyPath_RepositoryRoot , 'vendors','react.development@18.3.1#umd.js'))})`,
	// 	'react/jsx-runtime' : `__webpack_require__(${JSON.stringify(path.join(absolutelyPath_RepositoryRoot , 'vendors','react-jsx-dev-runtime.production.min@18.3.1#cjs.js'))})`,
	// 	'react-dom' : `__webpack_require__(${JSON.stringify(path.join(absolutelyPath_RepositoryRoot , 'vendors','react-dom.development@18.3.1#umd.js'))})`,
	// 	'react-dom/client' : `__webpack_require__(${JSON.stringify(path.join(absolutelyPath_RepositoryRoot , 'vendors','react-dom.development@18.3.1#umd.js'))})`,
	// 	'lodash' : `__webpack_require__(${JSON.stringify(path.join(absolutelyPath_RepositoryRoot , 'vendors','lodash@4.17.21#umd.js'))})`,
	// 	'antd' : `__webpack_require__(${JSON.stringify(path.join(absolutelyPath_RepositoryRoot , 'vendors','antd-with-locales.min@5.22.3#umd.js'))})`,
	},
	resolve : {
		alias : {
			// 'mobx' : path.join(absolutelyPath_RepositoryRoot , 'vendors','mobx.development@6.13.5#umd.js'),
			// 'react' : path.join(absolutelyPath_RepositoryRoot , 'vendors','react.development@18.3.1#umd.js'),
			// 'react/jsx-runtime' : path.join(absolutelyPath_RepositoryRoot , 'vendors','react-jsx-dev-runtime.production.min@18.3.1#cjs.js'),
			// 'react-dom' : path.join(absolutelyPath_RepositoryRoot , 'vendors','react-dom.development@18.3.1#umd.js'),
			// 'react-dom/client' : path.join(absolutelyPath_RepositoryRoot , 'vendors','react-dom.development@18.3.1#umd.js'),
			// 'lodash' : path.join(absolutelyPath_RepositoryRoot , 'vendors','lodash@4.17.21#umd.js'),
			// 'antd' : path.join(absolutelyPath_RepositoryRoot , 'vendors','antd-with-locales.min@5.22.3#umd.js'),
			
		} ,
	},
	plugins : [
		// new BundleAnalyzerPlugin(),
		new DefinePlugin({
			__DEV__ : JSON.stringify( true ),
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
		new HotModuleReplacementPlugin(),
		new ReactRefreshWebpackPlugin(),
	]
}

import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import dayjs from 'dayjs';
import { port, project, absolutelyPath_RepositoryRoot, absolutelyPath_Engine,mock,env,node_env,method, experimental} from "../toolkit";
import webpack from 'webpack';
import path from "path";
import { LoggerWebpackPlugn, LogWhenSucceed } from "../toolkit";
import {Configuration as WebpackConfiguration} from 'webpack';
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
