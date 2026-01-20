/**
 * 创建一个便于使用lottie的reaxel ,
 */
export const Refaxel_Lottie = <SchemeNames extends string>( initOptions: Options<SchemeNames> ) => {
	return reaxel( () => {
		const { store , setState , mutate } = createReaxable({
			currentScheme : null as SchemeNames ,
			playing : false ,
			lottie : null ,
			toggling : null as SchemeNames ,
			sleeping : false ,
		});
		let lottiePromise = xPromise<LottieRef['current']>();
		
		obsReaction( () => {
			if( store.lottie ) {
				lottiePromise.resolve( store.lottie );
			}
		} , () => [ store.lottie ] );
		
		let togglePromise : XPromise<null> & {playing? : SchemeNames};
		
		let sleepTimeoutID = null;
		let sleepingPromise : XPromise;
		
		/**
		 * @property ret.sleep 让动画保持当前状态休眠,期间调用toggleTo无效, 直至休眠时间结束
		 */
		let rtn = {
			animationData : initOptions.animationData ,
			initialTogge( name: SchemeNames ){
				lottiePromise.then(( lottie ) => {
					const scheme = initOptions.schemes.find(s => s.name === name);
					let segment = scheme.segments[( scheme.direction === -1 ) ? 0 : 1];
					lottie.goToAndStop(segment , true);
					setState({ currentScheme : name });
				});
			} ,
			mount( lottie: LottieRef['current'] ){
				setState({ lottie });
				rtn.initialTogge(store.currentScheme ?? initOptions.defaultScheme);
			} ,
			/**
			 * 自动切换下一个动画
			 */
			toggle(){
				if( store.playing ) return togglePromise;
				if( store.sleeping ) return sleepingPromise;
				const { schemes } = initOptions;
				const currentScheme = schemes.find(s => s.name === store.currentScheme);
				const nextScheme = schemes[( schemes.indexOf(currentScheme) + 1 ) % schemes.length];
				setState({ playing : true , toggling : nextScheme.name });
				togglePromise = xPromise();
				togglePromise.playing = nextScheme.name;
				lottiePromise.then(( lottie ) => {
					if( nextScheme.speed ) {
						lottie.setSpeed(nextScheme.speed);
					} else if( initOptions.speed ) {
						lottie.setSpeed(initOptions.speed);
					} else {
						lottie.setSpeed(1);
					}
					if( nextScheme.direction ) {
						lottie.setDirection(nextScheme.direction);
					} else {
						lottie.setDirection(1);
					}
					lottie.playSegments(nextScheme.segments , true);
				});
				return togglePromise;
			} ,
			/**
			 * 切换至指定的动画片段
			 */
			toggleTo( name: SchemeNames ){
				if( store.playing ) return togglePromise;
				if( store.sleeping ) return sleepingPromise;
				setState({ playing : true , toggling : name });
				togglePromise = xPromise();
				togglePromise.playing = name;
				lottiePromise.then(( lottie ) => {
					const scheme = initOptions.schemes.find(s => s.name === name);
					if( scheme.speed ) {
						lottie.setSpeed(scheme.speed);
					} else if( initOptions.speed ) {
						lottie.setSpeed(initOptions.speed);
					} else {
						lottie.setSpeed(1);
					}
					if( scheme.direction ) {
						lottie.setDirection(scheme.direction);
					} else {
						lottie.setDirection(1);
					}
					lottie.playSegments(scheme.segments , true);
					console.log('将要变化为:' , name , initOptions.schemes.find(s => s.name === name).segments);
				});
				return togglePromise as XPromise<SchemeNames>;
			} ,
			onComplete(){
				// console.log('completed' , {
				// 	prevScheme : store.currentScheme,
				// });
				const toggling = store.toggling;
				setState({
					currentScheme : toggling ,
					playing : false ,
					toggling : null,
				});
				if( toggling === togglePromise.playing ) {
					togglePromise.resolve(null);
				}
			} ,
			sleep( timeout: number ){
				if( store.sleeping ) throw new Error('当前lottie正在sleep,请在sleep的promise后再调用sleep');
				setState({ sleeping : true });
				crayon.orange('睡眠中...');
				sleepingPromise = xPromise();
				sleepTimeoutID = setTimeout(() => {
					sleepingPromise.resolve(null);
					crayon.green('睡醒了');
					setState({ sleeping : false });
				} , timeout);
				return sleepingPromise;
			} ,
			unmount(){
				setState({ lottie : null , toggling : null , playing : false });
				lottiePromise.then(( lottie ) => {
					// lottie.destroy();
				});
				lottiePromise = xPromise();
			} ,
		};
		
		return Object.assign(() => rtn , {
			store ,
			setState ,
			mutate ,
		});
	} );
};

export type Options<SchemeNames extends string> = {
	animationData: any,
	schemes: ReadonlyArray<{
		name: SchemeNames,
		segments: [ number , number ],
		//静止状态的片段帧
		// staticSegment : number,
		direction? : AnimationDirection,
		speed? : number,
	}>,
	defaultScheme: SchemeNames,
	speed? : number,
};

import { reaxel , obsReaction , createReaxable } from 'reaxes';
import type { LottieRef , LottieOptions } from 'lottie-react';
import { AnimationDirection } from 'lottie-web';
import {xPromise, XPromise } from 'reaxes-utils';
import { crayon } from 'reaxes-utils';
