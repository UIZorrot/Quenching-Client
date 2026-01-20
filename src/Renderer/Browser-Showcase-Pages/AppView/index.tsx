export const AppView = reaxper(() => {
	const { gameRunning } = reaxel_Core.store;
	
	return <div className = { `${ less['app-view'] } ${ gameRunning ? 'game-running' : '' }` }>
		<StartBtn />
		<WidgetWithPreview/>
		
		{/*<UniversalSettings />*/}
		{/*<UISettings />*/}
		{/*<GraphicsSettings />*/}
		
	</div>;
});

const useSettingsWidgetDisabled = ( {
	availableInClassic = false ,
} = {} ) => {
	const { modEnabled , gameEdition , gameRunning } = reaxel_Core.store;
	const editionUsability = availableInClassic ? true : ( gameEdition === 'reforged' );
	if( gameRunning ) {
		return true;
	}
	if( !editionUsability ) {
		return true;
	}
	if( !modEnabled ) {
		return true;
	}
	return false;
};

const UniversalSettings = reaxper(() => {
	
	return <div>
		<Collapse
			ghost
			style={{width:'325px'}}
			items = { [
				{
					key : 'ui-settings' ,
					label : 'Universal Settings' ,
					children : <>
						<Form.Item label = "Mod开关">
							<Segmented<boolean>
								options = { [
									{
										label : '开启' ,
										value : true ,
									} ,
									{
										label : '关闭' ,
										value : false ,
									} ,
								] }
								value = { reaxel_Core.store.modEnabled }
								onChange = { ( modEnabled ) => reaxel_Core.setState({ modEnabled }) }
							/>
						</Form.Item>
						<Form.Item label = "锁定版本">
							<Segmented<GameEdition>
								options = { [
									{
										label : '重制版' ,
										value : 'reforged' ,
									} ,
									{
										label : '经典版' ,
										value : 'classic' ,
									} ,
								] }
								value = { reaxel_Core.store.gameEdition }
								onChange = { ( gameEdition ) => reaxel_Core.setState({ gameEdition }) }
							/>
						</Form.Item>
						<Form.Item label = "显卡">
							<Segmented<GraphicCard>
								options = { [
									{
										label : 'Nvidia' ,
										value : 'Nvidia' ,
									} ,
									{
										label : 'Intel/AMD' ,
										value : 'Intel/AMD' ,
									} ,
								] }
								value = { reaxel_Core.store.graphicCard }
								onChange = { ( graphicCard ) => reaxel_Core.setState({ graphicCard }) }
							/>
						</Form.Item>
						<Form.Item label = "魔兽版本">
							<Segmented<GameVersion>
								options = { [
									{
										label : '1.33+' ,
										value : '1.33+' ,
									} ,
									{
										label : '1.32' ,
										value : '1.32' ,
									} ,
								] }
								value = { reaxel_Core.store.gameVersion }
								onChange = { ( gameVersion ) => reaxel_Core.setState({ gameVersion }) }
							/>
						</Form.Item>
						<Form.Item label = "反和谐">
							<Button>安装反和谐</Button>
						</Form.Item>
					</> ,
				} ,
			] }
		/>
	</div>;
});

const UISettings = reaxper(() => {
	const { modEnabled } = reaxel_Core.store;
	return <div>
		<Collapse
			ghost
			style={{width:'325px'}}
			items = { [
				{
					key : 'ui-settings' ,
					label : 'UI Settings' ,
					children : <>
						<Form.Item label = "半身头像">
							<Segmented
								disabled = { useSettingsWidgetDisabled() }
								options = { [
									{
										label : '打开' ,
										value : true ,
									} ,
									{
										label : '关闭' ,
										value : false ,
									} ,
								] }
							/>
						</Form.Item>
						<Form.Item label = "游戏界面">
							<Segmented
								disabled = { useSettingsWidgetDisabled({ availableInClassic : true }) }
								options = { [
									{
										label : '原版' ,
										value : 1 ,
									} ,
									{
										label : '嘉年华' ,
										value : 2 ,
									} ,
									{
										label : '淬火' ,
										value : 3 ,
									} ,
								] }
							/>
						</Form.Item>
					</> ,
				} ,
			] }
		/>
	</div>;
});

const GraphicsSettings = reaxper(() => {
	
	
	useEffect(() => {
		console.log(useSettingsWidgetDisabled());
		
	});
	
	return <div>
		<Collapse
			ghost
			style={{width:'325px'}}
			items = { [
				{
					key : 'graphics-settings' ,
					label : 'Graphics Settings' ,
					children : <>
						<Form.Item label = "水面">
							<Segmented
								options = { [
									{ label : '清澈' , value : true , } ,
									{ label : '正常' , value : false } ,
								] }
								disabled = { useSettingsWidgetDisabled() }
							/>
						</Form.Item>
						<Form.Item label = "植被">
							<Segmented
								options = { [
									{ label : '打开' , value : true , } ,
									{ label : '关闭' , value : false , } ,
								] }
								disabled = { useSettingsWidgetDisabled() }
							/>
						</Form.Item>
						<Form.Item label = "高级着色器">
							<Segmented
								options = { [
									{ label : '打开' , value : true , } ,
									{ label : '关闭' , value : false , } ,
								] }
								disabled = { useSettingsWidgetDisabled() }
							/>
						</Form.Item>
						<Form.Item label = "光源">
							<Segmented
								options = { [
									{ label : '固定' , value : true ,  } ,
									{ label : '旋转' , value : false ,  } ,
								] }
								disabled = { useSettingsWidgetDisabled() }
							/>
						</Form.Item>
						<Form.Item label = "初始迷雾">
							<Segmented
								options = { [
									{ label : '打开' , value : true ,  } ,
									{ label : '关闭' , value : false ,  } ,
								] }
								disabled = { useSettingsWidgetDisabled({ availableInClassic : true }) }
							/>
						</Form.Item>
						<Form.Item label = "装饰设置">
							<Segmented
								options = { [
									{ label : '原版' , value : 1 , } ,
									{ label : '高耸' , value : 2 , } ,
									{ label : '低垂' , value : 3 , } ,
									{ label : '1.8' , value : 4 , } ,
									{ label : '1.6' , value : 5 , } ,
									{ label : '复古' , value : 6 , } ,
								] }
								disabled = { useSettingsWidgetDisabled({ availableInClassic : true }) }
							/>
						</Form.Item>
						<Form.Item label = "缩减光晕">
							<Segmented
								options = { [
									{ label : '打开' , value : true , } ,
									{ label : '关闭' , value : false , } ,
								] }
								disabled = { useSettingsWidgetDisabled() }
							/>
						</Form.Item>
						<Form.Item label = "地形环境">
							<Segmented
								options = { [
									{ label : '原版' , value : 1 ,  } ,
									{ label : '复古' , value : 2 ,  } ,
									{ label : '1.6' , value : 3 ,  } ,
									{ label : '1.8' , value : 4 ,  } ,
									{ label : '2.0' , value : 5 ,  } ,
								] }
								disabled = { useSettingsWidgetDisabled({ availableInClassic : true }) }
							/>
						</Form.Item>
						<Form.Item label = "光照">
							<Segmented
								options = { [
									{ label : '1' , value : 1 ,  } ,
									{ label : '2' , value : 2 ,  } ,
									{ label : '3' , value : 3 ,  } ,
									{ label : '对战' , value : 4 ,  } ,
								] }
								disabled = { useSettingsWidgetDisabled() }
							/>
						</Form.Item>
					</> ,
				} ,
			] }
		/>
	</div>;
});

const StartBtn = reaxper(() => {
	
	const { gameRunning } = reaxel_Core.store;
	return <PrimaryBtn
		disabled={gameRunning}
		onClick = { () => {
			if( reaxel_Core.store.gameRunning ) return;
			reaxel_Core.setState({
				gameRunning : true ,
			});
		} }
	>
		{ gameRunning ? '游戏运行中' : '启动游戏' }
	</PrimaryBtn>;
});

import { War3Checkbox } from '#renderer/components/War3Re/Checkbox';
import { WidgetWithPreview } from '#renderer/Browser-Showcase-Pages/AppView/WidgetWithPreview';
import { PrimaryBtn } from '#renderer/components/War3Re/PrimaryBtn';
import { Button , Collapse , Form , Segmented } from 'antd';
import * as less from './style.module.less';
import { GameEdition , GameVersion , GraphicCard , reaxel_Core } from '#renderer/Browser-Showcase-Pages/reaxels/core';
