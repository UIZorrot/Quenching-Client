/**
 * @format
 * @description 判断一切(后端认为的)空值,包括 undefined,null,{},[],""
 */

export const checkGenericNull = (val: any): boolean => {
  switch (val) {
    case null:
    case '':
    case undefined:
      return true;
  }
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.length === 0;
    else return Object.keys(val).length === 0;
  }
  return false;
};
