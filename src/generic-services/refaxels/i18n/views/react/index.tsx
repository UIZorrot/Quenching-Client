export const createI18nReactComponent = (reaxel_I18n:ReturnType<typeof Refaxel_I18n>) => {
	const { statics } = reaxel_I18n;
	const sourceLanguage = statics.config.find( conf => conf.isSource ).language;
		
	return reaxper( ( props: React.PropsWithChildren<{}> ): React.ReactElement => {
		[ reaxel_I18n.store.language ];
		const children = props.children as string;
		const forceUpdate = utils.useforceUpdate();

		/*暂时不要移除,监测组件是否被不正常地卸载*/
		useEffect( () => {
			// console.log( 'mounted' );
			// return () => console.log( 'unmounted' );
		} , [] );
		
		useEffect( () => {
			forceUpdate();
		} , [ reaxel_I18n.store.loading ] );
		
		if( reaxel_I18n.store.language === sourceLanguage ) {
			return <>{ children }</>;
		}
		
		if( !statics.languageMaps[reaxel_I18n.store.language] || !statics.languageMaps[reaxel_I18n.store.language][children] ) {
			return <>ERR_I18NComponent_MISS_{reaxel_I18n.store.language}({children})</>;
		} else {
			return <>{ statics.languageMaps[reaxel_I18n.store.language][children] }</>;
		}
	} );
}

import { reaxper } from 'reaxes-react';
import { useEffect } from 'react';
import { Refaxel_I18n } from '../../index';
import * as utils from '../../../../utils';
