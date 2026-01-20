export const DarkModeSwitchLottie = reaxper( () => {
	const ref: LottieRef = useRef();
	
	const { mount , onComplete , toggleTo , unmount , animationData } = reaxel_Theme.reaxel_Lottie();
	const { theme } = reaxel_Theme();
	
	useEffect( () => {
		mount( ref.current );
		return () => {
			unmount();
		};
	} , [] );
	
	return <Lottie
		loop = { false }
		autoplay = { false }
		animationData = { animationData }
		style = { { 
			cursor : "pointer" ,
			height : 34 ,
			position : 'absolute',
			left : 10,
			top : 10
	} }
		lottieRef = { ref }
		onClick = { () => {
			toggleTo( theme === 'light' ? 'dark' : 'light' );
		} }
		onComplete = { () => {
			onComplete();
		} }
	/>;
} );


import { reaxel_Theme } from '#renderer/reaxels/theme';
import { Radio } from 'antd';
import Lottie , { LottieRef , LottieOptions } from "lottie-react";
import * as complex from "./dark mode.json";
