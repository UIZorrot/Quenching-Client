export const PrimaryBtn = forwardRef<HTMLDivElement , React.PropsWithChildren<PrimaryBtnProps>>(( props , ref ) => {
	const sizeHeightMap = {
		small : 0.75 ,
		middle : 1 ,
		large : 1.5 ,
	};
	const { children , size = 'middle' , className , disabled , tooltip , onClick , style } = props;
	return (
		<div
			className = { classnames(className,less['primary-btn'], disabled && 'disabled') }
			style = { { zoom : sizeHeightMap[size] , ...(style || {}) } }
			ref = { ref }
			title={tooltip}
			onClick={onClick}
			
		>
			<div
				className = { classnames('front-btn-bg' ) }
			>
				<div className = { classnames('btn-bg') }>
					<span>{ children }</span>
				</div>
			</div>
			<div className = "active-bg" />
		</div>
	);
});


export interface PrimaryBtnProps<T = string> {
	size?: 'small' | 'middle' | 'large';
	className?: string;
	disabled?: boolean;
	tooltip?: string;
	onClick?: ( e?: React.MouseEvent<HTMLDivElement , MouseEvent> ) => void;
	style?: React.CSSProperties;
}

import React , { forwardRef } from 'react';
import classnames from 'classnames';
import * as less from './style/index.module.less';
