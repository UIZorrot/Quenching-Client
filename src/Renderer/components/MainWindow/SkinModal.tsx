import React, { useState, useMemo } from 'react';
import { Card, Typography, Button, Space, Row, Col, Image, message } from 'antd';
import { useTranslation } from '../../utils/i18n';
import { OverlayModal } from './OverlayModal';
import { SKIN_CONFIG, HeroSkinConfig, CUSTOM_SKIN_CONFIG } from '../../assets/data/skin-config';
import { useSound } from '../../hooks/useSound';

const { Text } = Typography;

interface SkinModalProps {
  open: boolean;
  onClose: () => void;
}

export const SkinModal: React.FC<SkinModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { playSmall, playHover } = useSound();
  const [selectedRace, setSelectedRace] = useState<string>('hum');
  const [selectedCategory, setSelectedCategory] = useState<string>('hero');
  const [selectedHeroId, setSelectedHeroId] = useState<string>('');
  const [selectedWarbandId, setSelectedWarbandId] = useState<string>('');
  const [selectedSkinId, setSelectedSkinId] = useState<string>('');
  const [customSkins, setCustomSkins] = useState<Record<string, string>>({});

  // 种族数据
  const races = [
    { id: 'hum', name: '人类', icon: './assets/quenching/human-icon-pressed.png' },
    { id: 'orc', name: '兽人', icon: './assets/quenching/orc-icon-pressed.png' },
    { id: 'ud', name: '不死族', icon: './assets/quenching/undead-icon-pressed.png' },
    { id: 'ne', name: '暗夜精灵', icon: './assets/quenching/nightelf-icon-pressed.png' },
    { id: 'neutral', name: '中立', icon: './assets/quenching/logo.png' }
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
              setSelectedHeroId(currentHeroes[0].id);
          }
          setSelectedSkinId('');
      } else {
          // 如果当前已经是自定义模式，切换种族时不重置为 warband
          if (selectedHeroId !== 'custom') {
            setSelectedHeroId('warband'); 
          }
          
          if (selectedHeroId === 'warband' && currentWarbands.length > 0) {
              setSelectedSkinId(currentWarbands[0].id);
          } else if (selectedHeroId === 'custom') {
              // 切换种族后，如果当前选中的自定义单位不在新种族的列表中，则取消选中
              const raceUnits = CUSTOM_SKIN_CONFIG[selectedRace]?.units || [];
              if (!raceUnits.find(u => u.unitId === selectedSkinId)) {
                setSelectedSkinId('');
              }
          }
      }
  }, [selectedRace, selectedCategory, currentHeroes, currentWarbands]);

  // 获取当前选中的英雄数据
  const currentHero = useMemo(() => {
      return currentHeroes.find(h => h.id === selectedHeroId);
  }, [currentHeroes, selectedHeroId]);

  // 获取当前选中的战团数据
  const currentWarband = useMemo(() => {
      return currentWarbands.find(w => w.id === selectedSkinId);
  }, [currentWarbands, selectedSkinId]);

  const handleSelectModel = async (unitId: string) => {
    try {
      const filePath = await (window as any).electronAPI.selectModelFile();
      if (filePath) {
        setCustomSkins(prev => ({ ...prev, [unitId]: filePath }));
        setSelectedSkinId(unitId); // 选中该单位，以便激活应用按钮
      }
    } catch (error) {
      console.error('Failed to select model file:', error);
      message.error('选择模型文件失败');
    }
  };

  const handleApplySkin = async (targetId: string, skinId: string) => {
    if (!skinId) {
        message.warning('请先选择一个皮肤');
        return;
    }
    
    message.loading({ content: '正在应用涂装...', key: 'applySkin' });
    
    try {
        if (selectedCategory === 'hero') {
            const skin = currentHero?.skins.find(s => s.id === skinId);
            if (!skin || !currentHero) return;
            await (window as any).electronAPI.applySkin(currentHero.unitId, skin.config);
            message.success({ content: `已成功应用 ${currentHero?.name} 的涂装: ${skin.name}`, key: 'applySkin' });
        } else if (selectedHeroId === 'custom') {
            const filePath = customSkins[skinId];
            if (!filePath) {
                message.error({ content: '请先选择模型文件', key: 'applySkin' });
                return;
            }
            await (window as any).electronAPI.applySkin(skinId, [{ field: 'file', value: filePath }]);
            message.success({ content: `已成功应用自定义涂装`, key: 'applySkin' });
        } else {
            const warband = currentWarbands.find(w => w.id === skinId);
            if (!warband) return;
            
            // 战团涂装是批量更新，按 unitId 分组合并 changes
            const groupedChanges: Record<string, any[]> = {};
            warband.config.forEach(c => {
                if (!groupedChanges[c.unitId]) {
                    groupedChanges[c.unitId] = [];
                }
                groupedChanges[c.unitId].push({ field: c.field, value: c.value });
            });

            const batchChanges = Object.keys(groupedChanges).map(unitId => ({
                unitId,
                changes: groupedChanges[unitId]
            }));
            
            await (window as any).electronAPI.applyBatchSkin(batchChanges);
            message.success({ content: `已成功应用战团涂装: ${warband.name}`, key: 'applySkin' });
        }
    } catch (error: any) {
        console.error('Failed to apply skin:', error);
        message.error({ content: `应用失败: ${error.message || '未知错误'}`, key: 'applySkin' });
    }
  };

  return (
    <OverlayModal
      title="单位涂装中心"
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
                  英雄
                </Button>
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
                  单位
                </Button>
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
                        {selectedCategory === 'hero' ? '选择英雄' : '单位分类'}
                    </Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {selectedCategory === 'hero' ? (
                            currentHeroes.map((hero) => (
                                <div
                                    key={hero.id}
                                    onClick={() => {
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
                                    <span style={{ color: '#d4af37', fontSize: '16px' }}>{hero.name}</span>
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
                                        alt="战团涂装"
                                        style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '4px' }}
                                    />
                                    <span style={{ color: '#d4af37', fontSize: '16px' }}>战团涂装</span>
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
                                        alt="自定义涂装"
                                        style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '4px', filter: 'sepia(1) saturate(5) hue-rotate(0deg)' }}
                                    />
                                    <span style={{ color: '#d4af37', fontSize: '16px' }}>自定义涂装</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Col>

            {/* 右侧：皮肤预览 */}
            <Col span={18}>
                <Text style={{ color: '#d4af37', fontSize: '18px', marginBottom: '20px', display: 'block' }}>
                    {selectedHeroId === 'custom' ? '自定义单位模型' : '可用涂装'}
                </Text>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '20px' 
                }}>
                    {selectedCategory === 'hero' ? (
                        currentHero?.skins.map((skin) => (
                            <div
                                key={skin.id}
                                onClick={() => {
                                  playSmall();
                                  setSelectedSkinId(skin.id);
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
                                        {skin.name}
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
                                <span style={{ color: '#d4af37', fontSize: '16px', fontWeight: 'bold' }}>{unit.name}</span>
                                
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
                                    {customSkins[unit.unitId] ? '重选模型' : '选择模型'}
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
                                onClick={() => setSelectedSkinId(warband.id)}
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
                                        {warband.name}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {!selectedSkinId && (
                    <div style={{ color: '#666', textAlign: 'center', marginTop: '50px' }}>
                        {selectedCategory === 'hero' ? '请选择一个英雄涂装' : 
                         selectedHeroId === 'custom' ? '请选择一个单位进行自定义' : '请选择一个战团涂装'}
                    </div>
                )}

                {/* 底部操作栏 */}
                <div style={{ marginTop: '40px', textAlign: 'right', borderTop: '1px solid rgba(212, 175, 55, 0.2)', paddingTop: '20px' }}>
                    <Space size="middle">
                        <Button 
                            size="large"
                            onClick={onClose}
                            style={{ 
                                background: 'transparent', 
                                border: '1px solid #666', 
                                color: '#888',
                                width: '120px'
                            }}
                        >
                            取消
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            disabled={!selectedSkinId}
                            onClick={() => {
                              playSmall();
                              handleApplySkin(selectedHeroId, selectedSkinId);
                            }}
                            onMouseEnter={() => playHover()}
                            style={{ 
                                background: '#d4af37', 
                                borderColor: '#d4af37', 
                                color: '#000', 
                                fontWeight: 'bold',
                                width: '150px'
                            }}
                        >
                            应用涂装
                        </Button>
                    </Space>
                </div>
            </Col>
        </Row>
      </div>
    </OverlayModal>
  );
};
