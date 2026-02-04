import shallowequal from 'shallowequal';

export const {
	assignPick,
	shallowEqual,
} = new class {
	/**
	 * 从一个对象里挑出需要的键值对,此方法修改源对象
	 * note: this fn will change original object!
	 */
	assignPick = <O extends {} , K extends Array<keyof O>>(object : O , keys : K) : Pick<O , ArrayElement<K>> => {
		Object.keys(object).forEach((k) => {/*@ts-ignore*/
			if( !keys.includes(k) ) {
				delete object[k];
			}
		});
		return object as Pick<O , ArrayElement<K>>;
	};
	/**
	 * 浅比较两个索引对象相等性
	 * @type {(src, target) => boolean}
	 */
	shallowEqual : (src , target) => boolean = shallowequal;
}();


/*无依赖@@utils的放上面*/
export * from './dayjs.utility';
export * from './isPromise.utility';
export * from './debounce.utility';
export * from './stringify.utility';
export * from './crayon.utility';
export * from './checkGenericNull.utility';
export * from './runOnlyOnce.utility';
export * from './ConditionRender.utility';
export * from './makePair.utility';
export * from './timer.utility';
export * from './replaceStr.utility';
export * from './queryString.utility';
export * from './orzPromise.utility';

export * from './assert-group.utility';
export * from './dataflow.utility';

export * from './logProxy.utility';

export * from "./hooks";

export {default as Cookie} from './cookie.utility';
export {default as checkType} from './checkType.utility';
export {default as getNestedValue} from './getNestedValue.utility';
export {default as Random} from './random.utility';
export {default as throttle} from './throttle.utility';



