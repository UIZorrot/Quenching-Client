/**
 * 强制保留2位小数
 *
 * @format
 * @param x
 * @returns {string|boolean}
 */

export const toDecimal2 = x => {
  let f = parseFloat(x);
  if (isNaN(f)) {
    return false;
  }
  f = Math.round(x * 100) / 100;
  let s = f.toString();
  let rs = s.indexOf('.');
  if (rs < 0) {
    rs = s.length;
    s += '.';
  }
  while (s.length <= rs + 2) {
    s += '0';
  }
  return s;
};

/**
 * 分转元
 * @param fen
 * @returns {string | boolean}
 */
export const fen2yuan = fen => {
  let num = fen;
  num = fen * 0.01;
  num += '';
  const reg = num.indexOf('.') > -1 ? /(\d{1,3})(?=(?:\d{3})+\.)/g : /(\d{1,3})(?=(?:\d{3})+$)/g;
  num = num.replace(reg, '$1');
  num = toDecimal2(num);
  return num;
};

/**
 * 元转分
 * @param yuan
 * @param digit
 * @returns {number}
 */
export const yuan2fen = (yuan, digit = 100) => {
  let m = 0,
    s1 = yuan.toString(),
    s2 = digit.toString();
  try {
    m += s1.split('.')[1].length;
  } catch (e) {}
  try {
    m += s2.split('.')[1].length;
  } catch (e) {}
  return (Number(s1.replace('.', '')) * Number(s2.replace('.', ''))) / Math.pow(10, m);
};
