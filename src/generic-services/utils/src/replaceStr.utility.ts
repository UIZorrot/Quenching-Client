/**
 * @format
 * @description 将sourceText中的coordinate[0] - coordinate[1]替换为paragraph
 * @example const str = 'The quick brown fox jumps over the lazy dog.'; replace(str,[0,9],'fuck you ass') -> "fuck you ass brown fox jumps over the lazy dog."
 */

export const replaceStrUtility = (
  sourceText: string,
  [coordinate0, coordinate1]: [number, number],
  paragraph: string,
) => {
  const first = sourceText.slice(0, coordinate0);
  const last = sourceText.slice(coordinate1);
  return first.concat(paragraph, last);
};
