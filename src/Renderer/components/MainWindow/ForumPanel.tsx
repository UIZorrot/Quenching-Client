import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { CloseOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { FORUM_URL } from '../../../shared/forum';
import { useTranslation } from '../../utils/i18n';

export const ForumPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const content = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open || !content.current) return;
    let disposed = false;
    const bounds = () => {
      const { x, y, width, height } = content.current!.getBoundingClientRect();
      return { x, y, width, height };
    };
    setFailed(false);
    setLoading(true);
    void window.electronAPI.showForum(bounds()).catch(() => {
      if (!disposed) setFailed(true);
    }).finally(() => { if (!disposed) setLoading(false); });
    const updateBounds = () => { void window.electronAPI.setForumBounds(bounds()).catch(() => {}); };
    const observer = new ResizeObserver(updateBounds);
    observer.observe(content.current);
    window.addEventListener('resize', updateBounds);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
      void window.electronAPI.hideForum().catch(() => {});
    };
  }, [open]);
  if (!open) return null;
  const reload = async () => {
    setLoading(true);
    setFailed(false);
    try {
      if (content.current) {
        const { x, y, width, height } = content.current.getBoundingClientRect();
        if (failed) await window.electronAPI.showForum({ x, y, width, height });
        else await window.electronAPI.reloadForum();
      }
    } catch { setFailed(true); }
    finally { setLoading(false); }
  };
  return (
    <section className="forum-panel" role="dialog" aria-modal="true" aria-label={t('forum.title')}>
      <header className="forum-panel-header">
        <div><strong>{t('forum.title')}</strong><small>qm.txzy.net</small></div>
        <div className="forum-panel-actions">
          <Button type="text" icon={<ReloadOutlined />} loading={loading} onClick={() => void reload()}>{t('forum.refresh')}</Button>
          <Button type="text" icon={<ExportOutlined />} onClick={() => void window.electronAPI.openExternal(FORUM_URL)}>{t('forum.openBrowser')}</Button>
          <Button type="text" icon={<CloseOutlined />} aria-label={t('forum.close')} onClick={onClose} />
        </div>
      </header>
      <div ref={content} className="forum-panel-content">
        <p>{failed ? t('forum.loadFailed') : t('forum.loading')}</p>
        {failed && <Button onClick={() => void reload()}>{t('forum.retry')}</Button>}
      </div>
    </section>
  );
};
