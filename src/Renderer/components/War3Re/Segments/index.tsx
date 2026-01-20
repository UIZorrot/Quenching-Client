import { forwardRef } from 'react';
import { SegmentedLabeledOption , SegmentedProps } from 'antd/lib/segmented';
import * as less from './style/index.module.less';
import classnames from 'classnames';
import { PrimaryBtn } from '../PrimaryBtn';

export const War3Segmented = reaxper(<T = any>( props: War3SegmentedProps<T> ) => {
	return props.options.map(({
		label,className,disabled,title,value
	}:SegmentedLabeledOption<T>) => {
		return <PrimaryBtn
			key = { Math.random() }
			label = { label }
			size = { props.size }
			value={label}
		/>;
	})
});

const {store,setState} = createReaxable({
	selected:false,
});

type War3SegmentedItemProps<T> = SegmentedLabeledOption<T>&{
	size : 'small'|'middle'|'large';
};

type War3SegmentedProps<T = any> = SegmentedProps<T> & {
	size : 'small'|'middle'|'large';
};
