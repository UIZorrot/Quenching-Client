import { reaxel, createReaxable } from 'reaxes';
import { useEffect, useState } from 'react';
import { reaction } from 'mobx';
import { reaxel_I18n } from './i18n';

// 新闻项目接口
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  version?: string;
  type: 'update' | 'announcement' | 'feature' | 'bugfix';
  image?: string;
  author?: string;
  tags?: string[];
}

// 新闻分类
export interface NewsCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const defaultNews: NewsItem[] = [];

export const newsLanguage = (language: string): 'cn' | 'en' => language === 'zh-CN' ? 'cn' : 'en';

// 新闻分类
const newsCategories: NewsCategory[] = [
  { id: 'all', name: '全部', description: '所有新闻', icon: '📰' },
  { id: 'update', name: '版本更新', description: '版本更新和补丁', icon: '🔄' },
  { id: 'feature', name: '新功能', description: '新功能介绍', icon: '✨' },
  { id: 'announcement', name: '公告', description: '重要公告', icon: '📢' },
  { id: 'bugfix', name: '修复', description: 'Bug修复', icon: '🔧' }
];

// 新闻状态管理
export const reaxel_News = reaxel(() => {
  const { store, setState } = createReaxable({
    news: defaultNews,
    categories: newsCategories,
    selectedCategory: 'all' as string,
    isLoading: false,
    lastUpdated: new Date().toISOString(),
    errorMessage: '' as string,
    language: null as 'cn' | 'en' | null
  });
  let requestId = 0;

  // 从远程API获取新闻（支持热加载）
  const fetchNews = async (forceRefresh = false, lang: 'cn' | 'en' = newsLanguage(reaxel_I18n().store.currentLanguage)) => {
    if (store.isLoading && store.language === lang && !forceRefresh) return;
    const request = ++requestId;

    setState({ isLoading: true, language: lang, errorMessage: '', ...(store.language !== lang ? { news: [] } : {}) });

    try {
      const remoteNews = await window.electronAPI?.fetchNews(lang);
      if (request !== requestId) return;
      setState({ news: remoteNews || [], lastUpdated: new Date().toISOString(), errorMessage: '' });
    } catch (error) {
      console.error('[reaxel_News] Error fetching news:', error);
      if (request !== requestId) return;
      // Let NewsPanel render its translated empty/error state, not a fabricated Chinese article.
      setState({ news: [], errorMessage: error instanceof Error ? error.message : String(error) });
    } finally {
      if (request === requestId) setState({ isLoading: false });
    }
  };

  // 设置新闻分类过滤
  const setCategory = (categoryId: string) => {
    setState({ selectedCategory: categoryId });
  };

  // 获取过滤后的新闻
  const getFilteredNews = () => {
    if (store.selectedCategory === 'all') {
      return store.news;
    }
    return store.news.filter(item => item.type === store.selectedCategory);
  };

  // 获取特定新闻
  const getNewsById = (id: string) => {
    return store.news.find(item => item.id === id);
  };

  // 搜索新闻
  const searchNews = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return store.news.filter(item =>
      item.title.toLowerCase().includes(lowercaseQuery) ||
      item.content.toLowerCase().includes(lowercaseQuery) ||
      item.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  };

  // 初始化时获取新闻
  fetchNews();

  // 设置定时刷新（每5分钟检查一次）
  setInterval(() => {
    fetchNews();
  }, 5 * 60 * 1000);

  const statics = {};

  return Object.assign(() => ({
    store,
    fetchNews,
    setCategory,
    getFilteredNews,
    getNewsById,
    searchNews
  }), {
    store,
    setState,
    fetchNews,
    setCategory,
    getFilteredNews,
    getNewsById,
    searchNews,
    statics
  });
});

// React Hook for news
export const useNews = () => {
  // 获取reaxel实例
  const news = reaxel_News();
  const [, setRevision] = useState(0);
  useEffect(() => reaction(
    () => [news.store.news, news.store.isLoading, news.store.lastUpdated, news.store.errorMessage, news.store.selectedCategory],
    () => setRevision(revision => revision + 1),
    { fireImmediately: true }
  ), [news.store]);

  return {
    news: news.store.news,
    categories: news.store.categories,
    selectedCategory: news.store.selectedCategory,
    isLoading: news.store.isLoading,
    lastUpdated: news.store.lastUpdated,
    filteredNews: news.getFilteredNews(),
    fetchNews: news.fetchNews,
    setCategory: news.setCategory,
    getNewsById: news.getNewsById,
    searchNews: news.searchNews,
    errorMessage: news.store.errorMessage
  };
};
