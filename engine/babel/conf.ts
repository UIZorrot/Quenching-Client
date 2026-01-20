export default (env : "development"|"production" , host : "browser"|"node"|"pure") => {
	return {
		cacheDirectory : true , // 启用缓存以加速构建
		sourceMaps : true,
		presets : [
			[
				"@babel/preset-env" ,
				{
					modules : false ,
				} ,
			] ,
			[
				"@babel/preset-react" ,
				{
					runtime : "automatic" ,
				} ,
			] ,
			[ "@babel/preset-typescript" , 
				{ 
					// onlyRemoveTypeImports : true
				}
			] ,
		].filter(Boolean) ,
		plugins : [
			(env === 'development') && (host === 'browser') && "react-refresh/babel" ,
			[
				"@babel/plugin-proposal-decorators" ,
				{
					legacy : true ,
				} ,
			] ,
			"@babel/plugin-proposal-do-expressions" ,
			"@babel/plugin-proposal-duplicate-named-capturing-groups-regex" ,
			"@babel/plugin-proposal-export-default-from" ,
			"@babel/plugin-proposal-function-bind" ,
			"@babel/plugin-proposal-throw-expressions" ,
		].filter( Boolean ) ,
	} as TransformOptions;
};

import type { TransformOptions } from '@babel/core';
