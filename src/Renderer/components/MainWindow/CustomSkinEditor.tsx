import React, { useEffect, useRef, useState } from 'react';
import { Modal, message } from 'antd';
import { skinTargets } from '../../assets/data/skin-panel-catalog';
import * as styles from './CustomSkinEditor.module.less';
import { useTranslation } from '../../utils/i18n';

type Category = 'unit' | 'building' | 'hero';
type SkinSource = 'game-paths' | 'external';

interface Props {
  open: boolean;
  targetId: string;
  targetName: string;
  category: Category;
  artSet: 'sd' | 'hd' | 'de';
  race?: string;
  onClose: () => void;
  onCreated: (skin: CustomSkinRecord) => void;
}

const imageExtensions = ['blp', 'dds', 'tga', 'tif', 'png', 'jpg'];
const fileName = (value: string) => value.split(/[\\/]/).pop() || value;

export const CustomSkinEditor: React.FC<Props> = ({ open, targetId, targetName, category, artSet, race, onClose, onCreated }) => {
  const { t } = useTranslation();
  const pick = (title: string) => window.electronAPI.selectFile({ title, filters: [{ name: t('skin.editor.imageFiles'), extensions: imageExtensions }] });
  const inspectionRequest = useRef(0);
  const manualBindings = useRef<Record<string, string>>({});
  const [source, setSource] = useState<SkinSource>('game-paths');
  const [name, setName] = useState('');
  const [modelPath, setModelPath] = useState('');
  const [portraitPath, setPortraitPath] = useState('');
  const [iconPath, setIconPath] = useState('');
  const [disabledIconPath, setDisabledIconPath] = useState('');
  const [unitSound, setUnitSound] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [gameReferences, setGameReferences] = useState<string[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [inspected, setInspected] = useState(false);
  const [inspectionError, setInspectionError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    inspectionRequest.current++;
    if (!open) return;
    manualBindings.current = {};
    setSource('game-paths');
    setName(''); setModelPath(''); setPortraitPath(''); setIconPath(''); setDisabledIconPath(''); setUnitSound('');
    setReferences([]); setBindings({}); setGameReferences([]); setInspected(false); setInspectionError(''); setInspecting(false);
  }, [open, targetId, artSet]);

  const searchTextures = async (value = modelPath, portrait = portraitPath) => {
    if (!value) return;
    const request = ++inspectionRequest.current;
    setInspected(false); setInspectionError(''); setInspecting(true);
    try {
      const inspection = await window.electronAPI.inspectCustomSkinModel(value, artSet, portrait || undefined);
      if (request !== inspectionRequest.current) return;
      setReferences(inspection.references);
      setPortraitPath(inspection.portraitPath || '');
      // Re-scans refresh automatic matches but never discard a user's explicit choice.
      setBindings({ ...inspection.textureBindings, ...manualBindings.current });
      setGameReferences(inspection.gameReferences);
      setInspected(true);
    } catch (error: any) {
      if (request !== inspectionRequest.current) return;
      const detail = error?.message || t('skin.editor.inspectFailed');
      setInspectionError(detail);
      message.error(detail);
    } finally {
      if (request === inspectionRequest.current) setInspecting(false);
    }
  };

  const chooseModel = async () => {
    const request = inspectionRequest.current;
    const value = await window.electronAPI.selectModelFile();
    if (!value || request !== inspectionRequest.current) return;
    manualBindings.current = {};
    setModelPath(value);
    setPortraitPath('');
    setReferences([]); setBindings({}); setGameReferences([]);
    await searchTextures(value, '');
  };

  const choosePortrait = async () => {
    const request = inspectionRequest.current;
    const value = await window.electronAPI.selectFile({ title: t('skin.editor.portraitSelect'),
      filters: [{ name: t('skin.editor.modelFile'), extensions: ['mdx', 'mdl'] }] });
    if (!value || request !== inspectionRequest.current) return;
    setPortraitPath(value);
    await searchTextures(modelPath, value);
  };

  const chooseImage = async (setter: React.Dispatch<React.SetStateAction<string>>, title: string) => {
    const value = await pick(title);
    if (value) setter(value);
  };
  const changeSource = (next: SkinSource) => {
    if (next === source) return;
    inspectionRequest.current++;
    manualBindings.current = {};
    setSource(next); setModelPath(''); setPortraitPath(''); setIconPath(''); setDisabledIconPath(''); setUnitSound('');
    setReferences([]); setBindings({}); setGameReferences([]); setInspected(false); setInspectionError(''); setInspecting(false);
  };

  const submit = async () => {
    if (!name.trim() || (source === 'external' && !modelPath.trim())) {
      message.warning(t(source === 'external' ? 'skin.editor.requireNameModel' : 'skin.editor.requireName'));
      return;
    }
    if (source === 'external' && !!iconPath !== !!disabledIconPath) {
      message.warning(t('skin.editor.requireIcons'));
      return;
    }
    if (source === 'external' && (inspecting || !inspected)) {
      message.warning(t('skin.editor.waitInspection'));
      return;
    }
    const unresolved = references.filter(reference => !bindings[reference] && !gameReferences.includes(reference));
    if (source === 'external' && unresolved.length > 0) {
      message.warning(t('skin.editor.requireTexture', { path: unresolved[0] }));
      return;
    }
    setSaving(true);
    try {
      const skin = await window.electronAPI.createCustomSkin({ targetId, category, artSet, race, name: name.trim(), source,
        modelPath, portraitPath, iconPath, disabledIconPath, unitSound: source === 'external' ? '' : unitSound, textureBindings: bindings });
      onCreated(skin);
      message.success(t('skin.editor.saved', { mode: artSet.toUpperCase() }));
      if (skin.portraitAssociation?.source === 'fallback') message.warning(t('skin.editor.portraitFallback', { path: skin.portraitAssociation.path || '' }));
      if (skin.portraitAssociation?.source === 'unavailable') message.warning(t('skin.editor.portraitUnavailable'));
      onClose();
    } catch (error: any) {
      message.error(error?.message || t('skin.editor.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const targetIcon = skinTargets(race || '', category).find(target => target.unitId === targetId)?.icon;
  const linkedCount = references.filter(reference => !!bindings[reference] || gameReferences.includes(reference)).length;
  const missingCount = references.length - linkedCount;
  const isExternal = source === 'external';
  const originalIcons = !iconPath && !disabledIconPath;

  return <Modal open={open} onCancel={saving ? undefined : onClose} footer={null} title={null} closable={false}
    keyboard={!saving} maskClosable={!saving} centered width={960} zIndex={4000} className={styles.dialog}
    styles={{ mask: { background: 'rgba(0,0,0,.78)' } }}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{t('skin.custom')} · {artSet.toUpperCase()}</span>
          <h2>{t('skin.editor.title')}</h2>
          <p>{t('skin.editor.subtitle', { name: targetName, mode: artSet.toUpperCase() })}</p>
        </div>
        <button type="button" className={styles.close} aria-label={t('skin.editor.close')} onClick={onClose} disabled={saving}>×</button>
      </header>

      <div className={styles.body}>
        <main className={styles.form}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span>01</span><div><h3>{t('skin.editor.skinName')}</h3><p>{t('skin.editor.nameHint')}</p></div></div>
            <label className={styles.field}>
              <span>{t('skin.editor.name')} <em>{t('skin.editor.required')}</em></span>
              <input value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder={t('skin.editor.nameExample')} autoFocus />
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}><span>02</span><div><h3>{t('skin.editor.chooseSource')}</h3><p>{t('skin.editor.sourceHint')}</p></div></div>
            <div className={styles.sourceChoices} role="group" aria-label={t('skin.editor.resourceSource')}>
              <button type="button" aria-pressed={!isExternal} className={`${styles.sourceChoice} ${!isExternal ? styles.sourceActive : ''}`}
                onClick={() => changeSource('game-paths')}>
                <span className={styles.sourceGlyph}>⌘</span><strong>{t('skin.editor.gamePaths')}</strong><small>{t('skin.editor.gamePathsHint')}</small>
              </button>
              <button type="button" aria-pressed={isExternal} className={`${styles.sourceChoice} ${isExternal ? styles.sourceActive : ''}`}
                onClick={() => changeSource('external')}>
                <span className={styles.sourceGlyph}>＋</span><strong>{t('skin.editor.external')}</strong><small>{t('skin.editor.externalHint')}</small>
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}><span>03</span><div><h3>{t(isExternal ? 'skin.editor.chooseFiles' : 'skin.editor.enterPaths')}</h3>
              <p>{t(isExternal ? 'skin.editor.externalFilesHint' : 'skin.editor.gameFilesHint')}</p></div></div>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span>{isExternal ? t('skin.editor.modelFile') : t('skin.editor.modelPath', { mode: artSet.toUpperCase() })} <em>{t(isExternal ? 'skin.editor.required' : 'skin.editor.optional')}</em></span>
                <div className={styles.inputAction}>
                  <input value={modelPath} readOnly={isExternal} onChange={event => setModelPath(event.target.value)}
                    placeholder={isExternal ? t('skin.editor.modelHint') : t('skin.editor.pathExample', { path: 'Units\\Human\\Footman\\Footman' })} title={modelPath} />
                  {isExternal && <button type="button" onClick={() => void chooseModel()} disabled={inspecting}>{t(inspecting ? 'skin.editor.inspecting' : 'skin.model.select')}</button>}
                </div>
              </label>
              <label className={styles.field}>
                <span>{t('skin.editor.portraitPath')} <em>{t('skin.editor.optional')}</em></span>
                <div className={styles.inputAction}>
                  <input value={portraitPath} readOnly={isExternal} onChange={event => setPortraitPath(event.target.value)}
                    placeholder={t('skin.editor.portraitHint')} title={portraitPath} />
                  {isExternal && <button type="button" onClick={() => void choosePortrait()} disabled={!modelPath || inspecting}>{t('skin.editor.portraitSelect')}</button>}
                </div>
                {isExternal && portraitPath && <button type="button" className={styles.portraitReset} onClick={() => { setPortraitPath(''); void searchTextures(modelPath, ''); }} disabled={inspecting}>{t('skin.editor.autoPortrait')}</button>}
              </label>
              <label className={styles.field}>
                <span>{t('skin.editor.btnIcon')} <em>{t('skin.editor.optional')}</em></span>
                <div className={styles.inputAction}>
                  <input value={iconPath} readOnly={isExternal} onChange={event => setIconPath(event.target.value)}
                    placeholder={isExternal ? t('skin.editor.btnHint') : t('skin.editor.pathExample', { path: 'ReplaceableTextures\\CommandButtons\\BTNFootman.blp' })} title={iconPath} />
                  {isExternal && <button type="button" onClick={() => void chooseImage(setIconPath, t('skin.editor.pickBTN'))}>{t('skin.editor.pickIcon')}</button>}
                </div>
              </label>
              {isExternal ? <label className={styles.field}>
                <span>{t('skin.editor.disbtnIcon')} <em>{t('skin.editor.optional')}</em></span>
                <div className={styles.inputAction}>
                  <input value={disabledIconPath} readOnly placeholder={t('skin.editor.disbtnHint')} title={disabledIconPath} />
                  <button type="button" onClick={() => void chooseImage(setDisabledIconPath, t('skin.editor.pickDISBTN'))}>{t('skin.editor.pickIcon')}</button>
                </div>
              </label> : <label className={styles.field}>
                <span>{t('skin.editor.soundPath')} <em>{t('skin.editor.optional')}</em></span>
                <input value={unitSound} onChange={event => setUnitSound(event.target.value)} placeholder={t('skin.editor.soundHint')} />
              </label>}
              {isExternal && !originalIcons && <button type="button" className={styles.portraitReset}
                onClick={() => { setIconPath(''); setDisabledIconPath(''); }} disabled={saving}>{t('skin.editor.originalUnit')}</button>}
            </div>
          </section>
        </main>

        <aside className={styles.inspector}>
          <span className={styles.inspectorKicker}>{t('skin.editor.overview')}</span>
          <div className={styles.targetSummary}>
            <img src={targetIcon ? `./assets/quenching/${targetIcon}` : './assets/quenching/logo.png'} alt="" />
            <div><strong>{targetName}</strong><small>{t(`skin.race.${race || 'neutral'}`)} · {targetId} · {artSet.toUpperCase()}</small></div>
          </div>
          <div className={styles.summaryRule} />
          <h3>{t(isExternal ? 'skin.editor.assetCheck' : 'skin.editor.inheritance')}</h3>
          {isExternal ? <>
            <div className={styles.checkList}>
              <div><span className={name.trim() ? styles.checkDone : ''}>{name.trim() ? '✓' : '1'}</span>{t('skin.editor.skinName')}</div>
              <div><span className={modelPath && inspected ? styles.checkDone : ''}>{modelPath && inspected ? '✓' : '2'}</span>{t('skin.editor.modelScan')}</div>
              <div><span className={originalIcons || iconPath ? styles.checkDone : ''}>{originalIcons || iconPath ? '✓' : '3'}</span>{t('skin.editor.btnIcon')} · {t(originalIcons ? 'skin.editor.originalUnit' : 'skin.editor.optional')}</div>
              <div><span className={originalIcons || disabledIconPath ? styles.checkDone : ''}>{originalIcons || disabledIconPath ? '✓' : '4'}</span>{t('skin.editor.disbtnIcon')} · {t(originalIcons ? 'skin.editor.originalUnit' : 'skin.editor.optional')}</div>
            </div>
            <button type="button" className={styles.autoSearch} onClick={() => void searchTextures()}
              disabled={!modelPath || inspecting || saving}>{t(inspecting ? 'skin.import.searching' : 'skin.import.autoSearch')}</button>
            <p className={styles.searchHint}>{t('skin.import.searchHint')}</p>
            {inspectionError && <p className={styles.inspectionError}>{inspectionError}</p>}
            {modelPath && inspected && <div className={styles.textureBox}>
              <strong>{t('skin.editor.textureLinks')}</strong>
              <small>{references.length ? `${t('skin.editor.linkCount', { linked: linkedCount, total: references.length })} · ${missingCount ? t('skin.editor.missingCount', { count: missingCount }) : t('skin.editor.complete')}` : t('skin.editor.noTextures')}</small>
              {references.map(reference => <div className={styles.textureRow} key={reference}>
                <span title={reference}><i className={bindings[reference] || gameReferences.includes(reference) ? styles.bound : ''} />{fileName(reference)}</span>
                {gameReferences.includes(reference) && !bindings[reference]
                  ? <small className={styles.gameTexture}>{t('skin.import.gameTexture')}</small>
                  : <button type="button" disabled={saving || inspecting} onClick={async () => {
                    const request = inspectionRequest.current;
                    const value = await pick(t('skin.editor.linkTexture', { path: reference }));
                    if (value && request === inspectionRequest.current) {
                      manualBindings.current[reference] = value;
                      setBindings(previous => ({ ...previous, [reference]: value }));
                    }
                  }}>{t(bindings[reference] ? 'skin.editor.replace' : 'skin.editor.link')}</button>}
              </div>)}
            </div>}
            {!modelPath && <p className={styles.tip}>{t('skin.editor.searchTip')}</p>}
          </> : <div className={styles.inheritance}>
            <div><span>{t('skin.editor.model')}</span><strong>{modelPath ? fileName(modelPath) : t('skin.editor.originalUnit')}</strong></div>
            <div><span>{t('skin.editor.portraitPath')}</span><strong>{portraitPath ? fileName(portraitPath) : t('skin.editor.autoPortrait')}</strong></div>
            <div><span>{t('skin.editor.icon')}</span><strong>{iconPath ? fileName(iconPath) : t('skin.editor.originalUnit')}</strong></div>
            <div><span>{t('skin.editor.sound')}</span><strong>{unitSound ? fileName(unitSound) : t('skin.editor.originalUnit')}</strong></div>
            <p>{t('skin.editor.referenceHint')}</p>
          </div>}
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>{t(isExternal ? 'skin.editor.externalFooter' : 'skin.editor.gameFooter')}</span>
        <div><button type="button" className={styles.cancel} onClick={onClose} disabled={saving}>{t('btn.cancel')}</button>
          <button type="button" className={styles.save} onClick={() => void submit()} disabled={saving || inspecting}>{t(saving ? 'skin.editor.saving' : 'skin.editor.save')}</button></div>
      </footer>
    </div>
  </Modal>;
};
