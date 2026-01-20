export const War3Dropdown = reaxper(( props: War3DropdownProps ) => {
	const zoom = {
		'small' : .8 ,
		'middle' : .6 ,
		'large' : .6 ,
	}[props.size ?? 'middle'];
	
	const Btn = reaxper(React.forwardRef<HTMLDivElement,{
		onMouseEnter? : React.MouseEventHandler;
		onMouseLeave? : React.MouseEventHandler;
		onFocus? : React.FocusEventHandler;
		onClick? : React.MouseEventHandler;
		className? : string;
	}>((_props,ref) => {
		return <div
			{...(props.disabled ? {} : _props)}
			ref = {ref}
			className = { classnames(less['dropdown-btn'],_props.className ) }
			style = { { zoom } }
			title = { props.tooltip }
		>
			<Button
				style = { {
					width : props?.width || 'auto' ,
				} }
				className = { classnames(props.disabled && 'disabled') }
			>
				{ props.menu.items.find((itm) => itm.key === props.value)?.label }
			</Button>
		</div>;
	}));
	
	return <ConfigProvider theme = { { token : { motion : false } } }>
		<Dropdown
			menu = { props.menu }
			trigger = { [ 'click' ] }
			open = { props.open }
			onOpenChange = { props.onOpenChange }
			overlayClassName = { classnames(less['dropdown']) }
			overlayStyle = { {
				zoom : .8
			} }
		>
			<Btn />
		</Dropdown>
	</ConfigProvider>;
});

export type War3DropdownProps = {
	menu: MenuProps;
	value: string;
	width?: string;
	size?: 'large' | 'middle' | 'small';
	disabled? : boolean;
	tooltip?: string;
} & Pick<DropdownProps , "open" | "onOpenChange">;

import { ReactPortal } from 'react';
import { Button , ConfigProvider , Dropdown , DropdownProps , MenuProps } from 'antd';
import * as less from './style/index.module.less';
import { shallowEqual } from '#generic/utils';
import classnames from 'classnames';
import React from 'react';
