
const en_US = reaxper( () => {
	return <div
		className = { less.downloadBtnDiv }
	>
		<Button
			type = "primary"
		>
			<DownloadOutlined />
			Github
		</Button>
	</div>;
} );

const zh_CN = reaxper( () => {
	return <div
		className = { less.downloadBtnDiv }
	>
		<Button
			type = "primary"
		>
			<DownloadOutlined />
			百度网盘
		</Button>
		<Button
			type = "primary"
		>
			<DownloadOutlined />
			夸克网盘
		</Button>
		<Button
			type = "primary"
		>
			<DownloadOutlined />
			Github
		</Button>
	</div>;
} );

export const I18nDownloads: I18nComponents = {
	'en-US' : en_US ,
	'zh-CN' : zh_CN ,
	'zh-TW' : en_US ,
	'ja-JP' : en_US ,
	'ko-KR' : en_US ,
	
};
import * as less from './style.module.less';
import { Button , ButtonProps } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
