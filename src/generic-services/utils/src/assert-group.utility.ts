/**
 * 断言一组表达式是否全部为<expected>
 * @example   
     assert(true,[true,true,false]) -> false
 * @param expected 预期的结果值
 * @param expressionList
 *
 */
const print = ( value ) => typeof value === 'string' ? `"${ value }"` : value;
export const assert = <Expect extends any , List extends any[]>( expected : Expect , expressionList:List , consoleWarn = false ):boolean => {
	for(let i = 0 ; i < expressionList.length ; i++){
		const value = expressionList[ i ];
		if ( value !== expected ) {
			if(consoleWarn) crayon.coral( `断言组第 `,i,` 个表达式不符合预期为 ` ,  print(expected) ,` 的结果, expressionList[`,i,`]: ` , print(value) );
			return false;
		}
	}
	
	return true;
};




/**
 * 组断言函数
 *
 * @example exp1 === true && exp2 === true && exp3  ==> assertTrue([exp1,exp2,exp3]) === true
 * @param array 一组表达式
 */


export const assertTrue = ( array , consoleWarn = false) => assert( true , array , consoleWarn );

/**每一组断言均为false时返回true*/
export const assertFalse = ( array ,consoleWarn = false) => assert( false , array , consoleWarn );


/**
 * 断言-一组表达式中只要有一个符合@param1则返回true
 * @example 
      assert1of(false , [true,true,false,true]) -> true
 */
export const assert1of = <Expected extends any,ExpressionList extends any[]>( expected:Expected , expressionList:ExpressionList , consoleWarn:boolean = false  ) :boolean => {
	for ( let i = 0 ; i < expressionList.length ; i++ ) {
		const value = expressionList[ i ];
		if ( value === expected ) {
			if(consoleWarn) crayon['#81cc00']( `断言组第 `,i,` 个表达式符合预期为 ` ,  print(expected) ,` 的结果, expressionList[`,i,`]: ` , print(value) );
			return true;
		};
	}
	if(consoleWarn) crayon.coral( `断言组每个值都不符合预期为 ` ,  print(expected) ,` 的结果, expressionList: ` , print(expressionList) );
	return false;
};

export const assert1ofTrue = (expressionList , consoleWarn = false) => assert1of( true , expressionList ,consoleWarn);
export const assert1ofFalse = (expressionList , consoleWarn = false) => assert1of( false , expressionList ,consoleWarn );

import {crayon} from './'


/**
 * @test
 * 
 */
if(0){
	const a = assert({a:1},["abc",{a:1},"abc"] , true);
	console.log( a );
	assert1of( 111 , [22,11221,2] , true );
}
