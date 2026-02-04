/**
 * /*将callback闭包, 永远只会调用一次, 用于防止重复挂载事件
 *
 * @format
 */

export const runOnlyOnce = callback => {
  let first = true;
  return (...args) => {
    if (first) callback(...args), (first = false);
    else return;
  };
};
