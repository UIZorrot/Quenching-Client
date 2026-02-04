/**
 * webpack转译包含mjs,js,jsx,ts,tsx等格式,如果正则测试不通过则报错
 */

export const moduleExtsRegExp = () => {
	const regExp = /\.(m?js)|(jsx?)|(tsx?)$/i;
	const cases = ['a.js','a.jsx','a.ts','a.tsx','a.mjs'];
	/*只要有一种格式没通过测试, 则抛出错误.*/
	if(cases.every(case_ => regExp.test(case_))){
		return regExp;
	}else {
		throw new Error('正则表达式未通过文件格式测试!');
	}
}
