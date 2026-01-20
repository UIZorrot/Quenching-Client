import { reaxel_storage } from '../../reaxels/storage';
export const i18n_language_symbol = Symbol('__reaxel--i18n__');
/*为reaxel-i18n勾入storage能力*/
export const reaxel_i18n_storage = function(){
	const {set,remove,get} = reaxel_storage();
	let ret = {
		writeToStorage(lang:string){
			set(i18n_language_symbol.description , lang)
		},
		readFromStorage(callback){
			callback(get(i18n_language_symbol.description));
			
		},
		clearI18nStorage(){
			remove( i18n_language_symbol.description );
		},
	};
	
	return (changLang) => {
		ret.readFromStorage( ( lang : string ) => {
			if ( lang ) {
				changLang( lang );
			}
			
		} );
		
		return ret;
	}
}();
