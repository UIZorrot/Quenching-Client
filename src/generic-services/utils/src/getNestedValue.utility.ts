/** @format */

import checkType from './checkType.utility';
/**
 * getNestedValue
 *
 * @description 安全获取嵌套对象属性方法
 *
 * @param {object} targetObj - 原始对象
 * @param {Array} keys - 值列表
 * @returns {*}
 *
 * @example
 *    const a = {
 *		b: {
 *		  c:1
 *		}
 *	  };
 *    getNestedValue(a, 'b') // => {c:1}
 *    getNestedValue(a,'b','c') // => 1
 *    getNestedValue(a,'f','c') // => undefined
 *
 *    getNestedValue(a, ['b']) // => {c:1}
 *    getNestedValue(a,['b','c']) // => {c:1}
 *    getNestedValue(a,['f','c']) // => undefined
 *
 */
function getNestedValue(targetObj: object, keys: any[]): any {
  //调用的对象不能为空，并必须为Object数据类型
  if (!targetObj || !checkType(targetObj, 'object')) {
    console.error('调用的对象不能为空，并必须为【Object】数据类型。');
    return undefined;
  }
  //兼容数组式和列表式两种调用方式
  if (!checkType(keys, 'array')) {
    keys = Array.prototype.slice.call(arguments, 1);
  }
  let key = keys.shift();

  if (keys.length === 0) {
    return targetObj[key];
  } else {
    return getNestedValue.call(this, targetObj[key], keys);
  }
}

export default getNestedValue;
