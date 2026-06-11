import React, { useState, useMemo } from 'react';
import { Card, Typography, Button, Space, Row, Col, Image, message } from 'antd';
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
    const [selectedWarbandId, setSelectedWarbandId] = useState<string>('');
    const [selectedSkinId, setSelectedSkinId] = useState<string>('');
    const [customSkins, setCustomSkins] = useState<Record<string, string>>({});
    const [skinEnabled, setSkinEnabled] = useState(true);

    React.useEffect(() => {
        if (!open) return;
        window.electronAPI?.isSkinEnabled?.()
            .then((enabled) => setSkinEnabled(enabled !== false))
            .catch(() => setSkinEnabled(true));
    }, [open, war3Path]);

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
                // Keep selectedHeroId if possible, otherwise first one
                if (!currentHeroes.find(h => h.id === selectedHeroId)) {
                    setSelectedHeroId(currentHeroes[0].id);
                    setSelectedSkinId('');
                } else {
                    // If switching back to hero category, we might want to keep selection or clear skin
                    // But usually this effect runs when *category* changes or *race* changes.
                    // If race changes, currentHeroes changes, so we enter the first condition.
                    // If category changes to 'hero', we might keep hero?
                    // The original code was:
                    /*
                       if (currentHeroes.length > 0) {
                           setSelectedHeroId(currentHeroes[0].id);
                       }
                       setSelectedSkinId('');
                    */
                }
            } else {
                setSelectedSkinId('');
            }
        } else {
            // 如果当前已经是自定义模式，切换种族时不重置为 warband
            if (selectedHeroId !== 'custom') {
                setSelectedHeroId('warband');
            }

            if (selectedHeroId === 'warband' && currentWarbands.length > 0) {
                // Check if current selection is valid for warband
                if (!currentWarbands.find(w => w.id === selectedSkinId)) {
                    setSelectedSkinId(currentWarbands[0].id);
                }
            } else if (selectedHeroId === 'custom') {
                // 切换种族后，如果当前选中的自定义单位不在新种族的列表中，则取消选中
                const raceUnits = CUSTOM_SKIN_CONFIG[selectedRace]?.units || [];
                if (!raceUnits.find(u => u.unitId === selectedSkinId)) {
                    setSelectedSkinId('');
                }
            }
        }
    }, [selectedRace, selectedCategory, currentHeroes, currentWarbands]); // This dependency array seems missing 'selectedHeroId' in original code but using it inside?

    // Original effect had dependencies: [selectedRace, selectedCategory, currentHeroes, currentWarbands]
    // My modification above was trying to be smarter but let's stick to adding the NEW effects separately to avoid breaking existing behavior unless necessary.
    // Actually, looking at original code:
    /*
    React.useEffect(() => {
        if (selectedCategory === 'hero') {
            if (currentHeroes.length > 0) {
                setSelectedHeroId(currentHeroes[0].id);
            }
            setSelectedSkinId('');
        }
        ...
    */
    // This resets hero selection EVERY key press of race/category.

    // New effects for restrictions:
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

    // 获取当前选中的战团数据
    const currentWarband = useMemo(() => {
        return currentWarbands.find(w => w.id === selectedSkinId);
    }, [currentWarbands, selectedSkinId]);

    React.useEffect(() => {
        if (selectedCategory === 'unit') {
            if (isClassicMode || !isFullPackageInstalled) {
                setSelectedCategory('hero');
                setSelectedSkinId('');
            }
        }
    }, [isClassicMode, isFullPackageInstalled, selectedCategory]);

    // Removed the aggressive reset effect for selectedSkinId to fix "no resident effect" issue.
    // Logic was: if (selectedCategory === 'hero' && selectedSkinId && !availableSkins.find(...)) setSelectedSkinId('');

    const handleSelectModel = async (unitId: string) => {
        try {
            const filePath = await (window as any).electronAPI.selectModelFile();
            if (filePath) {
                setCustomSkins(prev => ({ ...prev, [unitId]: filePath }));
                setSelectedSkinId(unitId);
                // 选择模型后立即应用，传入 filePath 避免状态更新延迟导致的问题
                await handleApplySkin('custom', unitId, filePath);
            }
        } catch (error) {
            console.error('Failed to select model file:', error);
            message.error(t('skin.model.select.fail'));
        }
    };

    const handleDisableSkins = async () => {
        if (!war3Path) {
            message.error('War3 path not detected');
            return;
        }
        message.loading({ content: t('skin.applying'), key: 'applySkin' });
        try {
            await window.electronAPI?.disableSkins?.();
            setSkinEnabled(false);
            setSelectedSkinId('');
            message.success({ content: t('skin.disable.success'), key: 'applySkin' });
        } catch (error: any) {
            message.error({ content: `${t('skin.disable.fail')}: ${error.message || ''}`, key: 'applySkin' });
        }
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
                    <Space size="large">
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

                    {/* 类别选择 */}
                    <Space>
                        <Button
                            type={selectedCategory === 'hero' ? "primary" : "default"}
                            onClick={() => {
                                playSmall();
                                setSelectedCategory('hero');
                            }}
                            onMouseEnter={() => playHover()}
                            style={{
                                background: selectedCategory === 'hero' ? '#d4af37' : 'transparent',
                                borderColor: '#d4af37',
                                color: selectedCategory === 'hero' ? '#000' : '#d4af37',
                                height: '40px',
                                padding: '0 30px',
                                fontSize: '16px'
                            }}
                        >
                            {t('skin.category.hero')}
                        </Button>
                        {/* Hide warband/unit category in classic mode OR if full package is not installed */}
                        {!isClassicMode && isFullPackageInstalled && (
                            <Button
                                type={selectedCategory === 'unit' ? "primary" : "default"}
                                onClick={() => {
                                    playSmall();
                                    setSelectedCategory('unit');
                                }}
                                onMouseEnter={() => playHover()}
                                style={{
                                    background: selectedCategory === 'unit' ? '#d4af37' : 'transparent',
                                    borderColor: '#d4af37',
                                    color: selectedCategory === 'unit' ? '#000' : '#d4af37',
                                    height: '40px',
                                    padding: '0 30px',
                                    fontSize: '16px'
                                }}
                            >
                                {t('skin.category.unit')}
                            </Button>
                        )}
                        {!isClassicMode && isFullPackageInstalled && (
                            <Button
                                onClick={() => {
                                    playSmall();
                                    handleDisableSkins();
                                }}
                                onMouseEnter={() => playHover()}
                                disabled={!skinEnabled}
                                style={{
                                    borderColor: skinEnabled ? '#ff7875' : '#666',
                                    color: skinEnabled ? '#ff7875' : '#666',
                                    height: '40px',
                                    padding: '0 20px',
                                    fontSize: '16px'
                                }}
                            >
                                {t('skin.disable')}
                            </Button>
                        )}
                    </Space>
                </div>

                {/* 主内容区：两栏布局 */}
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
                                                setSelectedSkinId('');
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
                                            setSelectedSkinId(skin.id);
                                            // 立即应用皮肤
                                            handleApplySkin(currentHero.id, skin.id);
                                        }}
                                        onMouseEnter={() => playHover()}
                                        style={{
                                            background: selectedSkinId === skin.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.3)',
                                            border: selectedSkinId === skin.id ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            transform: selectedSkinId === skin.id ? 'translateY(-5px)' : 'none',
                                            boxShadow: selectedSkinId === skin.id ? '0 5px 15px rgba(0,0,0,0.5)' : 'none'
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
                                            background: selectedSkinId === skin.id ? '#d4af37' : 'transparent'
                                        }}>
                                            <span style={{
                                                color: selectedSkinId === skin.id ? '#000' : '#d4af37',
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
                                            setSelectedSkinId(unit.unitId);
                                        }}
                                        onMouseEnter={() => playHover()}
                                        style={{
                                            background: selectedSkinId === unit.unitId ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.3)',
                                            border: selectedSkinId === unit.unitId ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
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
                                            setSelectedSkinId(warband.id);
                                            // 立即应用战团皮肤
                                            handleApplySkin('warband', warband.id);
                                        }}
                                        onMouseEnter={() => playHover()}
                                        style={{
                                            background: selectedSkinId === warband.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.3)',
                                            border: selectedSkinId === warband.id ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            transform: selectedSkinId === warband.id ? 'translateY(-5px)' : 'none',
                                            boxShadow: selectedSkinId === warband.id ? '0 5px 15px rgba(0,0,0,0.5)' : 'none'
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
                                            background: selectedSkinId === warband.id ? '#d4af37' : 'transparent'
                                        }}>
                                            <span style={{
                                                color: selectedSkinId === warband.id ? '#000' : '#d4af37',
                                                fontWeight: 'bold'
                                            }}>
                                                {t(`skin.warband.${warband.id}` as any, warband.name)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {!selectedSkinId && (
                            <div style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
                                {selectedCategory === 'hero' ? t('skin.prompt.hero') :
                                    selectedHeroId === 'custom' ? t('skin.prompt.custom') : t('skin.prompt.warband')}
                            </div>
                        )}
                    </Col>
                </Row>
            </div>
        </OverlayModal>
    );
};
