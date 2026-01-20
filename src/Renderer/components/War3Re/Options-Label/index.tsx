export const OptionsLabel = reaxper(( props:React.PropsWithChildren<OptionsLabelProps> ) => {
	
	
	return <div
		className = { classnames(less['options-label']) }
	>
		<span className="label">{props.label}</span>
		{ props.children }
	</div>;
});

export type OptionsLabelProps = {
	label : string|number;
	
};
import classnames from 'classnames';
import * as less from './style/index.module.less';
