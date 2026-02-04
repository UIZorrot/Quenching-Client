
/*工程根目录,也是启动nodejs的目录,Z:/electron-reaxes-react/*/
export const absolutelyPath_RepositoryRoot = process.cwd();

//electron-reaxes-react目录的文件路径,返回file:///F:/electron-reaxes-react/
export const absolutelyFileProtocolPath_RepositoryRoot = pathToFileURL(absolutelyPath_RepositoryRoot).href;

//
export const absolutelyPath_Engine = path.join(absolutelyPath_RepositoryRoot, 'engine');

//
export const absolutelyPath_Src = path.join(absolutelyPath_RepositoryRoot, 'src');

//
export const absolutelyPath_GenericServices = path.join(absolutelyPath_Src, 'generic-services');


/**
 * 入参`subProject`,形如"Autohotkey-GUI/War3"
 * @example
 * `subProjectRootPath` : 返回subProject到repositryRoot的相对路径,如"/projects/Autohotkey-GUI/projects/War3"
 * `subProjectName` : 返回subProject的repoName,如"War3"
 * `subProjectDistPath` : 返回打包产物路径,如"/projects/Autohotkey-GUI/projects/War3/dist"
 */
export const getProjectPaths = () => {

	const absolutelyPath_subproject = absolutelyPath_RepositoryRoot;
	const absolutelyPath_subprojectDist = path.join(absolutelyPath_subproject, "dist");
	const name_subproject = "quenching-mod-client";

	return {
		absolutelyPath_subproject,
		name_subproject,
		absolutelyPath_subprojectDist,
	}
}

getProjectPaths.default = getProjectPaths();
// console.log(111111111,getProjectPaths.default.absolutelyPath_subprojectDist);

import { pathToFileURL } from "url";
// import { project } from '../toolkit/entrance';
import process from "process";
import path from 'path';
