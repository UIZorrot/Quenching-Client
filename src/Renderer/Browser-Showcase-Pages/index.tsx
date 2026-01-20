export const BrowserShowcasePages = reaxper(() => {
	const { gameRunning } = reaxel_Core.store;
	
	const className = `${gameRunning ? 'game-running ' : ''}${less['showcase']}`;
	return <div style={{
		width : '100%',
		height:'100%',
		overflow : 'auto'
	}}>
		<div className={className}>
			<AppView/>
			<Divider type="vertical" className={gameRunning ? 'game-running' : ''}/>
			<GameView/>
		</div>
	</div>
})

import * as less from './style.module.less';
import { reaxel_Core } from './reaxels/core';
import { GameView } from './GameView';
import { AppView } from './AppView';
import { Divider } from 'antd';
