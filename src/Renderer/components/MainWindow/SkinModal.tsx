import React, { useEffect, useMemo, useState } from 'react';
import { Switch, message } from 'antd';
import { ModelPreview } from './ModelPreview';
import { CustomSkinEditor } from './CustomSkinEditor';
import { OverlayModal } from './OverlayModal';
import { SKIN_CONFIG } from '../../assets/data/skin-config';
import { builtInSkins, PanelSkin, skinTargets, warbandChoices } from '../../assets/data/skin-panel-catalog';
import { SkinSelections, VersionSkinChange, VersionSkinChoice, scopedSkin } from '../../../shared/skin-versions';
import { activeSkinArtSet } from '../../../shared/active-skin-art-set';
import { useWar3Detector } from '../../hooks/useWar3Detector';
import { useWar3Settings } from '../../hooks/useWar3Settings';
import { useSound } from '../../hooks/useSound';
import { useTranslation } from '../../utils/i18n';
import * as styles from './SkinModal.module.less';

interface SkinModalProps { open: boolean; onClose: () => void; isFullPackageInstalled?: boolean }
type Category = 'hero' | 'unit' | 'building';
type UnitMode = 'single' | 'warband' | 'retro';
const races = [
  { id: 'hum', name: '人类', icon: 'human-icon-pressed.png', glow: 'rgba(75,142,255,.85)', teamColor: 1 },
  { id: 'orc', name: '兽人', icon: 'orc-icon-pressed.png', glow: 'rgba(255,70,62,.85)', teamColor: 0 },
  { id: 'ud', name: '不死族', icon: 'undead-icon-pressed.png', glow: 'rgba(175,94,255,.9)', teamColor: 3 },
  { id: 'ne', name: '暗夜精灵', icon: 'nightelf-icon-pressed.png', glow: 'rgba(64,217,213,.85)', teamColor: 2 },
  { id: 'neutral', name: '中立', icon: 'random-icon-.png', glow: 'rgba(178,183,190,.72)', teamColor: 8 },
] as const;
const categories: { id: Category; name: string; nameKey: string; icon: string }[] = [
  { id: 'hero', name: '英雄', nameKey: 'skin.category.hero', icon: 'skin-nav-hero.png' },
  { id: 'unit', name: '单位', nameKey: 'skin.category.unit', icon: 'skin-nav-unit.png' },
  { id: 'building', name: '建筑', nameKey: 'skin.panel.category.building', icon: 'skin-nav-building.png' },
];
const asset = (name?: string) => `./assets/quenching/${name || 'logo.png'}`;
const needsPackage = (config: VersionSkinChange[]) => config.some(change => /^file(?::|$)/.test(change.field) && /^cos[\\/](?!custom[\\/])/i.test(change.value));
const modelFrom = (original: VersionSkinChange[], changes: VersionSkinChange[], artSet: 'sd' | 'hd' | 'de') =>
  scopedSkin([...original, ...changes], artSet).find(change => change.field === `file:${artSet}`)?.value;

export const SkinModal: React.FC<SkinModalProps> = ({ open, onClose, isFullPackageInstalled = false }) => {
  const { t } = useTranslation();
  const { currentInstallation } = useWar3Detector();
  const { modSettings, settings } = useWar3Settings();
  const { playSmall, playHover } = useSound();
  const artSet = activeSkinArtSet(modSettings.graphicsSelection, settings.hd, modSettings.classicMode, settings.detectedGraphics);
  const [raceId, setRaceId] = useState('hum');
  const [category, setCategory] = useState<Category>('hero');
  const [unitMode, setUnitMode] = useState<UnitMode>('single');
  const [targetId, setTargetId] = useState('');
  const [previewId, setPreviewId] = useState('');
  const [presetId, setPresetId] = useState('');
  const [custom, setCustom] = useState<CustomSkinRecord[]>([]);
  const [selections, setSelections] = useState<SkinSelections>({});
  const [originals, setOriginals] = useState<Record<string, VersionSkinChange[]>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [retro, setRetro] = useState({ unitsEnabled: false, buildingsEnabled: false, unitsDirName: null as string | null, buildingsDirName: null as string | null });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(''); setOriginals({});
    Promise.all([window.electronAPI.getVersionSkinPanel(artSet), window.electronAPI.listCustomSkins(), window.electronAPI.isSkinEnabled(), window.electronAPI.getRetroSkinStatus()])
      .then(([panel, saved, active, status]) => {
        if (cancelled) return;
        setSelections(panel.selections); setOriginals(panel.originals); setCustom(saved); setEnabled(active); setRetro(status);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message || t('skin.panel.err.load', '读取皮肤失败')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, artSet, currentInstallation?.path]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !editorOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, editorOpen, onClose]);

  const race = races.find(item => item.id === raceId)!;
  const raceLabel = (id: string, name: string) => t(`skin.race.${id}`, name);
  const unitLabel = (id: string, name: string) => t(`skin.catalog.unit.${id}`, name);
  const skinLabel = (skin: { id: string; name: string }) => {
    if (skin.id === 'original' || skin.name === '原版') return t('skin.panel.original', '原版');
    const [warbandId, unitId] = skin.id.split(':');
    return unitId ? t(`skin.catalog.warband.${warbandId}`, skin.name) : t(`skin.catalog.skin.${skin.id}`, skin.name);
  };
  const warbandLabel = (preset: { id: string; name: string }) => preset.name === '原版'
    ? t('skin.panel.original', '原版') : t(`skin.catalog.warband.${preset.id}`, preset.name);
  const visibleRaces = category === 'hero' ? races : races.filter(item => item.id !== 'neutral');
  const isWarband = category === 'unit' && unitMode === 'warband';
  const isRetro = category === 'unit' && unitMode === 'retro';
  const targets = useMemo(() => skinTargets(raceId, category), [raceId, category]);
  const target = targets.find(item => item.unitId === targetId) || targets[0];
  const skins: PanelSkin[] = target ? [
    { id: 'original', name: t('skin.panel.original', '原版'), config: [] },
    ...builtInSkins(raceId, target.unitId, artSet),
    ...custom.filter(item => (item.artSet || 'hd') === artSet && item.targetId === target.unitId && item.category === category),
  ] : [];
  const currentSkin = skins.find(item => item.id === previewId)
    || skins.find(item => item.id === selections[artSet]?.[target?.unitId]) || skins[0];
  const warbands = artSet === 'hd' ? SKIN_CONFIG[raceId]?.warbands || [] : [];
  const currentPreset = warbands.find(item => item.id === presetId) || warbands[0];
  const presetChoices = currentPreset ? warbandChoices(raceId, currentPreset.id) : [];
  const presetComplete = presetChoices.length > 0 && presetChoices.every(item => selections[artSet]?.[item.unitId] === item.skinId);
  const representative = presetChoices.find(item => item.changes.some(c => c.field === 'file' || c.field.startsWith('file:'))) || presetChoices[0];
  const previewModel = !isWarband && target && currentSkin
    ? modelFrom(originals[target.unitId] || [], currentSkin.config, artSet) : undefined;
  const previewTitle = isWarband ? (currentPreset && warbandLabel(currentPreset)) : (currentSkin && skinLabel(currentSkin));
  const canApply = !busy && !loading && !error && !!originals[isWarband ? representative?.unitId : target?.unitId];
  const unavailable = isWarband ? !!currentPreset && !isFullPackageInstalled && needsPackage(currentPreset.config)
    : !!currentSkin && !isFullPackageInstalled && needsPackage(currentSkin.config);

  const apply = async (choices: VersionSkinChoice[]) => {
    setBusy(true);
    try {
      setSelections(await window.electronAPI.applyVersionSkins(artSet, choices));
      setEnabled(true); message.success(t('skin.panel.msg.applied', '{{artSet}} 涂装已应用').replace(/\{\{artSet\}\}/g, artSet.toUpperCase()));
    } catch (e: any) { message.error(e.message || t('skin.panel.err.apply', '应用涂装失败')); }
    finally { setBusy(false); }
  };
  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) await window.electronAPI.disableSkins(); else await window.electronAPI.enableSkins();
      setEnabled(!enabled);
    } catch (e: any) { message.error(e.message || t('skin.panel.err.toggle', '切换涂装失败')); }
    finally { setBusy(false); }
  };
  const toggleRetro = async (field: 'unitsEnabled' | 'buildingsEnabled', value: boolean) => {
    setBusy(true);
    try { setRetro(await window.electronAPI.applyRetroSkin({ [field]: value })); }
    catch (e: any) { message.error(e.message || t('skin.panel.err.retro', '切换怀旧涂装失败')); }
    finally { setBusy(false); }
  };
  const chooseRace = (id: string) => { playSmall(); setRaceId(id); setTargetId(''); setPreviewId(''); setPresetId(''); setEditorOpen(false); };
  const chooseCategory = (id: Category) => { playSmall(); setCategory(id); if (id !== 'hero' && raceId === 'neutral') setRaceId('hum'); setUnitMode('single'); setTargetId(''); setPreviewId(''); setPresetId(''); setEditorOpen(false); };
  const cycleSkin = (step: number) => {
    if (!skins.length) return;
    const index = skins.findIndex(item => item.id === currentSkin?.id);
    const next = (index + step + skins.length) % skins.length;
    setPreviewId(skins[next].id);
    playSmall();
  };
  const cyclePreset = (step: number) => {
    if (!warbands.length) return;
    const index = warbands.findIndex(item => item.id === currentPreset?.id);
    setPresetId(warbands[(index + step + warbands.length) % warbands.length].id);
    playSmall();
  };

  if (!open) return null;
  return <>
    <OverlayModal open={open} onClose={busy ? () => undefined : onClose} title={t('skin.title', '单位涂装')} width="90%">
      <div className={styles.layout}>
        <nav className={styles.sidebar} aria-label={t('skin.panel.nav.aria', '涂装类别')}>
          {categories.map(item => <button key={item.id} className={`${styles.category} ${category === item.id ? styles.categoryActive : ''}`}
            aria-pressed={category === item.id} onClick={() => chooseCategory(item.id)} onMouseEnter={playHover}>
            <img src={asset(item.icon)} alt="" /><span>{t(item.nameKey, item.name)}</span>
          </button>)}
          <div className={styles.sidebarFoot}>{t('skin.panel.quality', '{{artSet}} 画质').replace(/\{\{artSet\}\}/g, artSet.toUpperCase())}<br /><small>{t('skin.panel.qualityHint', '画质版本在首页切换')}</small></div>
        </nav>
        <div className={styles.content}>
          <main className={styles.controls}>
            <div className={styles.intro}>
              <span>{raceLabel(race.id, race.name)} · {artSet.toUpperCase()}</span>
              <h2>{category === 'hero' ? t('skin.panel.heading.hero', '英雄涂装') : category === 'building' ? t('skin.panel.heading.building', '建筑涂装') : t('skin.panel.heading.unit', '单位涂装')}</h2>
              <p>{isWarband ? t('skin.panel.intro.warband', '通过下方涂装选项选择战团，右侧查看战团概览。')
                : category === 'unit' ? t('skin.panel.intro.unit', '选择单位，或将战团涂装作为一组预设应用。') : t('skin.panel.intro.target', '选择对象后，在右侧预览实际游戏模型。')}</p>
            </div>
            <div className={`${styles.activationBar} ${enabled ? '' : styles.activationOff}`}>
              <div className={styles.activationStatus}>
                <strong>{enabled ? t('skin.panel.active.on', '涂装已启用') : t('skin.panel.active.off', '涂装未启用')}</strong>
                <small>{enabled ? t('skin.panel.active.onHint', '所选皮肤会在游戏中生效') : t('skin.panel.active.offHint', '当前选择会保留，启用后才会在游戏中生效')}</small>
              </div>
              <button className={`${styles.activationButton} ${!enabled ? styles.activationPrimary : ''}`}
                onClick={toggle} disabled={busy || loading}>
                {busy ? t('skin.panel.busy', '处理中…') : enabled ? t('skin.panel.disable', '关闭涂装') : t('skin.panel.enable', '启用涂装')}
              </button>
            </div>
            {category === 'unit' && <div className={styles.unitModes} role="group" aria-label={t('skin.panel.mode.aria', '单位涂装模式')}>
              {([{ id: 'single', label: t('skin.panel.mode.single', '单个单位') }, { id: 'warband', label: t('skin.panel.mode.warband', '战团预设') }, { id: 'retro', label: t('skin.panel.mode.retro', '怀旧涂装') }] as const).map(item =>
                <button key={item.id} className={unitMode === item.id ? styles.modeActive : ''} aria-pressed={unitMode === item.id}
                  onClick={() => { playSmall(); setUnitMode(item.id); setEditorOpen(false); }} onMouseEnter={playHover}>{item.label}</button>)}
            </div>}
            {!isRetro && <section>
              <h3>{t('skin.panel.race.heading', '种族')}</h3>
              <div className={styles.races} role="group" aria-label={t('skin.panel.race.aria', '选择种族')}>
                {visibleRaces.map(item => <button key={item.id} className={`${styles.race} ${raceId === item.id ? styles.raceActive : ''}`}
                  title={raceLabel(item.id, item.name)} aria-label={raceLabel(item.id, item.name)} aria-pressed={raceId === item.id} onClick={() => chooseRace(item.id)} onMouseEnter={playHover}>
                  <img src={asset(item.icon)} alt="" />
                </button>)}
              </div>
            </section>}
            {error && <div role="alert" className={styles.notice}>{error}</div>}
            {isRetro ? <section className={styles.retroBox}>
              <h3>{t('skin.panel.mode.retro', '怀旧涂装')}</h3>
              {(['unitsEnabled', 'buildingsEnabled'] as const).map(field => <div className={styles.retroRow} key={field}>
                <span>{field === 'unitsEnabled' ? t('skin.panel.retro.units', '怀旧单位') : t('skin.panel.retro.buildings', '怀旧建筑')}<small>{field === 'unitsEnabled' ? retro.unitsDirName : retro.buildingsDirName}</small></span>
                <Switch checked={retro[field]} disabled={busy || artSet !== 'hd' || !isFullPackageInstalled} onChange={checked => void toggleRetro(field, checked)} />
              </div>)}
              {artSet !== 'hd' && <p>{t('skin.panel.retro.hdOnly', '怀旧资源适用于 HD 画质，可在首页切换。')}</p>}
              {!isFullPackageInstalled && <p>{t('skin.panel.retro.needFull', '需要安装完整资源包。')}</p>}
            </section> : <>
              {!isWarband && <section className={styles.targetSection}>
                <h3>{category === 'hero' ? t('skin.select.hero', '选择英雄') : category === 'building' ? t('skin.panel.target.building', '选择建筑') : t('skin.panel.target.unit', '选择单位')}</h3>
                <div className={styles.targets}>
                  {targets.map(item => <button key={item.unitId} className={`${styles.target} ${target?.unitId === item.unitId ? styles.targetActive : ''}`}
                    title={unitLabel(item.unitId, item.name)} aria-label={unitLabel(item.unitId, item.name)} aria-pressed={target?.unitId === item.unitId}
                    onClick={() => { playSmall(); setTargetId(item.unitId); setPreviewId(''); setEditorOpen(false); }} onMouseEnter={playHover}>
                    {item.icon ? <img src={asset(item.icon)} alt="" /> : <span className={styles.targetLabel}>{unitLabel(item.unitId, item.name)}</span>}
                  </button>)}
                </div>
                {!targets.length && <p className={styles.empty}>{t('skin.panel.target.empty', '这一栏暂无对象。')}</p>}
              </section>}
              <section className={styles.choiceSection}>
                <h3>{t('skin.panel.choice.heading', '涂装')}</h3>
                {isWarband && !warbands.length && <p className={styles.empty}>{t('skin.panel.choice.noWarbands', '此画质暂无战团预设')}</p>}
                <div className={styles.choiceRow}>
                  <button className={styles.arrow} aria-label={isWarband ? t('skin.panel.choice.prevWarband', '上一个战团预设') : t('skin.panel.choice.prevSkin', '上一个皮肤')} onClick={() => isWarband ? cyclePreset(-1) : cycleSkin(-1)} disabled={isWarband ? !warbands.length : !skins.length}>‹</button>
                  <div className={styles.choiceName}><strong>{previewTitle || (isWarband ? t('skin.panel.choice.noWarbandName', '暂无战团预设') : t('skin.panel.choice.noSkin', '尚无皮肤'))}</strong><small>{isWarband ? currentPreset ? t('skin.panel.choice.warbandCount', '{{count}} 个单位与建筑').replace(/\{\{count\}\}/g, String(presetChoices.length)) : t('skin.panel.choice.noWarbandAvail', '当前无可用战团') : currentSkin && selections[artSet]?.[target?.unitId] === currentSkin.id ? t('skin.panel.choice.applied', '当前已应用') : t('skin.panel.choice.livePreview', '右侧实时预览')}</small></div>
                  <button className={styles.arrow} aria-label={isWarband ? t('skin.panel.choice.nextWarband', '下一个战团预设') : t('skin.panel.choice.nextSkin', '下一个皮肤')} onClick={() => isWarband ? cyclePreset(1) : cycleSkin(1)} disabled={isWarband ? !warbands.length : !skins.length}>›</button>
                  {isWarband ? <button className={styles.apply} disabled={!canApply || unavailable || !presetChoices.length} onClick={() => void apply(presetChoices)}>{unavailable ? t('skin.panel.apply.needFull', '需要完整资源包') : presetComplete ? t('skin.panel.apply.reapply', '重新应用') : t('skin.panel.apply.select', '选定')}</button>
                    : <button className={styles.apply} disabled={!canApply || unavailable || !target || !currentSkin} onClick={() => void apply([{ unitId: target!.unitId, skinId: currentSkin!.id, changes: currentSkin!.config }])}>
                      {unavailable ? t('skin.panel.apply.needFull', '需要完整资源包') : t('skin.panel.apply.select', '选定')}
                    </button>}
                </div>
                {!isWarband && <div className={styles.choiceMeta}>
                  <span className={styles.skinCount}>{target ? `${Math.max(0, skins.findIndex(item => item.id === currentSkin?.id) + 1)} / ${skins.length} · ${unitLabel(target.unitId, target.name)}` : ''}</span>
                  {target && <button className={styles.addCustom} onClick={() => { playSmall(); setEditorOpen(true); }}>
                    <span aria-hidden="true">＋</span> {t('skin.panel.addCustom', '添加自定义皮肤')}
                  </button>}
                </div>}
              </section>
            </>}
            <div className={styles.secondaryActions}>
              <button className={styles.toggle} onClick={() => message.info(isWarband
                ? t('skin.panel.help.warband', '通过左右箭头切换战团预设，右侧显示战团概览图；选定后批量应用到对应单位与建筑。')
                : t('skin.panel.help.single', '选择对象与皮肤后点击“选定”；按住右侧模型可旋转。SD / HD / DE 请在首页切换。'))}>{t('skin.panel.help', '操作说明')}</button>
            </div>
          </main>
          <aside className={styles.showcase} style={{ '--team-glow': race.glow } as React.CSSProperties} aria-label={isWarband ? t('skin.panel.preview.warbandAria', '战团预览') : t('skin.panel.preview.modelAria', '模型预览')}>
            <div className={styles.halo} />
            {isWarband ? <div className={styles.warbandPreview}>
              {currentPreset ? <img key={currentPreset.id} src={asset(currentPreset.preview)} alt={t('skin.panel.preview.warbandAlt', '{{name}}战团预览').replace(/\{\{name\}\}/g, previewTitle || '')} />
                : <span>{t('skin.panel.choice.noWarbands', '此画质暂无战团预设')}</span>}
            </div> : !isRetro ? <div className={styles.model}>
              <ModelPreview key={`${artSet}:${raceId}:${category}:${unitMode}:${target?.unitId || currentPreset?.id}:${previewTitle}`}
                modelPath={previewModel} artSet={artSet} teamColor={race.teamColor}
                alt={previewTitle || t('skin.panel.preview.pickSkin', '选择皮肤')} enabled={!loading && !unavailable} paused={editorOpen}
                transparent viewDistance={category === 'building' ? 1.25 : 1} />
            </div> : <div className={styles.retroPreview}>{t('skin.panel.retro.preview', '怀旧涂装是单位与建筑的整体预设')}</div>}
            {!isRetro && (!isWarband || currentPreset) && <div className={styles.showcaseHint}>{isWarband ? `${previewTitle} · ${t('skin.panel.choice.warbandCount', '{{count}} 个单位与建筑').replace(/\{\{count\}\}/g, String(presetChoices.length))}` : t('skin.panel.preview.hint', '按住模型拖动旋转 · 默认 45°')}</div>}
          </aside>
        </div>
      </div>
    </OverlayModal>
    {target && editorOpen && <CustomSkinEditor open={editorOpen} artSet={artSet} targetId={target.unitId} targetName={unitLabel(target.unitId, target.name)}
      category={category} race={raceId} onClose={() => setEditorOpen(false)}
      onCreated={item => { setCustom(previous => [...previous, item]); setPreviewId(item.id); }} />}
  </>;
};
