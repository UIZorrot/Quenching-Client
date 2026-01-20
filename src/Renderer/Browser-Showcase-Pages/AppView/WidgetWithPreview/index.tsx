const { store , setState } = createReaxable({
	open : true ,
	selectedKey : '1' ,
	mouseOverKey : null ,
	
	shadowEnabled : true ,
	
	edition : 0 as 0 | 1 ,
	
	quenchingCollapseActiveKey : 'UI',
});


export const WidgetWithPreview = reaxper(() => {
	
	
	const { gameRunning } = reaxel_Core.store;
	const { 
		gameEditionToggleDisabled,
		gameVersionToggleDisabled,
		modToggleDisabled,
	} = reaxel_Core();
	
	const previewImg = items.find(i => i.key === store.mouseOverKey)?.img ?? null;
	
	return <>
		<DiffPreviewWindow imgUrl = { previewImg } />
		<OptionsLabel
			label = "植被"
		>
			<War3Dropdown
				width = "120px"
				menu = { {
					expandIcon : <img src = { dropdownArrow } /> ,
					items : items.map(( itm ) => Object.assign(itm , {
						onMouseEnter( { key } , e ){
							setState({ mouseOverKey : key });
						} ,
						onMouseLeave(){
							setState({ mouseOverKey : null });
						} ,
					})) ,
					onClick( { key } ){
						setState({ selectedKey : key });
					} ,
				} }
				value = { items.find(i => i.key === store.selectedKey)?.label }
			/>
		</OptionsLabel>
		
		<Collapse
			activeKey = { store.quenchingCollapseActiveKey }
			onChange = { ( key ) => setState({ quenchingCollapseActiveKey : key }) }
			items = { [
				{
					key : 'universal' ,
					label : 'Universal Settings' ,
					children : <>
						<Form.Item>
							<Toggle
								tooltip = { modToggleDisabled.reason }
								value = { reaxel_Core.store.modEnabled ? 1 : 0 }
								onChange = { ( value ) => reaxel_Core.setState({ modEnabled : value === 1 }) }
								labels = { [ '关闭Mod' , '开启Mod' ] }
								size = "large"
								disabled = { modToggleDisabled.disabled }
								style = { { margin : '0 auto' } }
							/>
						</Form.Item>
						<SettingItem
							label = "锁定版本："
						>
							<Toggle
								tooltip = { gameEditionToggleDisabled.reason }
								value = { reaxel_Core.store.gameEdition === 'reforged' ? 1 : 0 }
								onChange = { ( value ) => reaxel_Core.setState({ gameEdition : value ? 'reforged' : 'classic' }) }
								labels = { [ '经典版' , '重制版' ] }
								size = "small"
								disabled = { gameEditionToggleDisabled.disabled }
							/>
						</SettingItem>
						<SettingItem
							label = "魔兽版本："
						>
							<War3Dropdown
								width = "120px"
								size = "small"
								menu = { {
									expandIcon : <img src = { dropdownArrow } /> ,
									items : [
										{
											label : '1.33+' ,
											key : '1.33+' ,
										},
										{
											label : '1.32' ,
											key : '1.32' ,
										},
									] ,
									onClick( { key } ){
										reaxel_Core.setState({gameVersion : key as any})
									} ,
								} }
								value = { reaxel_Core.store.gameVersion }
								disabled={gameVersionToggleDisabled.disabled}
								tooltip={gameVersionToggleDisabled.reason}
							/>
						</SettingItem>
						
						<SettingItem label = "反和谐：">
							<PrimaryBtn
								tooltip={reaxel_Core.store.enableGore && '反和谐已启用' || null}
								size="small"
								style={{marginLeft : '29px'}}
								disabled={reaxel_Core.store.enableGore}
								onClick={() => reaxel_Core.mutate(s => s.enableGore = !s.enableGore)}
							>{ reaxel_Core.store.enableGore ? '已安装' : '安装反和谐' }</PrimaryBtn>
						</SettingItem>
					</> ,
					
				} ,
				{
					key : 'UI' ,
					label : 'UI Settings' ,
					children : <>
						<SettingItem label="游戏界面：">
							<War3Dropdown
								width = "120px"
								size = "small"
								menu = { {
									expandIcon : <img src = { dropdownArrow } /> ,
									items : [
										{
											label : 'Original' ,
											key : 'original' ,
										},
										{
											label : 'Carnival' ,
											key : 'carnival' ,
										},
										{
											label : 'Quenching' ,
											key : 'quenching' ,
										},
									] ,
									onClick( { key } ){
										reaxel_UISettings.setState({UIScheme : key as any});
									} ,
								} }
								value = { reaxel_UISettings.store.UIScheme }
								disabled={gameVersionToggleDisabled.disabled}
								tooltip={gameVersionToggleDisabled.reason}
							/>
						</SettingItem>
						<Divider/>
						<War3Checkbox
							checked = { reaxel_UISettings.store.bustPortrait }
							onChange = { ( checked ) => {
								reaxel_UISettings.setState({ bustPortrait : checked });
							} }
						>
							半身头像
						</War3Checkbox>
					</> ,
				} ,
			] }
			style = { { width : '600px' } }
		/>
	</>;
	
	return (
		<div className = { less['widget-with-preview'] }>
			<div className = { less['left-panel'] }>
				<War3Checkbox
					checked = { true }
					onChange = { ( checked ) => {
						
					} }
				>Waersd</War3Checkbox>
				<War3Dropdown
					width = "120px"
					menu = { {
						items : [
							{ key : '1' , label : '选项1' } ,
							{ key : '2' , label : '选项2' } ,
						] ,
					} }
					value = { '选项1' }
				/>
			</div>
			<div className = { less['right-panel'] }>
				<DiffPreviewWindow imgUrl = { '' } />
			</div>
		</div>
	);
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

const items: ( ItemType & { label: string; img: string } )[] = [
	{
		key : '1' ,
		label : '原版' ,
		img : btnacolyte ,
	} ,
	{
		key : '2' ,
		label : '高耸' ,
		img : btnherodemonhunter ,
	} ,
	{
		key : '3' ,
		label : '低垂' ,
		img : btnsorceress ,
	} ,
	{
		key : '4' ,
		label : '1.8' ,
		img : btnwyvernrider ,
	} ,
	{
		key : '5' ,
		label : '1.6' ,
		img : p01 ,
	} ,
	{
		key : '6' ,
		label : '复古' ,
		img : p12 ,
	} ,
];

import { reaxel_UISettings } from '#renderer/Browser-Showcase-Pages/reaxels/UI-settings';
import { reaxel_Core } from '#renderer/Browser-Showcase-Pages/reaxels/core';

import { PrimaryBtn } from '#renderer/components/War3Re/PrimaryBtn';
import { SettingItem } from '#renderer/components/War3Re/SettingItem';
import { Form , Segmented , Divider } from 'antd';
import { Collapse } from '#renderer/components/War3Re/Collapse';
import { Toggle } from '#renderer/components/War3Re/Toggle';
import { DiffPreviewWindow } from '#renderer/components/War3Re/Diff-Preview-Window';
import { War3Dropdown } from '#renderer/components/War3Re/Dropdown';
import { War3Checkbox } from '#renderer/components/War3Re/Checkbox';
import { ItemType } from 'antd/lib/menu/interface';
import * as less from './style/index.module.less';

import dropdownArrow from '#renderer/components/War3Re/Dropdown/assets/chevron-up-icon-resting.png';
import { OptionsLabel } from '#renderer/components/War3Re/Options-Label';
import btnacolyte from '#renderer/components/War3Re/Diff-Preview-Window/assets/dev-test/btnacolyte.png';
import btnherodemonhunter from '#renderer/components/War3Re/Diff-Preview-Window/assets/dev-test/btnherodemonhunter.png';
import btnsorceress from '#renderer/components/War3Re/Diff-Preview-Window/assets/dev-test/btnsorceress.png';
import btnwyvernrider from '#renderer/components/War3Re/Diff-Preview-Window/assets/dev-test/btnwyvernrider.png';
import p01 from '#renderer/components/War3Re/Diff-Preview-Window/assets/dev-test/p01.png';
import p12 from '#renderer/components/War3Re/Diff-Preview-Window/assets/dev-test/p12.png';
