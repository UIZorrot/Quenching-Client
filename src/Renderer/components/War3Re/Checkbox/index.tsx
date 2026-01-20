export const War3Checkbox = reaxper(( props: React.PropsWithChildren<War3CheckBoxProps> ) => {
	
	props = Object.assign({
		size : '36px' ,
	} , props ?? {} , {} as War3CheckBoxProps);
	
	return <span
		className = { classnames(less['war3-checkbox'] , props.disabled && "disabled") }
		onMouseOver = { props.onMouseOver }
	>
		<label>
			<input
				type = "checkbox"
				checked = { props.checked }
				onChange = { ( e ) => {
					props.onChange?.(e.target.checked);
				} }
				style = { { display : "none" } }
			/>
			<div
				className = { `${ props.checked ? 'checked' : '' } ${ props.disabled ? 'disabled' : '' } checkbox` }
				style = { {
					width : props.size ,
					height : props.size ,
				} }
			/>
			<span className = "label">{ props.children }</span>
		</label>
	</span>;
});

type War3CheckBoxProps = {
	checked: boolean;
	onChange: ( checked: boolean ) => void;
	disabled?: boolean;
	size?: number | string;
	onMouseOver?: ( e ) => void
}

import * as less from './style/index.module.less';
import classnames from 'classnames';
