const { ExternalsPlugin } = webpack;

export const electronRendererConf : Configuration = {
	
	// target : "electron-renderer",
	externalsPresets : {
		// electron : true ,
	} ,
	plugins : [
		new webpack.ExternalsPlugin( 'commonjs' , [
			'electron',
		] ),
		
	],
	// mdx-m3-viewer bundles fengari for optional map/Lua parsing. Those code paths are
	// browser-only; explicitly disable Node built-ins so the renderer bundle stays safe.
	resolve: {
		fallback: {
			fs: false,
			os: false,
			path: false,
		},
	},
	
}

import webpack,{Configuration} from 'webpack';
