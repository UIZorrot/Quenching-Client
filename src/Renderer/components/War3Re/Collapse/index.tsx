export const Collapse = reaxper((props:CollapseProps) => {
	
	
	return <AntdCollapse
		style={props.style}
		items = { props.items }
		className={classnames(less['collapse'],)}
		expandIcon={	(panelProps) => <span className={classnames(panelProps.isActive && 'active')}/>}
		expandIconPosition="end"
		ghost
		accordion
	/>;
});

export type CollapseProps = {
	activeKey : string[] | string | number[] | number;
	items : AntdCollapseProps['items'];
	className? : string;
	onChange? : ( key:string ) => void;
	size? : AntdCollapseProps['size'];
	style? : React.CSSProperties;
}


import classnames from 'classnames';
import * as less from './style/index.module.less';
import { Collapse as AntdCollapse } from 'antd';
import { CollapseProps as AntdCollapseProps } from 'antd';
