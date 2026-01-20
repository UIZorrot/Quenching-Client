export const I18NDropdown = reaxper( () => {
	
	const { setLanguage } = reaxel_I18n();
	
	return (
		<span className = { less["i18nDropdown"] }>
			<Dropdown
				menu = { {
					items : menu ,
					onClick : ( info ) => {
						setLanguage( info.key as Languages );
					} ,
					selectedKeys : [reaxel_I18n.store.language]
				} as MenuProps}
				trigger = { [ "click" ] }
				overlayStyle={{
					fontFamily : "twemoji"
				}}
				
			>
				<span
					style = { {
						color : "#045b73" ,
						cursor : "pointer" ,
						display : 'flex',
						alignItems : 'center',
						
					} }
					onClick = { ( e ) => {
						e.preventDefault();
					} }
				>
					<SVG_I18n style={{width : '24px', height : '24px',marginTop : '1px'}}/>
					<span style={{
						fontSize : '18px',
						marginLeft : '5px'
					}}>Language</span>
				</span>
			</Dropdown>
		</span>
	);
} );

const menu:DropDownProps['menu']['items']  = [
	{
		key: 'en-US',
		label: <a target="_blank" rel="noopener noreferrer">🇺🇸 English</a>,
	},
	{
		key: 'ko-KR',
		label: <a target="_blank" rel="noopener noreferrer">🇰🇷 한국어 (Korean)</a>,
	},
	{
		key: 'ja-JP',
		label: <a target="_blank" rel="noopener noreferrer">🇯🇵 日本語 (Japanese)</a>,
	},
	{
		key: 'zh-TW',
		label: <a target="_blank" rel="noopener noreferrer">🇹🇼 正體中文 (Traditional Chinese)</a>,
	},
	{
		key: 'zh-CN',
		label: <a target="_blank" rel="noopener noreferrer">🇨🇳 简体中文 (Simplified Chinese)</a>,
	},
] as any;

type props = React.PropsWithChildren<{}>;

import { SVG_I18n } from '#renderer/pure-components/SVG/I18n.component';
import * as less from './style.module.less';
import { Dropdown , DropDownProps} from 'antd';
import { reaxel_I18n } from '#renderer/reaxels/i18n';
import { MenuProps } from 'antd';
