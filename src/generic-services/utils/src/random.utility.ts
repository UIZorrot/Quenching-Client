/**
 *
 * Random工具方法
 *
 */

const Random = {
  /**
   * color
   *
   * @description 生成随机颜色
   * @function
   * @returns {string} 一个随机的HEX格式的颜色
   * @example
   *
   *    Random.color() // => '#000000'
   */
  color() {
    return '#' + Math.floor(Math.random() * 0xffffff).toString(16);
  },

  /**
   * number
   *
   * @description 生成指定范围[min, max]的随机数
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @param {boolean|number} float - 控制小数展示以及小数位数，默认值为false
   * @function
   * @returns {number} 一个随机范围的数字
   * @example
   *
   *    Random.number(1, 100) // => 50
   *    Random.number(1, 100, true) // => 66.357922312356983
   *    Random.number(1, 100, 1) // => 29.1
   *    Random.number(1, 100, 3) // => 61.232
   */
  number(min: number, max: number, float?: number | boolean) {
    if (min === undefined) {
      return Math.random();
    }

    if (max === undefined) {
      max = min;
      min = 0;
    }

    if (max < min) {
      let tmp = max;
      max = min;
      min = tmp;
    }

    if (float) {
      let result = Math.random() * (max - min) + min;
      if (float === true) {
        return result;
      } else if (typeof float === 'number') {
        let str = result.toString();
        let index = str.indexOf('.');
        str = str.substr(0, index + 1 + float);
        if (str[str.length - 1] === '0') {
          str = str.substr(0, str.length - 1) + _.random(1, 9);
        }
        return parseFloat(str);
      }
    }

    return Math.floor(Math.random() * (max - min + 1) + min);
  },
};

export default Random;
