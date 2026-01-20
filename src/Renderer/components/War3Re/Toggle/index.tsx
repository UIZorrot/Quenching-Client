export const Toggle = reaxper((props:ToggleProps) => {
	
	
	return <div
		className = { classnames(less['toggle-container']) }
		title={props.tooltip || null}
		style={{
			zoom : {
				'large' : 1.15 ,
				'middle' : .8 ,
				'small' : 0.6 ,
			}[props.size ?? 'middle'] ,
			...(props.style || {}) ,
		}}
	>
		<div
			className= { classnames( "wrapper" , props.disabled && 'disabled' ) }
		>
			<span>{props.labels[0]}</span>
			<label className={classnames(props.value && 'checked')}>
				<input
					type="checkbox"
					onChange={(e) => {
						props.onChange(e.target.checked ? 1 : 0);
					}}
					checked={!!props.value}
				/>
			</label>
			<span>{props.labels[1]}</span>
		</div>
	</div>;
});

export type ToggleProps = {
	size? : 'small' | 'middle' | 'large';
	className? : string;
	disabled? : boolean;
	labels : [ string , string ];
	onChange : ( value:0|1 ) => void;
	value : 0|1,
	style? : React.CSSProperties;
	tooltip? : string;
}


import classnames from 'classnames';
import * as less from './style/index.module.less';


