/** @format */
/**
 * checkType
 *
 * @description Js类型检测
 *
 * @param {*} target 需要被检测的数据
 * @param {string} type 传入的类型
 * @returns {boolean | string}
 * @example
 *
 * checkType() // => undefined
 * checkType('test') // => string
 * checkType(123) // => number
 * checkType(null) // => null
 * checkType(undefined) // => undefined
 * checkType(true) // => boolean
 * checkType(symbol) // => function
 *
 * checkType('test', 'string') // => true
 * checkType(123, 'string') // => false
 * checkType([1,2,3], 'array') // => true
 * checkType({a:"1",b:"2"}, 'object') // => true
 *
 */

function checkType(target: any, type?: string): boolean | string | void {
  if (arguments.length === 0) {
    console.error('Js类型检测方法参数不建议为空。');
    return undefined;
  }
  let TempStr = Object.prototype.toString.call(target).split(' ')[1];
  let CompleteStr = TempStr.slice(0, TempStr.length - 1).toLowerCase();
  if (arguments.length === 1) {
    return CompleteStr;
  }
  if (arguments.length >= 2) {
    let lowercaseType = type.toLowerCase();
    let result = CompleteStr === lowercaseType;
    return result;
  }
}

export default checkType;
