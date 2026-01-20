const { IgnorePlugin } = webpack;

export const electronMainConf: Configuration = {
	target: 'electron-main',
	mode: 'production',
	externalsPresets: {
		// electron : true ,
		// electronMain : true ,
		// electronPreload : true,
	},
	output: {
		library: {
			type: 'umd',
		},
	},
	resolve: {
		fallback: {
			fs: false,
			tls: false,
			net: false,
			path: false,
			zlib: false,
			http: false,
			https: false,
			stream: false,
			crypto: false,
		}
	},
	// externals : {
	// 	electron : 'require("electron")',
	// 	fs : 'require("node:fs")'
	// },
	externals: {
		// electron : 'require("electron")',
		// fs : 'require("fs")',
		// path : 'require("path")',
		// child_process : 'require("child_process")',

	},
	plugins: [
		// new NodePolyfillPlugin() ,
		// new IgnorePlugin( {
		// 	resourceRegExp : /^electron$/ ,
		// } ),
		new webpack.BannerPlugin({
			banner: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
			raw: true,
			entryOnly: true
		})
	],

	node: {
		__dirname: false,
		__filename: false,
	},
};

import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import webpack, { Configuration } from 'webpack';
