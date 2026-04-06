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
	
}

import webpack,{Configuration} from 'webpack';
