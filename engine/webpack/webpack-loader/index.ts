/**
 * @description
 * 此loader用于使用webpack处理ts module , 将tsm打包编译为一个字符串,用于execuateJavascript()这种场景
 */
export default function (this: LoaderContext<null>, source: string) {
	const webpackConf:Configuration = {
		entry : this.resourcePath,
		output: {
			path: '/tmp', // 虚拟路径，不会写入磁盘
			filename: 'bundle.js',
		},
		module : {
			rules : [
				{
					test : /\.(j|t)sx?/i,
					use : [
						{
							loader : 'babel-loader',
							options : babelConf( "development" , "pure" ),
							
						}
					]
				}
			]
		},
		resolve : {
			extensions : ['.ts','.tsx','.js','.jsx','json']
		}
	};
	const callback = this.async();
	const fs = vol;
	const compiler = webpack(webpackConf);
	
	// 将输出文件系统设置为 memfs
	compiler.outputFileSystem = fs as OutputFileSystem;
	
	// 编译并处理结果
	compiler.run((error, stats) => {
		if (stats?.hasErrors()) {
			console.log(1111111111);
			debugger;
			callback(new Error('56561',{cause:stats.toJson().errors}));
			// throw stats.toJson().errors;
		} else if (error) {
			debugger;
			console.log(222222222);
			callback(error);
			// throw error;
		} else {
			// 获取构建后的文件内容（从内存中读取）
			const outputFile = path.join('/tmp', 'bundle.js'); // 输出文件名
			
			// 从 memfs 获取文件内容
			const result = fs.readFileSync(outputFile, 'utf-8');
			// console.log(result);
			callback(null,`export default ${JSON.stringify(result)}`); // 返回转换后的内容
		}
	});
}

import path from 'path';
import { vol } from 'memfs'; // 引入 memfs 模块
import babelConf from '../../babel/conf';
import webpack, { LoaderContext , Configuration , OutputFileSystem} from 'webpack';
import { getOptions } from 'loader-utils'; 
import validate from 'schema-utils';         
import { urlToRequest } from 'loader-utils'; 
