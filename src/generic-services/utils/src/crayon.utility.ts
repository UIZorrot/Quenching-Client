type css = {
	[key in keyof CSSStyleDeclaration] : CSSStyleDeclaration[key] ;
	
};
type Crayon = ( ( css: Partial<CSSStyleDeclaration> ) => ( ...logs:any[] ) => void ) & {
	[key in "warn" | "info" | "log" | "error"| "debug"| "trace"]: (( ...any ) => any) & {
	[key in string]: (...any) => any ;
} } & {
	[key in string]: (...any) => any ;
};

/*把驼峰css key 改为短横连*/
const transformCSSHumpToLowercase = (key:keyof CSSStyleDeclaration) => {
	return (key.toString().split('').reduce((accumulator,k) => {
		if(/[A-Z]/.test(k)){
			return accumulator.concat( '-'.concat( k.toLowerCase() ) );
		}
		return accumulator.concat(k);
	},'')) as keyof CSSStyleDeclaration;
};
/*将驼峰css key对象改为短横连*/
const batchTransformCSSHumpToLowercase = (object:{[key in keyof CSSStyleDeclaration] : any}) => {
	const obj = {};
	for(const key in object){ /*@ts-ignore*/
		obj[transformCSSHumpToLowercase(key)] = object[key];
	}
	return obj;
};
/**
 * chalk的山寨版:crayon 用于打印更优美的日志
 * 
 * @example 
   crayon({
      'background-color' : "red" ,
      color : "green" ,
   })('这里放字符串',{a:1})
 
   crayon.warn.red('以警告的方式打印红色文字',{a:1});
   crayon.warn('以警告的方式打印',{a:1});
   
    
 */

/* secondary是console.log第二项的cssPropertiesString*/
const argumentsAgent = (secondary , ...args) => args.reduce((accu, arg , index ) => (accu[0] += typeof arg === "string" ? arg : (accu.push(arg),"%o"),accu) ,['%c',secondary]);


export const crayon : Crayon = new Proxy((cssProperties:Partial<CSSStyleDeclaration> = {}) => {
	/*using as crayon({CSSProperties})('wanna log msg')*/
	return (...logs) => {
		let cssString = Object.keys(cssProperties).reduce((accumulator,key:string) => {
			/*@ts-ignore*/
			const res = `${accumulator}${String(transformCSSHumpToLowercase(key))}:${cssProperties[key]};`
			return res;
		},'');
		if(!cssString.includes('font-weight')){
			cssString += `font-weight:normal;`;
		}
		console.groupCollapsed(...argumentsAgent( cssString,...logs ));
		console.trace(`%c`,'font-weight:normal;');
		console.groupEnd();
		return;
	};
},{
	get : (target, propKey:string, receiver) => {
		
		if([
			"prototype",
			"hasOwnProperty",
			"toString",
			"prototype",
			"length",
			"name",
			"arguments",
			"constructor",
			"isPrototypeOf",
			"apply",
			"call",
			"bind",
		].includes(propKey)){
			return target[ propKey ];
		}
		
		const createColorProxy = ( type = "trace" ) => new Proxy( (...logs) => {
			if(type === "trace"){
				console.groupCollapsed(...argumentsAgent( `color:${ propKey };font-weight:normal;`,...logs ));
				console.trace(`%c`,'font-weight:normal;');
				console.groupEnd();
				return;
			}
			return console[type]( ...argumentsAgent( `color:${ propKey }`,...logs ) );
		} , {
			get : ( target , _propKey , receiver ) => {
				
				return ( ...logs ) => {
					if(type === "trace"){
						console.groupCollapsed(...argumentsAgent( `color:${ _propKey as string };font-weight:normal;`,...logs ));
						console.trace(`%c`,'font-weight:normal;');
						console.groupEnd();
						return;
					}
					/*当crayon.blue('',...args)时,babel使用了apply来隐式转换扩展运算符 , 导致了proxy拿到的是'apply'而非'blue' */
					if ( _propKey === "apply" ) {
						const [,_logs] = logs;
						if ( type === "trace" ) {
							console.groupCollapsed( ...argumentsAgent( `color:${ propKey }`,..._logs )  );
							console.trace( `%c` , 'font-weight:normal;' );
							console.groupEnd();
							return;
						}
						return console[type]( ...argumentsAgent( `color:${ propKey }`,..._logs ) );
					}
					return console[type]( ...argumentsAgent( `color:${ _propKey.toString() }`,...logs ) );
				};
			} ,
		} );
		switch ( propKey ){
			case "trace" :
			case "warn" : 
			case "log" : 
			case "info" : 
			case "error" :
			case "debug" :
				return createColorProxy(propKey);
		}
		return createColorProxy("trace");
	},
}) as Crayon;

/*示例 & 测试*/
if(0){
	crayon({fontSize : "33px"})('erer',2342343,{a:23},'erer');
	crayon.warn['#eee']('dsdsdsdsds',{b:222});
	crayon.warn('dsdsdsdsds',{b:222});
	crayon.log('dsdsdsdsds',{b:222});
	crayon.purple('1111111111111',{b:222});

	crayon( {
		backgroundColor : "blue" ,
		color : "green" ,
		fontSize : "24px",
		
		
	} )( 'bbbbbbbbbbbbbbb' , { a : 1 } );
	crayon({color:"purple"})('asdasd',{a:1},'fafsdsd',{b:2},undefined);
	
	crayon[ "#aabbcc" ]( "asdsadsd");
}

