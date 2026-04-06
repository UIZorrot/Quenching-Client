/**
 * @format
 * @description 生成一个pending状态的promise
 */

export const orzPromise = <T = any>(
  callback?: (resolve: Function, reject: Function) => any,
): Promise<T> & {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
} => {
  let resolve: (value?: any) => void, reject: (reason?: any) => void;
  const promise = new Promise<T>(($resolve, $reject) => {
    resolve = $resolve;
    reject = $reject;
    typeof callback === 'function' && callback($resolve, $reject);
  });
  Object.assign(promise, {
    resolve,
    reject,
  });

  return promise as Promise<T> & {resolve; reject};
};

export type OrzPromise<T = any> = Promise<T> & {resolve:(value:T) => void; reject:(reason:any) => void}
