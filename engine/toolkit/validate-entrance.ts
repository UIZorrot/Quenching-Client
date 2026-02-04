/*排除构建的包,不作为独立的package*/
export const excludedPackages = [];
/*只有在列表中声明的包才可以被运行*/
export const packageList = readdirSync(path.join(absolutelyPath_RepositoryRoot,"projects")).filter((_package) => {
	return !excludedPackages.includes(_package);
});
/*子repo的绝对路径,返回如:F:/electron-reaxes-react/projects/Linker/ */
export const absRepoRoot = path.join(absolutelyFileProtocolPath_RepositoryRoot, `projects/${project}`);
if(!project){
	throw "npm run build <<project>> is nessessary";
}
/*非业务模块不可被打包,因为webpack.base.config.mjs里配置了对通用模块的alias,*/
if (packageList.every((repoName) => project.startsWith(repoName))) {
	throw new Error(`this project "${project}" is not a valid business package`);
}


import {project} from './entrance';
import { getPort , reflect } from "../utils";
import { absolutelyFileProtocolPath_RepositoryRoot , absolutelyPath_RepositoryRoot } from './paths';
import { readdirSync } from 'fs';
import path from "path";
import purdy from 'purdy';
