export const SettingItem = reaxper(( props: SettingItemProps ) => {
	
	
	return <FormItem
		className={classnames(less['setting-form-item'])}
		label = { <span className={classnames(less['setting-item-label'],)} >{ props.label }</span> }
		layout = { props.layout }
	
	>
		{ props.children }
	</FormItem>;
});

export type SettingItemProps = React.PropsWithChildren<{
	label?: string;
	layout?: FormItemProps['layout'];
	
}>;

import FormItem ,{ FormItemProps } from 'antd/es/form/FormItem';

import classnames from 'classnames';
import * as less from './style/index.module.less';
