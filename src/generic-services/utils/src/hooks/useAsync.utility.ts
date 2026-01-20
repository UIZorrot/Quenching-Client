/** @format  */

import {useCallback, useReducer, useState} from 'react';
import {useMountedRef} from './useMountedRef.utility';

interface State<D> {
  error: Error | null;
  data: D | null;
  stat: 'idle' | 'loading' | 'error' | 'success';
}

const defaultInitialState: State<null> = {
  stat: 'idle',
  data: null,
  error: null,
};

const defaultConfig = {
  throwOnError: false,
};
/**
 * @description 防止组件被卸载后 数据刚请求回来 然后数据挂载的warning
 * @param  {function} dispatch 用于更新的函数
 * @return {function} 处理后的函数
 * @example
 *     const safeDispatch = useSafeDispatch(dispatch);
 */
const useSafeDispatch = <T>(dispatch: (...args: T[]) => void) => {
  const mountedRef = useMountedRef();
  return useCallback((...args: T[]) => (mountedRef.current ? dispatch(...args) : void 0), [dispatch, mountedRef]);
};
/**
 * @description 专门用于处理异步的hooks
 * @param  {State<D>}  initialState 初始的state
 * @param  {}   initialConfig  初始的配置 ---现在设置的不抛出错误
 * @return {Object}
 *  isIdle:当前是否处于闲置状态
 *  isLoading:是否处于loading状态
 *  isError: 是否有错误,
 *  isSuccess: 是否成功,
 *  run: 用来处理异步的方法
 *  setData: 设置data的方法
 *  setError: 设置错误的方法
 *  retry:重新跑一次run的方法用于重新加载
 *  ...state:剩下的state
 * @example
 *  登录中的使用
 *  const { run, isLoading } = useAsync(undefined, { throwOnError: true });
 *  try {
 *       await run(Logo(values));
 *      } catch (e:any) {
 *       onError(e);
 *     }
 *    组件中使用
 *  <Button loading={isLoading} htmlType={"submit"} type={"primary"}>登录</Button>
 */
export const useAsync = <D>(initialState?: State<D>, initialConfig?: typeof defaultConfig) => {
  const config = {...defaultConfig, ...initialConfig};
  const [state, dispatch] = useReducer((state: State<D>, action: Partial<State<D>>) => ({...state, ...action}), {
    ...defaultInitialState,
    ...initialState,
  });
  const safeDispatch = useSafeDispatch(dispatch);
  const [retry, setRetry] = useState(() => () => {});

  const setData = useCallback(
    (data: D) =>
      safeDispatch({
        data,
        stat: 'success',
        error: null,
      }),
    [safeDispatch],
  );

  const setError = useCallback(
    (error: Error) =>
      safeDispatch({
        error,
        stat: 'error',
        data: null,
      }),
    [safeDispatch],
  );

  /**
   * @description 用于处理异步操作的方法
   * @param {Promise} promise 要被处理的promise
   * @param {function} runConfig 可选参数  默认值为刷新方法
   * @return {promise}
   */
  const run = useCallback(
    (promise: Promise<D>, runConfig?: {retry: () => Promise<D>}) => {
      if (!promise || !promise.then) {
        throw new Error('请传入 Promise 类型数据');
      }
      setRetry(() => () => {
        if (runConfig?.retry) {
          run(runConfig?.retry(), runConfig);
        }
      });
      safeDispatch({stat: 'loading'});
      return promise
        .then(data => {
          setData(data);
          return data;
        })
        .catch(error => {
          // catch会消化异常，如果不主动抛出，外面是接收不到异常的
          setError(error);
          if (config.throwOnError) return Promise.reject(error);
          return error;
        });
    },
    [config.throwOnError, setData, setError, safeDispatch],
  );

  return {
    isIdle: state.stat === 'idle',
    isLoading: state.stat === 'loading',
    isError: state.stat === 'error',
    isSuccess: state.stat === 'success',
    run,
    setData,
    setError,
    retry,
    ...state,
  };
};
