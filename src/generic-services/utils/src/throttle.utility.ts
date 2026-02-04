/** @format */
/**
 * @description 节流功能
 * @param {function} fn 要进行防抖处理的function
 * @param {number} wait  间隔时间 ms为单位
 * @param {IOptions} options  配置   leading：false 表示禁用第一次执行 trailing: false 表示禁用停止触发的回调
 * @return {function} 进行防抖处理后的函数
 */
interface IOptions {
  leading?: boolean;
  trailing?: boolean;
}
export default function throttle(func, wait, options: IOptions) {
  var timeout, context, args, result;
  var previous = 0;
  if (!options) options = {};

  var later = function () {
    previous = options.leading === false ? 0 : new Date().getTime();
    timeout = null;
    func.apply(context, args);
    if (!timeout) context = args = null;
  };

  var throttled = function () {
    var now = new Date().getTime();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
  };
  return throttled;
}
