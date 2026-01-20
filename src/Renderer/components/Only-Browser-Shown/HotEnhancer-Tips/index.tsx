export const HotEnhancerTips = reaxper( () => {
	if( isElectron ) {
		return null;
	}
	const { language } = reaxel_I18n();
	const I18nDesc = I18nTipsDesc[language];
	const Download = I18nDownloads[language];
	return <div
		style = { {
			marginTop : "24px" ,
			width : '68%'
		} }
	>
		<Alert
			message = { <I18n>These showing functions are not available until you download the app.</I18n> }
			description = { <Download /> }
		/>
	</div>;
} );


const I18nTipsDesc: I18nComponents = {
	'en-US' : reaxper( () => {
		const { language } = reaxel_I18n();
		const Download = I18nDownloads[language];
		return <div>
			<span>
				These showing functions are not available until you <a href = "https://github.com">download the app here</a> .
			</span>
			<Download/>
		</div>;
	} ) ,
	"zh-CN" : reaxper( () => {
		return <span>
			正在展示的魔兽助手开关没有实际作用,仅作展示。
			<a href = "https://github.com">在此下载exe</a>
			安装后方可使用
		</span>;
	} ) ,
	"zh-TW" : reaxper( () => {
		return <span>
			These showing functions are not available until you <a href = "https://github.com">download the app here</a> .
		</span>;
	} ) ,
	"ko-KR" : reaxper( () => {
		return <span>
			These showing functions are not available until you <a href = "https://github.com">download the app here</a> .
		</span>;
	} ) ,
	"ja-JP" : reaxper( () => {
		return <span>
			These showing functions are not available until you <a href = "https://github.com">download the app here</a> .
		</span>;
	} ) ,
};
import { I18nDownloads } from './I18n-Downloads';
import { reaxel_I18n } from '#renderer/reaxels/i18n';
import { isElectron } from '#renderer/ENV';
import { Alert } from 'antd';
