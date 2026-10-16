import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';

const fixture = { calls: [] as string[], holdChinese: false, chinese: [] as (() => void)[], mode: 'normal', refresh: () => {} };
(window as any).newsLanguageFixture = fixture;
localStorage.setItem('quenching-language', new URLSearchParams(location.search).get('lang') || 'fr-FR');
const interval = window.setInterval.bind(window);
window.setInterval = ((callback: () => void, delay: number, ...args: any[]) => {
  if (delay === 5 * 60 * 1000) fixture.refresh = callback;
  return interval(callback, delay, ...args);
}) as any;
window.electronAPI = {
  fetchNews: async (lang: string) => {
    fixture.calls.push(lang);
    if (lang === 'cn' && fixture.holdChinese) await new Promise<void>(resolve => fixture.chinese.push(resolve));
    if (fixture.mode === 'empty') return [];
    if (fixture.mode === 'failed') throw new Error('Offline verification');
    return [{ id: lang, title: lang === 'cn' ? '中文更新日志' : 'English release notes',
      content: lang === 'cn' ? '中文内容' : 'English content from newsen.md', date: '2026-10-03', type: 'update' }];
  },
  setConfig: async () => true,
} as any;
const { reaxel_I18n } = await import('../../src/Renderer/utils/i18n');
(window as any).newsLanguageState = reaxel_I18n();
const { NewsPanel } = await import('../../src/Renderer/components/MainWindow/NewsPanel');
createRoot(document.getElementById('root')!).render(<ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}><NewsPanel isExpanded onToggle={() => {}} /></ConfigProvider>);
