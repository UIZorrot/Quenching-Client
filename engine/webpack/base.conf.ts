const cssLoaderOptions = {
	sourceMap: true,
	modules: {
		exportLocalsConvention: 'dashes',
		localIdentName: '[local]--[hash:base64:4]',
	},
};
const { ProvidePlugin, DefinePlugin } = webpack;
const { absolutelyPath_subproject, absolutelyPath_subprojectDist } = getProjectPaths.default;
/**
 * suggest dev环境建议使用全量source-map , 否则可能会导致错误栈无法定位到正确的模块
 */
/*webpack基础配置*/
export const webpackBaseConf: Configuration = {
	mode: node_env as "development" | "production",
	output: {
		filename: '[name].js',
		path: absolutelyPath_subprojectDist,
		// publicPath : path.resolve(rootPath , 'dist') ,
	},
	resolve: {
		// aliasFields: ['browser'],
		alias: {
			'#root': absolutelyPath_RepositoryRoot,
			'#root-projects': absolutelyPath_Src,
			'#project': absolutelyPath_subproject,
			'#generic': path.join(absolutelyPath_Src, 'generic-services'),

		},
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
	},
	devtool: node_env === 'production' ? 'cheap-source-map' : 'source-map',
	module: {
		rules: [
			{
				test: /\.m?js$/,
				resolve: {
					fullySpecified: false,
				},
			},
			/*for react/ts/tsx etc. generation js files */
			{
				test: (value,) => {
					switch (true) {
						//排除raw
						case /\.raw\.(t|j)sx?$/i.test(value):
							return false;
						case /\.(t|j)sx?$/i.test(value):
							return true;
					}
				},
				use: {
					loader: 'babel-loader',
					options: babelConf(node_env as "development" | "production", 'browser'),
				},
				exclude: /node_modules/,
			},
			{
				test: /\.module\.less$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: cssLoaderOptions,
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true,
							lessOptions: {
								javascriptEnabled: true,
							},
						},
					},
				],
			},
			{
				test: /(?<!(\.module|\.theme))\.less$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: _.pick(cssLoaderOptions, ['sourceMap']),
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true,
							lessOptions: {
								javascriptEnabled: true,
							},
						},
					},
				],
			},
			{
				test: /\.module\.css$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: cssLoaderOptions,
					},
				],
			},
			{
				test: /(?<!(\.module|\.theme))\.css$/,
				use: [
					{
						loader: 'style-loader',
					},
					{
						loader: 'css-loader',
						options: _.pick(cssLoaderOptions, ['sourceMap']),
					},
				],
			},
			{
				test: /\.theme\.(le|c)ss$/, // type :  "asset/source",
				use: [
					{
						loader: 'css-loader',
						options: _.pick(cssLoaderOptions, ['sourceMap']),
					},
					{
						loader: 'less-loader',
						options: {
							sourceMap: true,
							lessOptions: {
								javascriptEnabled: true,
							},
						},
					},
				],
			},
			{
				test: /\.(png|jpe?g|te?xt|gif|woff|woff2|eot|ttf|otf|bmp|swf|mp4|mov)$/,
				type: 'asset/resource',
				generator: {
					filename: 'static/[hash][ext][query]',
				},
				parser: {
					dataUrlCondition: {
						maxSize: 10 * 1024,
					},
				},
			},
			//import js/ts as code string
			{
				test: /\.raw\.(t|j)sx?$/i,
				use: [{
					loader: path.join(absolutelyPath_Engine, 'webpack/webpack-loader/index.ts')
				}]
				// use : [
				// 	{
				// 		loader : 'raw-loader',
				// 		options : {
				// 			esModule : false,
				// 		}
				// 	},
				// 	{
				// 		loader: 'babel-loader',
				// 		options : babelConf(node_env as "development"|"production" , 'browser'),
				// 	}
				// ],
			},
			{
				test: /\.component\.svg$/,
				use: ['@svgr/webpack'],
			},
			{
				test: /(?<!\.component)\.svg$/,
				type: 'asset/resource',
			},
		],
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				extractComments: false,
				terserOptions: {
					format: {
						comments: false,
					},
				},
			}),
		],
	},
	performance: {
		maxEntrypointSize: 10000000,
		maxAssetSize: 30000000,
	},
	stats: 'errors-only',
	plugins: [
		new DefinePlugin({
			__IS_MOCK__: mock ? 'true' : 'false',
			__ENV__: JSON.stringify(env),
			// __ENV_CONFIG__ : JSON.stringify(__ENV_CONFIG__) ,
			__NODE_ENV__: JSON.stringify(node_env as "development" | "production"),
			__METHOD__: JSON.stringify(method),
			__EXPERIMENTAL__: JSON.stringify(experimental === 'experimental'),
			__DEV_PORT__: JSON.stringify(port),
			__REPO_ROOT__: JSON.stringify(absolutelyPath_RepositoryRoot),

		}),
		new ProvidePlugin({
			_: ['lodash'],
			React: ['react'],
			useState: ['react', 'useState'],
			useEffect: ['react', 'useEffect'],
			useRef: ['react', 'useRef'],
			useLayoutEffect: ['react', 'useLayoutEffect'],
			useMemo: ['react', 'useMemo'],
			useCallback: ['react', 'useCallback'],

			reaxper: ['reaxes-react', 'reaxper'],
			Reaxlass: ['reaxes-react', 'Reaxlass'],
			createReaxable: ['reaxes', 'createReaxable'],
			reaxel: ['reaxes', 'reaxel'],
			obsReaction: ["reaxes", "obsReaction"],
			distinctCallback: ["reaxes", "distinctCallback"],
			collectDeps: ["reaxes", "collectDeps"],

			xPromise: ['reaxes-utils', 'xPromise'],
			utils: ['reaxes-utils'],
			antd: ['antd'],
			toolkits: ['reaxes-toolkits'],
			crayon: ['reaxes-utils', 'crayon'],
			logProxy: ['reaxes-utils', 'logProxy'],
			decodeQueryString: ['reaxes-utils', 'decodeQueryString'],
			encodeQueryString: ['reaxes-utils', 'encodeQueryString'],
			stringify: ['reaxes-utils', 'stringify'],
			// request: ['@@requester', 'request'],
			// I18n: ['@@reaxels/i18n', 'I18n'],
			// i18n: ['@@reaxels/i18n', 'i18n'],

		}),
	],
};


const distributeScriptParser = (rule: webpack.RuleSetRule, hostEnv: "node" | "browser") => {
	return {
		...rule,
		use: {
			...rule.use as any,
			options: babelConf(node_env as "development" | "production", hostEnv),
		},
	}
}
distributeScriptParser.judge = (rule: webpack.RuleSetRule) => {
	if (!rule.test) {
		return false
	}
	let testResult;
	switch (true) {
		case _.isFunction(rule.test) && rule.test('app.tsx'):
		case _.isRegExp(rule.test) && rule.test.test('app.tsx'):
			return true;
		default:
			return false;
	}
}

export const webpackBaseConfBrowser: Configuration = {
	...webpackBaseConf,
	module: {
		...webpackBaseConf.module,
		rules: webpackBaseConf.module.rules.map((rule: webpack.RuleSetRule) => {
			if (distributeScriptParser.judge(rule)) {
				return distributeScriptParser(rule, "browser");
			} else {
				return rule;
			}
		}),
	},
}
export const webpackBaseConfNode: Configuration = {
	...webpackBaseConf,
	module: {
		...webpackBaseConf.module,
		rules: webpackBaseConf.module.rules.map((rule: webpack.RuleSetRule) => {
			if (distributeScriptParser.judge(rule)) {
				return distributeScriptParser(rule, "node");
			} else {
				return rule;
			}
		}),
	},
}

import WebpackLoader from './webpack-loader';
import {
	absolutelyPath_RepositoryRoot,
	absolutelyPath_Src,
	absolutelyPath_Engine,
	getProjectPaths,
	env,
	experimental,
	method,
	mock,
	node_env,
	port,
} from '../toolkit';
import babelConf from '../babel/conf';
import _ from 'lodash';
import path from 'path';
import webpack, { Configuration } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import RawLoader from 'raw-loader';
