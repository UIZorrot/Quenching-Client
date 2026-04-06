/**
 * 给予reaxel_I18n存储上次使用的语言 , 并在载入时尝试恢复
 */
export const rehance_I18n_Persist = (options:Options) => (reaxel_I18n : ReturnType<typeof Refaxel_I18n>) => {
	const defaultOptions:Options = {
		changeOnLoaded:true,
		
	};
	const finalOptions = Object.assign( {} , defaultOptions , options );
	const {setLanguage} = reaxel_I18n();
	const { set , get , remove } = reaxel_storage();
	const storage_key = '|reaxel_i18n_storage|';
	
	obsReaction( (first) => {
		if(first){return}
		set(storage_key,reaxel_I18n.store.language);
	} , () => [reaxel_I18n.store.language] );
	
	if(finalOptions.changeOnLoaded){
		const langInStorage = get( storage_key );
		if(langInStorage && (langInStorage !== 'null')){
			console.log(langInStorage);
			setLanguage( langInStorage as Languages );
		}
	}
	
	return reaxel_I18n;
}

type Options = Partial<{
	//是否在
	changeOnLoaded : boolean,
	
}>;

import { Refaxel_I18n , Languages } from '../../index.tsx';
import { reaxel_storage } from '../../../../reaxels/storage';
