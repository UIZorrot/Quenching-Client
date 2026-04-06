/**
 * @format
 * @desc 转换数据的工具类
 */

export const formatter = new (class {
  /**
   * 将数组添加随机key , 返回新数组
   * @param source
   */
  addKey = <T extends any[]>(source: T): (ArrayElement<T> & {key: number})[] => {
    if (Array.isArray(source)) {
      let flag = true;
      for (const i of source) {
        if (!i.hasOwnProperty('key')) {
          flag = false;
          break;
        }
      }
      if (flag === true) return source;
      return source.map(
        item =>
          ({
            ...item,
            key: Math.random(),
          } as ArrayElement<T> & {key: number}),
      );
    }
    throw '必须传入数组';
  };
})();
