import React, { useState, useMemo } from 'react';
import { Card, Typography, Button, Space, Row, Col, Image, message, Switch } from 'antd';
import { useTranslation } from '../../utils/i18n';
import { OverlayModal } from './OverlayModal';
import { SKIN_CONFIG, HeroSkinConfig, CUSTOM_SKIN_CONFIG, UnitSkinChange } from '../../assets/data/skin-config';

/** Group flat warband rows into skin:apply-batch payload */
function buildBatchChangesFromWarbandConfig(config: UnitSkinChange[]) {
    const groupedChanges: Record<string, { field: string; value: string }[]> = {};
    config.forEach((c) => {
        if (!groupedChanges[c.unitId]) {
            groupedChanges[c.unitId] = [];
        }
        groupedChanges[c.unitId].push({ field: c.field, value: c.value });
    });
    return Object.keys(groupedChanges).map((unitId) => ({
        unitId,
        changes: groupedChanges[unitId],
    }));
}
import { useSound } from '../../hooks/useSound';
import { useWar3Settings } from '../../hooks/useWar3Settings';
import { useWar3Detector } from '../../hooks/useWar3Detector';

const { Text } = Typography;

function heroSkinKey(raceId: string, heroId: string): string {
    return `${raceId}:${heroId}`;
}

interface SkinModalProps {
    open: boolean;
    onClose: () => void;
    isFullPackageInstalled?: boolean;
}

export const SkinModal: React.FC<SkinModalProps> = ({ open, onClose, isFullPackageInstalled = false }) => {
    const { t } = useTranslation();
    const { playSmall, playHover } = useSound();
    const { modSettings } = useWar3Settings();
    const { currentInstallation } = useWar3Detector();
    const isClassicMode = modSettings?.classicMode || false;
    const war3Path = currentInstallation?.path || '';
    const [selectedRace, setSelectedRace] = useState<string>('hum');
    const [selectedCategory, setSelectedCategory] = useState<string>('hero');
    const [selectedHeroId, setSelectedHeroId] = useState<string>('');
    const [heroSkinByKey, setHeroSkinByKey] = useState<Record<string, string>>({});
    const [warbandSkinByRace, setWarbandSkinByRace] = useState<Record<string, string>>({});
    const [selectedCustomUnitId, setSelectedCustomUnitId] = useState<string>('');
    const [customSkins, setCustomSkins] = useState<Record<string, string>>({});
    const [skinEnabled, setSkinEnabled] = useState(true);
    const [retroUnitsEnabled, setRetroUnitsEnabled] = useState(false);
    const [retroBuildingsEnabled, setRetroBuildingsEnabled] = useState(false);
    const [retroUnitsDirName, setRetroUnitsDirName] = useState<string | null>(null);
    const [retroBuildingsDirName, setRetroBuildingsDirName] = useState<string | null>(null);
    const [retroApplying, setRetroApplying] = useState(false);

    const isRetroTab = selectedCategory === 'retro';
    const isRetroActive = retroUnitsEnabled || retroBuildingsEnabled;
    const panelDisabled = !skinEnabled;

    React.useEffect(() => {
        if (!open) return;
        window.electronAPI?.isSkinEnabled?.()
            .then((enabled) => setSkinEnabled(enabled !== false))
            .catch(() => setSkinEnabled(true));

        window.electronAPI?.getRetroSkinStatus?.()
            .then((status) => {
                if (!status) return;
                setRetroUnitsEnabled(isFullPackageInstalled && status.unitsEnabled);
                setRetroBuildingsEnabled(isFullPackageInstalled && status.buildingsEnabled);
                setRetroUnitsDirName(status.unitsDirName);
                setRetroBuildingsDirName(status.buildingsDirName);
                if (isFullPackageInstalled && (status.unitsEnabled || status.buildingsEnabled)) {
                    setSelectedCategory('retro');
                } else {
                    setSelectedCategory('hero');
                }
            })
            .catch(() => {});
    }, [open, war3Path, isFullPackageInstalled]);

    // 种族数据
    const races = [
        { id: 'hum', name: t('skin.race.hum'), icon: './assets/quenching/human-icon-pressed.png' },
        { id: 'orc', name: t('skin.race.orc'), icon: './assets/quenching/orc-icon-pressed.png' },
        { id: 'ud', name: t('skin.race.ud'), icon: './assets/quenching/undead-icon-pressed.png' },
        { id: 'ne', name: t('skin.race.ne'), icon: './assets/quenching/nightelf-icon-pressed.png' },
        { id: 'neutral', name: t('skin.race.neutral'), icon: './assets/quenching/logo.png' }
    ];

    // 获取当前种族的英雄列表
    const currentHeroes = useMemo(() => {
        const raceConfig = SKIN_CONFIG[selectedRace];
        return raceConfig ? raceConfig.heroes : [];
    }, [selectedRace]);

    // 获取当前种族的战团列表
    const currentWarbands = useMemo(() => {
        const raceConfig = SKIN_CONFIG[selectedRace];
        return raceConfig ? raceConfig.warbands || [] : [];
    }, [selectedRace]);

    // 当种族或类别改变时，重置选择
    React.useEffect(() => {
        if (selectedCategory === 'hero') {
            if (currentHeroes.length > 0) {
                if (!currentHeroes.find(h => h.id === selectedHeroId)) {
                    setSelectedHeroId(currentHeroes[0].id);
                }
            }
        } else {
            if (selectedHeroId !== 'custom') {
                setSelectedHeroId('warband');
            }

            if (selectedHeroId === 'warband' && currentWarbands.length > 0) {
                const saved = warbandSkinByRace[selectedRace];
                if (!saved || !currentWarbands.find(w => w.id === saved)) {
                    const defaultWarband = currentWarbands.find(w => w.id.endsWith('_u1')) || currentWarbands[0];
                    if (defaultWarband) {
                        setWarbandSkinByRace(prev => ({ ...prev, [selectedRace]: defaultWarband.id }));
                    }
                }
            } else if (selectedHeroId === 'custom') {
                const raceUnits = CUSTOM_SKIN_CONFIG[selectedRace]?.units || [];
                if (selectedCustomUnitId && !raceUnits.find(u => u.unitId === selectedCustomUnitId)) {
                    setSelectedCustomUnitId('');
                }
            }
        }
    }, [selectedRace, selectedCategory, currentHeroes, currentWarbands, selectedHeroId, selectedCustomUnitId, warbandSkinByRace]);

    // 获取当前选中的英雄数据
    const currentHero = useMemo(() => {
        return currentHeroes.find(h => h.id === selectedHeroId);
    }, [currentHeroes, selectedHeroId]);

    // Calculate available skins based on restrictions
    const availableSkins = useMemo(() => {
        if (!currentHero) return [];
        let skins = currentHero.skins;

        if (isClassicMode) {
            skins = skins.slice(0, 2);
        }

        if (!isFullPackageInstalled) {
            skins = skins.filter(skin =>
                !skin.config.some(c => typeof c.value === 'string' && c.value.toLowerCase().includes('cos'))
            );
        }

        return skins;
    }, [currentHero, isClassicMode, isFullPackageInstalled]);

    const activeHeroSkinId = useMemo(() => {
        if (!currentHero || availableSkins.length === 0) return '';
        const saved = heroSkinByKey[heroSkinKey(selectedRace, selectedHeroId)];
        if (saved && availableSkins.some(s => s.id === saved)) {
            return saved;
        }
        return availableSkins[0].id;
    }, [heroSkinByKey, selectedRace, selectedHeroId, availableSkins, currentHero]);

    const activeWarbandSkinId = useMemo(() => {
        if (currentWarbands.length === 0) return '';
        const saved = warbandSkinByRace[selectedRace];
        if (saved && currentWarbands.some(w => w.id === saved)) {
            return saved;
        }
        const defaultWarband = currentWarbands.find(w => w.id.endsWith('_u1')) || currentWarbands[0];
        return defaultWarband?.id || '';
    }, [warbandSkinByRace, selectedRace, currentWarbands]);

    // 获取当前选中的战团数据
    const currentWarband = useMemo(() => {
        return currentWarbands.find(w => w.id === activeWarbandSkinId);
    }, [currentWarbands, activeWarbandSkinId]);

    React.useEffect(() => {
        if (selectedCategory === 'unit') {
            if (isClassicMode || !isFullPackageInstalled) {
                setSelectedCategory('hero');
            }
        }
    }, [isClassicMode, isFullPackageInstalled, selectedCategory]);

    React.useEffect(() => {
        if (!open || selectedCategory !== 'hero' || selectedHeroId) return;
        if (currentHeroes.length > 0) {
            setSelectedHeroId(currentHeroes[0].id);
        }
    }, [open, selectedCategory, selectedHeroId, currentHeroes]);

    const handleSelectModel = async (unitId: string) => {
        try {
            const filePath = await (window as any).electronAPI.selectModelFile();
            if (filePath) {
                setCustomSkins(prev => ({ ...prev, [unitId]: filePath }));
                setSelectedCustomUnitId(unitId);
                // 选择模型后立即应用，传入 filePath 避免状态更新延迟导致的问题
                await handleApplySkin('custom', unitId, filePath);
            }
        } catch (error) {
            console.error('Failed to select model file:', error);
            message.error(t('skin.model.select.fail'));
        }
    };

    const handleToggleSkins = async () => {
        if (!war3Path) {
            message.error('War3 path not detected');
            return;
        }
        message.loading({ content: t('skin.applying'), key: 'applySkin' });
        try {
            if (skinEnabled) {
                await window.electronAPI?.disableSkins?.();
                setSkinEnabled(false);
                setHeroSkinByKey({});
                setWarbandSkinByRace({});
                setSelectedCustomUnitId('');
                message.success({ content: t('skin.disable.success'), key: 'applySkin' });
            } else {
                await window.electronAPI?.enableSkins?.();
                setSkinEnabled(true);
                message.success({ content: t('skin.allow.success'), key: 'applySkin' });
                const status = await window.electronAPI?.getRetroSkinStatus?.();
                if (status) {
                    setRetroUnitsEnabled(status.unitsEnabled);
                    setRetroBuildingsEnabled(status.buildingsEnabled);
                    setRetroUnitsDirName(status.unitsDirName);
                    setRetroBuildingsDirName(status.buildingsDirName);
                }
            }
        } catch (error: any) {
            const failKey = skinEnabled ? 'skin.disable.fail' : 'skin.allow.fail';
            message.error({ content: `${t(failKey)}: ${error.message || ''}`, key: 'applySkin' });
        }
    };

    const applyRetroSettings = async (unitsEnabled: boolean, buildingsEnabled: boolean) => {
        if (!war3Path) {
            message.error('War3 path not detected');
            return;
        }

        if ((unitsEnabled || buildingsEnabled) && !isFullPackageInstalled) {
            message.error(t('main.status.full_not_installed'));
            return;
        }

        setRetroApplying(true);
        message.loading({ content: t('skin.applying'), key: 'applySkin' });
        try {
            const status = await window.electronAPI?.applyRetroSkin?.({
                unitsEnabled,
                buildingsEnabled,
            });
            if (status) {
                setRetroUnitsEnabled(status.unitsEnabled);
                setRetroBuildingsEnabled(status.buildingsEnabled);
                setRetroUnitsDirName(status.unitsDirName);
                setRetroBuildingsDirName(status.buildingsDirName);
            }
            const skinStillEnabled = await window.electronAPI?.isSkinEnabled?.();
            setSkinEnabled(skinStillEnabled !== false);
            message.success({ content: t('skin.apply.success'), key: 'applySkin' });
        } catch (error: any) {
            message.error({ content: `${t('skin.apply.fail')}: ${error.message || ''}`, key: 'applySkin' });
        } finally {
            setRetroApplying(false);
        }
    };

    const handleRetroToggle = async (type: 'units' | 'buildings', enabled: boolean) => {
        const nextUnits = type === 'units' ? enabled : retroUnitsEnabled;
        const nextBuildings = type === 'buildings' ? enabled : retroBuildingsEnabled;
        await applyRetroSettings(nextUnits, nextBuildings);
    };

    const handleRetroCategoryClick = async () => {
        if (panelDisabled || retroApplying || !isFullPackageInstalled) return;
        playSmall();
        if (isRetroActive) {
            await applyRetroSettings(false, false);
            setSelectedCategory('hero');
            return;
        }
        if (isRetroTab) {
            setSelectedCategory('hero');
            return;
        }
        setSelectedCategory('retro');
    };

    const handleApplySkin = async (targetId: string, skinId: string, customFilePath?: string) => {
        console.log('[SkinModal] handleApplySkin called:', { targetId, skinId, selectedCategory, selectedHeroId, isClassicMode });
        if (!skinId) {
            message.warning(t('skin.select.prompt'));
            return;
        }

        if (!war3Path) {
            message.error('War3 path not detected');
            return;
        }

        message.loading({ content: t('skin.applying'), key: 'applySkin' });

        try {
            if (selectedCategory === 'hero') {
                const skin = availableSkins?.find(s => s.id === skinId);
                console.log('[SkinModal] Hero skin selection:', { currentHero, skin, isClassicMode });
                if (!skin || !currentHero) {
                    console.error('[SkinModal] Missing hero or skin definition');
                    return;
                }

                // Classic mode: use classic skin API
                if (isClassicMode) {
                    // Convert skin config to classic format
                    const classicSkinData: any = {};
                    for (const change of skin.config) {
                        if (change.field === 'file') {
                            classicSkinData.file = change.value;
                        } else if (change.field === 'modelScale:hd') {
                            classicSkinData.modelScale = change.value;
                        } else if (change.field === 'Art') {
                            classicSkinData.art = change.value;
                        } else if (change.field === 'unitSound') {
                            classicSkinData.unitSound = change.value;
                        }
                    }

                    console.log('[SkinModal] Applying classic skin:', { heroId: currentHero.unitId, skinData: classicSkinData });
                    await (window as any).electronAPI.applyClassicSkin(war3Path, {
                        heroId: currentHero.unitId,
                        skinData: classicSkinData
                    });
                } else {
                    // Reforged mode: use regular skin API
                    await (window as any).electronAPI.applySkin(currentHero.unitId, skin.config);
                }

                setHeroSkinByKey(prev => ({
                    ...prev,
                    [heroSkinKey(selectedRace, selectedHeroId)]: skinId,
                }));
                message.success({ content: t('skin.apply.success'), key: 'applySkin' });
            } else if (selectedHeroId === 'custom') {
                // Custom skins not available in classic mode
                if (isClassicMode) {
                    message.error({ content: 'Custom skins are not available in classic mode', key: 'applySkin' });
                    return;
                }

                const filePath = customFilePath || customSkins[skinId];
                console.log('[SkinModal] Custom skin selection:', { skinId, filePath });
                if (!filePath) {
                    message.error({ content: t('skin.model.select'), key: 'applySkin' });
                    return;
                }
                await (window as any).electronAPI.applySkin(skinId, [{ field: 'file', value: filePath }]);
                setSelectedCustomUnitId(skinId);
                message.success({ content: t('skin.apply.success'), key: 'applySkin' });
            } else {
                // Warband skins not available in classic mode
                if (isClassicMode) {
                    message.error({ content: 'Warband skins are not available in classic mode', key: 'applySkin' });
                    return;
                }

                const warband = currentWarbands.find(w => w.id === skinId);
                console.log('[SkinModal] Warband skin selection:', warband);
                if (!warband) return;

                const vanillaWarband = currentWarbands.find(w => w.id.endsWith('_u1'));

                // 先还原为该种族「原版」战团，再应用所选涂装，避免 A→B 时只覆盖部分兵种导致混搭
                if (vanillaWarband && warband.id !== vanillaWarband.id) {
                    const resetBatch = buildBatchChangesFromWarbandConfig(vanillaWarband.config);
                    console.log('[SkinModal] Reset race units to vanilla warband before apply:', vanillaWarband.id, resetBatch);
                    await (window as any).electronAPI.applyBatchSkin(resetBatch);
                }

                const batchChanges = buildBatchChangesFromWarbandConfig(warband.config);
                console.log('[SkinModal] Batch skin changes:', batchChanges);
                await (window as any).electronAPI.applyBatchSkin(batchChanges);
                setWarbandSkinByRace(prev => ({ ...prev, [selectedRace]: warband.id }));
                message.success({ content: t('skin.apply.success'), key: 'applySkin' });
            }
        } catch (error: any) {
            console.error('Failed to apply skin:', error);
            message.error({ content: `${t('skin.apply.fail')}: ${error.message || ''}`, key: 'applySkin' });
        }
    };

    return (
        <OverlayModal
            title={isClassicMode ? `${t('skin.title')} (${t('settings.ui.classic')})` : t('skin.title')}
            open={open}
            onClose={onClose}
        >
            <div style={{ padding: '0 40px' }}>
                {/* 顶部控制栏：种族和类别 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '40px',
                    borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
                    paddingBottom: '20px'
                }}>
                    {/* 种族选择 */}
                    {!isRetroTab && (
                    <Space size="large" style={{
                        opacity: panelDisabled ? 0.45 : 1,
                        pointerEvents: panelDisabled ? 'none' : 'auto',
                    }}>
                        {races.map((race) => (
                            <div
                                key={race.id}
                                onClick={() => {
                                    playSmall();
                                    setSelectedRace(race.id);
                                }}
                                onMouseEnter={() => playHover()}
                                style={{
                                    cursor: 'pointer',
                                    opacity: selectedRace === race.id ? 1 : 0.5,
                                    transform: selectedRace === race.id ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.3s',
                                    textAlign: 'center',
                                    display: selectedCategory === 'unit' && selectedHeroId !== 'custom' && race.id === 'neutral' ? 'none' : 'block' // 中立种族在自定义模式下可见
                                }}
                            >
                                <img
                                    src={race.icon}
                                    alt={race.name}
                                    style={{ width: '48px', height: '48px', marginBottom: '5px' }}
                                />
                                <div style={{ color: '#d4af37', fontSize: '14px' }}>{race.name}</div>
                            </div>
                        ))}
                    </Space>
                    )}

                    {/* 类别选择 */}
                    <Space>
                        <Button
                            type={selectedCategory === 'hero' ? "primary" : "default"}
                            onClick={() => {
                                if (isRetroTab) return;
                                playSmall();
                                setSelectedCategory('hero');
                            }}
                            onMouseEnter={() => playHover()}
                            disabled={isRetroTab || panelDisabled}
                            style={{
                                background: selectedCategory === 'hero' ? '#d4af37' : 'transparent',
                                borderColor: '#d4af37',
                                color: (isRetroTab || panelDisabled) ? '#666' : (selectedCategory === 'hero' ? '#000' : '#d4af37'),
                                height: '40px',
                                padding: '0 30px',
                                fontSize: '16px',
                                opacity: (isRetroTab || panelDisabled) ? 0.5 : 1
                            }}
                        >
                            {t('skin.category.hero')}
                        </Button>
                        {/* Hide warband/unit category in classic mode OR if full package is not installed */}
                        {!isClassicMode && isFullPackageInstalled && (
                            <Button
                                type={selectedCategory === 'unit' ? "primary" : "default"}
                                onClick={() => {
                                    if (isRetroTab) return;
                                    playSmall();
                                    setSelectedCategory('unit');
                                }}
                                onMouseEnter={() => playHover()}
                                disabled={isRetroTab || panelDisabled}
                                style={{
                                    background: selectedCategory === 'unit' ? '#d4af37' : 'transparent',
                                    borderColor: '#d4af37',
                                    color: (isRetroTab || panelDisabled) ? '#666' : (selectedCategory === 'unit' ? '#000' : '#d4af37'),
                                    height: '40px',
                                    padding: '0 30px',
                                    fontSize: '16px',
                                    opacity: (isRetroTab || panelDisabled) ? 0.5 : 1
                                }}
                            >
                                {t('skin.category.unit')}
                            </Button>
                        )}
                        <Button
                            type={isRetroActive || isRetroTab ? "primary" : "default"}
                            onClick={() => { void handleRetroCategoryClick(); }}
                            onMouseEnter={() => playHover()}
                            disabled={panelDisabled || retroApplying || !isFullPackageInstalled}
                            style={{
                                background: (isRetroActive || isRetroTab) ? '#d4af37' : 'transparent',
                                borderColor: isRetroActive ? '#ff7875' : '#d4af37',
                                color: panelDisabled ? '#666' : (isRetroActive ? '#000' : (isRetroTab ? '#000' : '#d4af37')),
                                height: '40px',
                                padding: '0 20px',
                                fontSize: '16px',
                                opacity: panelDisabled ? 0.5 : 1
                            }}
                        >
                            {isRetroActive ? t('skin.category.retro.off') : t('skin.category.retro')}
                        </Button>
                        {!isClassicMode && isFullPackageInstalled && (
                            <Button
                                onClick={() => {
                                    playSmall();
                                    handleToggleSkins();
                                }}
                                onMouseEnter={() => playHover()}
                                style={{
                                    borderColor: skinEnabled ? '#ff7875' : '#52c41a',
                                    color: skinEnabled ? '#ff7875' : '#52c41a',
                                    height: '40px',
                                    padding: '0 20px',
                                    fontSize: '16px'
                                }}
                            >
                                {skinEnabled ? t('skin.disable') : t('skin.allow')}
                            </Button>
                        )}
                    </Space>
                </div>

                {panelDisabled && (
                    <div style={{
                        marginBottom: '24px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 120, 117, 0.35)',
                        background: 'rgba(255, 120, 117, 0.08)',
                        color: '#ffaaa8',
                        fontSize: '14px',
                        textAlign: 'center',
                    }}>
                        {t('skin.disabled.hint')}
                    </div>
                )}

                {/* 主内容区：两栏布局 */}
                <div style={{
                    opacity: panelDisabled ? 0.45 : 1,
                    pointerEvents: panelDisabled ? 'none' : 'auto',
                }}>
                {isRetroTab ? (
                    <div style={{ padding: '20px 0', minHeight: '500px' }}>
                        <Text style={{ color: '#d4af37', fontSize: '18px', marginBottom: '12px', display: 'block' }}>
                            {t('skin.retro.title')}
                        </Text>
                        <Text style={{ color: '#aaa', fontSize: '14px', marginBottom: '32px', display: 'block' }}>
                            {t('skin.retro.desc')}
                        </Text>

                        <Space direction="vertical" size={24} style={{ width: '100%', maxWidth: '640px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '20px 24px',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.3)'
                            }}>
                                <div>
                                    <div style={{ color: '#d4af37', fontSize: '16px', marginBottom: '6px' }}>
                                        {t('skin.retro.units')}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '13px' }}>
                                        {retroUnitsDirName
                                            ? `${t('skin.retro.units.desc')} (${retroUnitsDirName})`
                                            : t('skin.retro.units.missing')}
                                    </div>
                                </div>
                                <Switch
                                    checked={retroUnitsEnabled}
                                    disabled={retroApplying || !isFullPackageInstalled || !retroUnitsDirName}
                                    onChange={(checked) => {
                                        playSmall();
                                        handleRetroToggle('units', checked);
                                    }}
                                />
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '20px 24px',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.3)'
                            }}>
                                <div>
                                    <div style={{ color: '#d4af37', fontSize: '16px', marginBottom: '6px' }}>
                                        {t('skin.retro.buildings')}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '13px' }}>
                                        {retroBuildingsDirName
                                            ? `${t('skin.retro.buildings.desc')} (${retroBuildingsDirName})`
                                            : t('skin.retro.buildings.missing')}
                                    </div>
                                </div>
                                <Switch
                                    checked={retroBuildingsEnabled}
                                    disabled={retroApplying || !isFullPackageInstalled || !retroBuildingsDirName}
                                    onChange={(checked) => {
                                        playSmall();
                                        handleRetroToggle('buildings', checked);
                                    }}
                                />
                            </div>
                        </Space>
                    </div>
                ) : (
                <Row gutter={40}>
                    {/* 左侧：列表 */}
                    <Col span={6}>
                        <div style={{
                            borderRight: '1px solid rgba(212, 175, 55, 0.2)',
                            height: '100%',
                            minHeight: '500px'
                        }}>
                            <Text style={{ color: '#d4af37', fontSize: '18px', marginBottom: '20px', display: 'block' }}>
                                {selectedCategory === 'hero' ? t('skin.select.hero') : t('skin.category.unit.select')}
                            </Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {selectedCategory === 'hero' ? (
                                    currentHeroes.map((hero) => (
                                        <div
                                            key={hero.id}
                                            onClick={() => {
                                                console.log('[SkinModal] Hero clicked:', hero.id);
                                                playSmall();
                                                setSelectedHeroId(hero.id);
                                            }}
                                            onMouseEnter={() => playHover()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px',
                                                background: selectedHeroId === hero.id ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), transparent)' : 'transparent',
                                                borderLeft: selectedHeroId === hero.id ? '4px solid #d4af37' : '4px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <img
                                                src={`./assets/quenching/${hero.icon}`}
                                                alt={hero.name}
                                                style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '4px' }}
                                            />
                                            <span style={{ color: '#d4af37', fontSize: '16px' }}>{t(`skin.hero.${hero.id}` as any, hero.name)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div
                                            onClick={() => {
                                                playSmall();
                                                setSelectedHeroId('warband');
                                            }}
                                            onMouseEnter={() => playHover()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px',
                                                background: selectedHeroId === 'warband' ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), transparent)' : 'transparent',
                                                borderLeft: selectedHeroId === 'warband' ? '4px solid #d4af37' : '4px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <img
                                                src="./assets/quenching/logo.png"
                                                alt={t('skin.warband')}
                                                style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '4px' }}
                                            />
                                            <span style={{ color: '#d4af37', fontSize: '16px' }}>{t('skin.warband')}</span>
                                        </div>
                                        <div
                                            onClick={() => {
                                                playSmall();
                                                setSelectedHeroId('custom');
                                                setSelectedCustomUnitId('');
                                            }}
                                            onMouseEnter={() => playHover()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px',
                                                background: selectedHeroId === 'custom' ? 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), transparent)' : 'transparent',
                                                borderLeft: selectedHeroId === 'custom' ? '4px solid #d4af37' : '4px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <img
                                                src="./assets/quenching/human-icon-pressed.png"
                                                alt={t('skin.custom')}
                                                style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '4px', filter: 'sepia(1) saturate(5) hue-rotate(0deg)' }}
                                            />
                                            <span style={{ color: '#d4af37', fontSize: '16px' }}>{t('skin.custom')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* 右侧：皮肤预览 */}
                    <Col span={18}>
                        <Text style={{ color: '#d4af37', fontSize: '18px', marginBottom: '20px', display: 'block' }}>
                            {selectedHeroId === 'custom' ? t('skin.custom.model') : t('skin.available')}
                        </Text>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '20px'
                        }}>
                            {selectedCategory === 'hero' ? (
                                availableSkins?.map((skin) => (
                                    <div
                                        key={skin.id}
                                        onClick={() => {
                                            console.log('[SkinModal] Skin clicked:', skin.id);
                                            playSmall();
                                            handleApplySkin(currentHero.id, skin.id);
                                        }}
                                        onMouseEnter={() => playHover()}
                                        style={{
                                            background: activeHeroSkinId === skin.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.3)',
                                            border: activeHeroSkinId === skin.id ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            transform: activeHeroSkinId === skin.id ? 'translateY(-5px)' : 'none',
                                            boxShadow: activeHeroSkinId === skin.id ? '0 5px 15px rgba(0,0,0,0.5)' : 'none'
                                        }}
                                    >
                                        <div style={{ height: '140px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                                            <Image
                                                src={`./assets/quenching/${skin.preview}`}
                                                alt={skin.name}
                                                preview={false}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                fallback="./assets/quenching/logo.png"
                                            />
                                        </div>
                                        <div style={{
                                            padding: '10px',
                                            textAlign: 'center',
                                            borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                                            background: activeHeroSkinId === skin.id ? '#d4af37' : 'transparent'
                                        }}>
                                            <span style={{
                                                color: activeHeroSkinId === skin.id ? '#000' : '#d4af37',
                                                fontWeight: 'bold'
                                            }}>
                                                {t(`skin.hero.${selectedHeroId}.skin.${skin.id}` as any, skin.name)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : selectedHeroId === 'custom' ? (
                                (CUSTOM_SKIN_CONFIG[selectedRace]?.units || []).map((unit) => (
                                    <div
                                        key={unit.unitId}
                                        onClick={() => {
                                            playSmall();
                                            setSelectedCustomUnitId(unit.unitId);
                                        }}
                                        onMouseEnter={() => playHover()}
                                        style={{
                                            background: selectedCustomUnitId === unit.unitId ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.3)',
                                            border: selectedCustomUnitId === unit.unitId ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
                                            borderRadius: '8px',
                                            padding: '15px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}
                                    >
                                        <img
                                            src={`./assets/quenching/${unit.icon}`}
                                            alt={unit.name}
                                            style={{ width: '64px', height: '64px', borderRadius: '4px' }}
                                        />
                                        <span style={{ color: '#d4af37', fontSize: '16px', fontWeight: 'bold' }}>{t(`skin.unit.${unit.unitId}` as any, unit.name)}</span>

                                        <Button
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playSmall();
                                                handleSelectModel(unit.unitId);
                                            }}
                                            onMouseEnter={() => playHover()}
                                            style={{
                                                background: customSkins[unit.unitId] ? '#d4af37' : 'transparent',
                                                borderColor: '#d4af37',
                                                color: customSkins[unit.unitId] ? '#000' : '#d4af37',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {customSkins[unit.unitId] ? t('skin.model.reselect') : t('skin.model.select')}
                                        </Button>

                                        {customSkins[unit.unitId] && (
                                            <div style={{
                                                fontSize: '10px',
                                                color: '#aaa',
                                                maxWidth: '100%',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {customSkins[unit.unitId].split(/[\\/]/).pop()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                currentWarbands.map((warband) => (
                                    <div
                                        key={warband.id}
                                        onClick={() => {
                                            playSmall();
                                            handleApplySkin('warband', warband.id);
                                        }}
                                        onMouseEnter={() => playHover()}
                                        style={{
                                            background: activeWarbandSkinId === warband.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.3)',
                                            border: activeWarbandSkinId === warband.id ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            transform: activeWarbandSkinId === warband.id ? 'translateY(-5px)' : 'none',
                                            boxShadow: activeWarbandSkinId === warband.id ? '0 5px 15px rgba(0,0,0,0.5)' : 'none'
                                        }}
                                    >
                                        <div style={{ height: '140px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                                            <Image
                                                src={`./assets/quenching/${warband.preview}`}
                                                alt={warband.name}
                                                preview={false}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                fallback="./assets/quenching/logo.png"
                                            />
                                        </div>
                                        <div style={{
                                            padding: '10px',
                                            textAlign: 'center',
                                            borderTop: '1px solid rgba(212, 175, 55, 0.2)',
                                            background: activeWarbandSkinId === warband.id ? '#d4af37' : 'transparent'
                                        }}>
                                            <span style={{
                                                color: activeWarbandSkinId === warband.id ? '#000' : '#d4af37',
                                                fontWeight: 'bold'
                                            }}>
                                                {t(`skin.warband.${warband.id}` as any, warband.name)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {selectedCategory === 'hero' && !currentHero && (
                            <div style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
                                {t('skin.prompt.hero')}
                            </div>
                        )}
                        {selectedCategory === 'unit' && selectedHeroId === 'custom' && !selectedCustomUnitId && (
                            <div style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
                                {t('skin.prompt.custom')}
                            </div>
                        )}
                    </Col>
                </Row>
                )}
                </div>
            </div>
        </OverlayModal>
    );
};
