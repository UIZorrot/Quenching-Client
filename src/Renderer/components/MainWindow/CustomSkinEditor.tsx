import React, { useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { skinTargets } from '../../assets/data/skin-panel-catalog';
import * as styles from './CustomSkinEditor.module.less';

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

const imageExtensions = ['blp', 'dds', 'tga', 'png', 'jpg'];
const pick = (title: string) => window.electronAPI.selectFile({ title, filters: [{ name: '图像文件', extensions: imageExtensions }] });
const fileName = (value: string) => value.split(/[\\/]/).pop() || value;
const raceName: Record<string, string> = { hum: '人类', orc: '兽人', ud: '不死族', ne: '暗夜精灵', neutral: '中立' };

export const CustomSkinEditor: React.FC<Props> = ({ open, targetId, targetName, category, artSet, race, onClose, onCreated }) => {
  const [source, setSource] = useState<SkinSource>('game-paths');
  const [name, setName] = useState('');
  const [modelPath, setModelPath] = useState('');
  const [iconPath, setIconPath] = useState('');
  const [disabledIconPath, setDisabledIconPath] = useState('');
  const [unitSound, setUnitSound] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [inspecting, setInspecting] = useState(false);
  const [inspected, setInspected] = useState(false);
  const [inspectionError, setInspectionError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSource('game-paths');
    setName(''); setModelPath(''); setIconPath(''); setDisabledIconPath(''); setUnitSound('');
    setReferences([]); setBindings({}); setInspected(false); setInspectionError(''); setInspecting(false);
  }, [open, targetId, artSet]);

  const chooseModel = async () => {
    const value = await window.electronAPI.selectModelFile();
    if (!value) return;
    setModelPath(value);
    setReferences([]); setBindings({}); setInspected(false); setInspectionError(''); setInspecting(true);
    try {
      const inspection = await window.electronAPI.inspectCustomSkinModel(value);
      setReferences(inspection.references);
      setBindings(Object.fromEntries(inspection.siblingCandidates.map(candidate =>
        [inspection.references.find(ref => ref.toLowerCase().endsWith(fileName(candidate).toLowerCase())) || '', candidate]
      ).filter(([key]) => key)));
      setInspected(true);
    } catch (error: any) {
      const detail = error?.message || '无法分析模型';
      setInspectionError(detail);
      message.error(detail);
    } finally {
      setInspecting(false);
    }
  };

  const chooseImage = async (setter: React.Dispatch<React.SetStateAction<string>>, title: string) => {
    const value = await pick(title);
    if (value) setter(value);
  };

  const submit = async () => {
    if (!name.trim() || (source === 'external' && !modelPath.trim())) {
      message.warning(source === 'external' ? '请填写皮肤名称并选择外部模型' : '请填写皮肤名称');
      return;
    }
    if (source === 'external' && (!iconPath || !disabledIconPath)) {
      message.warning('外部皮肤必须配置 BTN 和 DISBTN 图标');
      return;
    }
    if (source === 'external' && (inspecting || !inspected)) {
      message.warning('请等待模型贴图检查完成，或重新选择模型');
      return;
    }
    const unresolved = references.filter(reference => !bindings[reference]);
    if (source === 'external' && unresolved.length > 0) {
      message.warning(`请为 ${unresolved[0]} 关联贴图`);
      return;
    }
    setSaving(true);
    try {
      const skin = await window.electronAPI.createCustomSkin({ targetId, category, artSet, race, name: name.trim(), source,
        modelPath, iconPath, disabledIconPath, unitSound: source === 'external' ? '' : unitSound, textureBindings: bindings });
      onCreated(skin);
      message.success(`已保存到 ${artSet.toUpperCase()} 皮肤库，点击皮肤卡片即可应用`);
      onClose();
    } catch (error: any) {
      message.error(error?.message || '创建自定义皮肤失败');
    } finally {
      setSaving(false);
    }
  };

  const targetIcon = skinTargets(race || '', category).find(target => target.unitId === targetId)?.icon;
  const linkedCount = references.filter(reference => !!bindings[reference]).length;
  const missingCount = references.length - linkedCount;
  const isExternal = source === 'external';

  return <Modal open={open} onCancel={saving ? undefined : onClose} footer={null} title={null} closable={false}
    keyboard={!saving} maskClosable={!saving} centered width={960} zIndex={4000} className={styles.dialog}
    styles={{ mask: { background: 'rgba(0,0,0,.78)' } }}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>CUSTOM SKIN · {artSet.toUpperCase()}</span>
          <h2>添加自定义皮肤</h2>
          <p>为 {targetName} 创建一个仅属于 {artSet.toUpperCase()} 画质版本的涂装</p>
        </div>
        <button type="button" className={styles.close} aria-label="关闭添加皮肤" onClick={onClose} disabled={saving}>×</button>
      </header>

      <div className={styles.body}>
        <main className={styles.form}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span>01</span><div><h3>皮肤名称</h3><p>这会显示在该单位的涂装列表中</p></div></div>
            <label className={styles.field}>
              <span>名称 <em>必填</em></span>
              <input value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder="例如：联盟精锐步兵" autoFocus />
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}><span>02</span><div><h3>选择资源来源</h3><p>两种方式最终都会保存到当前版本的皮肤库</p></div></div>
            <div className={styles.sourceChoices} role="group" aria-label="资源来源">
              <button type="button" aria-pressed={!isExternal} className={`${styles.sourceChoice} ${!isExternal ? styles.sourceActive : ''}`}
                onClick={() => setSource('game-paths')}>
                <span className={styles.sourceGlyph}>⌘</span><strong>游戏内路径</strong><small>直接引用魔兽资源，未填写的字段沿用原单位</small>
              </button>
              <button type="button" aria-pressed={isExternal} className={`${styles.sourceChoice} ${isExternal ? styles.sourceActive : ''}`}
                onClick={() => setSource('external')}>
                <span className={styles.sourceGlyph}>＋</span><strong>外部资源</strong><small>导入模型与图标，并引导完成贴图关联</small>
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}><span>03</span><div><h3>{isExternal ? '选择导入文件' : '填写游戏内路径'}</h3>
              <p>{isExternal ? '模型会自动扫描贴图；声音始终沿用原单位' : '留空的字段沿用此画质版本的原单位，不继承上一款皮肤'}</p></div></div>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span>{isExternal ? '模型文件' : `${artSet.toUpperCase()} 模型路径`} <em>{isExternal ? '必填' : '可缺省'}</em></span>
                <div className={styles.inputAction}>
                  <input value={modelPath} readOnly={isExternal} onChange={event => setModelPath(event.target.value)}
                    placeholder={isExternal ? '选择 .mdx 或 .mdl 模型' : '例如 Units\\Human\\Footman\\Footman'} title={modelPath} />
                  {isExternal && <button type="button" onClick={() => void chooseModel()} disabled={inspecting}>{inspecting ? '分析中…' : '选择模型'}</button>}
                </div>
              </label>
              <label className={styles.field}>
                <span>BTN 图标 <em>{isExternal ? '必填' : '可缺省'}</em></span>
                <div className={styles.inputAction}>
                  <input value={iconPath} readOnly={isExternal} onChange={event => setIconPath(event.target.value)}
                    placeholder={isExternal ? '选择有效状态图标' : '例如 ReplaceableTextures\\CommandButtons\\BTNFootman.blp'} title={iconPath} />
                  {isExternal && <button type="button" onClick={() => void chooseImage(setIconPath, '选择 BTN 图标')}>选择图标</button>}
                </div>
              </label>
              {isExternal ? <label className={styles.field}>
                <span>DISBTN 图标 <em>必填</em></span>
                <div className={styles.inputAction}>
                  <input value={disabledIconPath} readOnly placeholder="选择不可用状态图标" title={disabledIconPath} />
                  <button type="button" onClick={() => void chooseImage(setDisabledIconPath, '选择 DISBTN 图标')}>选择图标</button>
                </div>
              </label> : <label className={styles.field}>
                <span>声音路径或名称 <em>可缺省</em></span>
                <input value={unitSound} onChange={event => setUnitSound(event.target.value)} placeholder="留空则沿用原单位声音" />
              </label>}
            </div>
          </section>
        </main>

        <aside className={styles.inspector}>
          <span className={styles.inspectorKicker}>导入概览</span>
          <div className={styles.targetSummary}>
            <img src={targetIcon ? `./assets/quenching/${targetIcon}` : './assets/quenching/logo.png'} alt="" />
            <div><strong>{targetName}</strong><small>{raceName[race || ''] || '中立'} · {targetId} · {artSet.toUpperCase()}</small></div>
          </div>
          <div className={styles.summaryRule} />
          <h3>{isExternal ? '素材检查' : '继承规则'}</h3>
          {isExternal ? <>
            <div className={styles.checkList}>
              <div><span className={name.trim() ? styles.checkDone : ''}>{name.trim() ? '✓' : '1'}</span>皮肤名称</div>
              <div><span className={modelPath && inspected ? styles.checkDone : ''}>{modelPath && inspected ? '✓' : '2'}</span>模型及贴图扫描</div>
              <div><span className={iconPath ? styles.checkDone : ''}>{iconPath ? '✓' : '3'}</span>BTN 图标</div>
              <div><span className={disabledIconPath ? styles.checkDone : ''}>{disabledIconPath ? '✓' : '4'}</span>DISBTN 图标</div>
            </div>
            {inspectionError && <p className={styles.inspectionError}>{inspectionError}。请重新选择模型。</p>}
            {modelPath && inspected && <div className={styles.textureBox}>
              <strong>贴图关联</strong>
              <small>{references.length ? `已关联 ${linkedCount} / ${references.length}${missingCount ? ` · 仍需 ${missingCount} 项` : ' · 已完成'}` : '未发现需要额外关联的贴图'}</small>
              {references.map(reference => <div className={styles.textureRow} key={reference}>
                <span title={reference}><i className={bindings[reference] ? styles.bound : ''} />{fileName(reference)}</span>
                <button type="button" onClick={async () => { const value = await pick(`关联 ${reference}`); if (value) setBindings(previous => ({ ...previous, [reference]: value })); }}>
                  {bindings[reference] ? '更换' : '关联'}
                </button>
              </div>)}
            </div>}
            {!modelPath && <p className={styles.tip}>选择模型后会自动查找同目录贴图。未找到的项目会逐项列在这里，可直接点击“关联”完成。</p>}
          </> : <div className={styles.inheritance}>
            <div><span>模型</span><strong>{modelPath ? fileName(modelPath) : '沿用原单位'}</strong></div>
            <div><span>图标</span><strong>{iconPath ? fileName(iconPath) : '沿用原单位'}</strong></div>
            <div><span>声音</span><strong>{unitSound ? fileName(unitSound) : '沿用原单位'}</strong></div>
            <p>这里引用游戏内资源，不会把模型或声音打进淬火包体。</p>
          </div>}
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>{isExternal ? '外部资源保存后会整理到魔兽目录的 cos/custom' : '仅保存到当前画质版本，不影响 SD / HD / DE 的其他版本'}</span>
        <div><button type="button" className={styles.cancel} onClick={onClose} disabled={saving}>取消</button>
          <button type="button" className={styles.save} onClick={() => void submit()} disabled={saving || inspecting}>{saving ? '正在保存…' : '保存到皮肤库'}</button></div>
      </footer>
    </div>
  </Modal>;
};
