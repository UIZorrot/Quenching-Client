export const RuntimeTester = reaxper( () => {
	const ref: LottieRef = useRef();
	
	const [ scheme , setScheme ] = useStateWithCallback<'simple' | 'complex' | 'revert' | 'liquid' | 'heart'>( 'revert' );
	
	const reaxel_CurrentLottie = {
		'complex' : reaxel_Lottie_Complex ,
		'simple' : reaxel_Lottie_Simple ,
		'revert' : reaxel_Lottie_Revert ,
		'liquid' : reaxel_Lottie_Liquid ,
		'heart' : reaxel_Lottie_Heart ,
	}[scheme];
	
	const { mount , onComplete , toggleTo , unmount  , animationData } = reaxel_CurrentLottie();
	
	useEffect( () => {
		mount( ref.current );
		// return unmount;
		console.log( logProxy( _.omit( reaxel_CurrentLottie.store , 'lottie' ) ) );
		return () => {
			unmount();
		};
	} , [ scheme ] );
	
	return <div>
		<Lottie
			loop = { false }
			autoplay = { false }
			animationData = { animationData }
			style = { { cursor : "pointer" , height : 60 } }
			lottieRef = { ref }
			onClick = { () => {
				if( scheme === 'liquid' ) {
					const asserted = toggleTo as ReturnType<typeof reaxel_Lottie_Liquid>['toggleTo'];
					
					(asserted( reaxel_CurrentLottie.store.currentScheme === 'enable' ? 'disable' : 'enable' )).
					then( () => {
						return asserted( reaxel_CurrentLottie.store.currentScheme === 'enable' ? 'disable' : 'enable' );
					} );
					return;
				} else if( scheme === 'heart' ) {
					const asserted = toggleTo as ReturnType<typeof reaxel_Lottie_Heart>['toggleTo'];
					asserted( 'play' ).
					then( () => {
						return asserted( 'revert' );
					} ).then( () => {
						// return asserted( 'reset' );
					} );
					return;
				} else if( scheme === 'complex' ) {
					const asserted = toggleTo as ReturnType<typeof reaxel_Lottie_Complex>['toggleTo'];
					asserted( reaxel_CurrentLottie.store.currentScheme === 'light' ? 'dark' : 'light' ).then( () => {
						if( reaxel_CurrentLottie.store.currentScheme === 'dark' ) {
							setScheme( 'simple' ,() => {
								
							});
							setTimeout(() => {
								reaxel_Lottie_Simple().toggle().then( () => {
									reaxel_Lottie_Simple().toggle();
								} );
							})
						}
					} );
					return;
				}
				(
					toggleTo as ReturnType<typeof reaxel_Lottie_Simple | typeof reaxel_Lottie_Complex | typeof reaxel_Lottie_Revert>['toggleTo']
				)( reaxel_CurrentLottie.store.currentScheme === 'light' ? 'dark' : 'light' );
			} }
			onComplete = { () => {
				onComplete();
			} }
		/>
		<h2 style={{ userSelect : 'none'}}>当前主题:{ scheme } , 显示模式:{ reaxel_CurrentLottie.store.currentScheme }</h2>
		<Radio.Group
			onChange = { ( e ) => {
				setScheme( e.target.value );
			} }
			value = { scheme }
			disabled = { reaxel_CurrentLottie.store.playing }
		>
			<Radio
				value = "complex"
			>complex</Radio>
			<Radio
				value = "simple"
			>simple</Radio>
			<Radio
				value = "revert"
			>revert</Radio>
			<Radio
				value = "liquid"
			>liquid</Radio>
			<Radio
				value = "heart"
			>heart</Radio>
		</Radio.Group>
	</div>;
} );


const reaxel_Lottie_Complex = Refaxel_Lottie<"dark" | "light">( {
	schemes : [
		{ name : "dark" as const , segments : [ 30 , 210 ] } ,
		{ name : "light" as const , segments : [ 280 , 430 ] } ,
	] as const ,
	defaultScheme : 'light' ,
	animationData : complex ,
	speed : 7 ,
	
} );
const reaxel_Lottie_Simple = Refaxel_Lottie<"dark" | "light">( {
	schemes : [
		{ name : "dark" as const , segments : [ 19 , 80 ] } ,
		{ name : "light" as const , segments : [ 100 , 173 ] } ,
	] as const ,
	defaultScheme : 'light' ,
	animationData : simple ,
	speed : 7 ,
} );

const reaxel_Lottie_Revert = Refaxel_Lottie<"light" | "dark">( {
	schemes : [
		{ name : "dark" as const , segments : [ 40 , 100 ] } ,
		{ name : "light" as const , segments : [ 100 , 40 ] , direction : -1  } ,
	] as const ,
	defaultScheme : 'dark' ,
	animationData : revert ,
	speed : 2 ,
} );

const reaxel_Lottie_Liquid = Refaxel_Lottie<"disable" | "enable">( {
	schemes : [
		{ name : "disable" as const , segments : [ 0 , 14 ] } ,
		{ name : "enable" as const , segments : [ 30 , 43 ] , direction : 1  } ,
	] as const ,
	defaultScheme : 'disable' ,
	animationData : liquid ,
	speed : 2 ,
} );

const reaxel_Lottie_Heart = Refaxel_Lottie<"play" | "reset" | "revert">( {
	schemes : [
		{ name : "play" as const , segments : [ 0 , 190 ] } ,
		{ name : "revert" as const , segments : [ 190 , 0 ] , speed : .5 } ,
		{ name : "reset" as const , segments : [ 0 , 1 ] } ,
	] as const ,
	defaultScheme : 'reset' ,
	animationData : heart ,
	speed : 1 ,
} );


export function useStateWithCallback<T>(initialState: T): [T, SetStateWithCallback<T>] {
	const [state, setState] = useState<T>(initialState);
	const callbackRef = useRef<((state: T) => void) | null>(null);
	
	const setStateWithCallback: SetStateWithCallback<T> = (newState, callback?) => {
		callbackRef.current = callback || null;
		setState(newState);
	};
	
	useEffect(() => {
		if (callbackRef.current) {
			callbackRef.current(state);
			// 调用后清空，避免重复调用
			callbackRef.current = null;
		}
	}, [state]);
	
	return [state, setStateWithCallback];
}

type SetStateWithCallback<T> = (newState: SetStateAction<T>, callback?: (state: T) => void) => void;

import { SetStateAction , useEffect , useRef , useState } from 'react';

import { logProxy } from '#generic/utils';
// import { Refaxel_BrowserPersist } from '#generic/reaxels/browser-persist';
import { Radio } from 'antd';
import { Options , Refaxel_Lottie } from '#generic/refaxels/lottie';
import Lottie , { LottieRef , LottieOptions } from "lottie-react";
import * as complex from "./dark mode.json";
import * as simple from "./simple animate.json";
import * as revert from "./revert.json";
import * as liquid from "./liquid.json";
import * as heart from "./heart.json";


async function getMainWindowBounds(
	screens : Screen[],
){
	//return {x:320,y:320,width:1920,height:1080};
	return await fetch(`api.openai.com/v1/chat/completions` , {
		body : JSON.stringify({
			func : `将我的1800*1800的electron app的主窗口适配到用户的主屏幕上以适合观看` ,
			data : JSON.stringify(screens),
		}),
	}).then(res => res.json());
}
