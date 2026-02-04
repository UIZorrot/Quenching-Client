export const I18NDropdown = reaxper(() => {

	const { setLanguage, t } = reaxel_I18n();

	return (
		<span className={less["i18nDropdown"]}>
			<Dropdown
				menu={{
					items: Object.entries(reaxel_I18n.statics.supportedLanguages).map(([key, lang]) => ({
						key,
						label: (
							<a target="_blank" rel="noopener noreferrer">
								{lang.flag} {lang.name}
							</a>
						)
					})),
					onClick: (info) => {
						setLanguage(info.key as any);
					},
					selectedKeys: [reaxel_I18n.store.currentLanguage]
				} as MenuProps}
				trigger={["click"]}
				overlayStyle={{
					fontFamily: "twemoji"
				}}

			>
				<span
					style={{
						color: "#045b73",
						cursor: "pointer",
						display: 'flex',
						alignItems: 'center',

					}}
					onClick={(e) => {
						e.preventDefault();
					}}
				>
					<SVG_I18n style={{ width: '24px', height: '24px', marginTop: '1px' }} />
					<span style={{
						fontSize: '18px',
						marginLeft: '5px'
					}}>{t('language.title')}</span>
				</span>
			</Dropdown>
		</span>
	);
});

import { SVG_I18n } from '#renderer/pure-components/SVG/I18n.component';
import * as less from './style.module.less';
import { Dropdown } from 'antd';
import { reaxel_I18n } from '#renderer/utils/i18n';
import { MenuProps } from 'antd';
import { reaxper } from 'reaxes-react';
import React from 'react';
