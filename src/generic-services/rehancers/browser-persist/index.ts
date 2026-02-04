const keysSet = {};

/**
 * @description 为浏览器环境的store提供持久化功能,刷新页面后恢复之前的业务状态.
 * @param persistKey 为BrowserPersist起一个独一无二的代号(如果不唯一则会抛出错误)
 */
export const rehance_BrowserPersist = function (persistKey:string) {
	
	if(keysSet.hasOwnProperty(persistKey)){
		debugger;
		throw new Error( `Refaxel-Persist ERROR : persist-key冲突,请将<${ persistKey }>修改为另一个不同的persist-key` );
	}else {
		keysSet[persistKey] = true;
	}
	/**
	 * @param {{store,setState,filter}} 
	 * @description 
	 * * store,setState:由orzMobx创建
	 * * filter: 可选的过滤器函数,返回与store相同(但可以裁剪不想要的分支)的结构
	 */
	return <T extends {store:S,setState,filter?},S,>({store,setState,filter}:{store:S,setState,filter?:(store:S) => Partial<S>}) => {
		
		const persistedData = localStorage.getItem( persistKey );
		
		if( persistedData ) {
			setState( JSON.parse(persistedData) );
		}
		
		deepObserve( store , () => {
			let json;
			if(filter){
				if(typeof filter !== 'function'){
					throw new Error( 'filter必须是个函数,且返回值是Partial<Store>' );
				}
				json = JSON.stringify( filter( store ) );
			}else {
				json = JSON.stringify( store );
			}
			
			localStorage.setItem( persistKey , json );
		} );
	}
	
}

import { deepObserve } from 'mobx-utils';
