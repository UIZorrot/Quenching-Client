import { reaxel, createReaxable } from 'reaxes';

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

const newsUrls: Record<'cn' | 'en', string> = {
  cn: 'https://www.tianxiazhengyi.net/newscn.md',
  en: 'https://www.tianxiazhengyi.net/newsen.md'
};

const parseMarkdown = (md: string): NewsItem[] => {
  const items: NewsItem[] = [];
  if (!md) return items;
  const cleanMd = md.replace(/^\u0000?/, '').replace(/^\uFEFF/, '');
  const h1Match = cleanMd.match(/(?:^|\r?\n)#\s+([^\r\n]+)/);
  const pageTitle = h1Match ? h1Match[1].trim() : '';

  // 移除H1行
  const contentBody = cleanMd.replace(/(?:^|\r?\n)#\s+[^\r\n]+/, '');
  const sections = contentBody.split(/(?:\r?\n|^)##\s+(?!#)/);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    const lines = section.split(/\r?\n/);
    const firstLine = lines[0].trim();
    const dateMatch = firstLine.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;

    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
    let title = pageTitle || firstLine.replace(date, '').replace(/[#\[\]\(\)]/g, '').trim();
    const contentLines = lines.slice(1);
    const h4Index = contentLines.findIndex(l => l.trim().startsWith('####'));
    const h3Index = contentLines.findIndex(l => l.trim().startsWith('###'));
    const useIndex = h4Index !== -1 ? h4Index : h3Index;
    let content = '';
    let sectionLabel: string | undefined;
    if (useIndex !== -1) {
      const headerLine = contentLines[useIndex];
      const headerTitle = headerLine.replace(/^####\s+/, '').replace(/^###\s+/, '').trim();
      sectionLabel = headerTitle || undefined;
      content = contentLines.slice(useIndex + 1).join('\n').trim();
    } else {
      content = contentLines.join('\n').trim();
    }
    if (!title) title = `更新公告 ${date}`;
    let type: NewsItem['type'] = 'update';

    items.push({ id: `news-${date}-${i}`, title, content, date, type, tags: sectionLabel ? [sectionLabel] : [] });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date));
};

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
    errorMessage: '' as string
  });

  // 从远程API获取新闻（支持热加载）
  const fetchNews = async (forceRefresh = false, lang: 'cn' | 'en' = 'cn') => {
    if (store.isLoading && !forceRefresh) return;

    setState({ isLoading: true });

    try {
      console.log(`[reaxel_News] Fetching news for ${lang}...`);
      const remoteNews = await window.electronAPI?.fetchNews(lang);
      if (remoteNews && remoteNews.length > 0) {
        console.log(`[reaxel_News] Successfully fetched ${remoteNews.length} news items from remote.`);
        setState({
          news: remoteNews,
          lastUpdated: new Date().toISOString(),
          errorMessage: ''
        });
      } else {
        console.warn('[reaxel_News] No news items returned from remote API');
        try {
          const url = newsUrls[lang];
          console.log(`[reaxel_News] Fallback fetching via renderer: ${url}`);
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const items = parseMarkdown(text);
          if (items.length > 0) {
            console.log(`[reaxel_News] Fallback fetch succeeded with ${items.length} items.`);
            setState({ news: items, lastUpdated: new Date().toISOString(), errorMessage: '' });
          } else {
            const placeholder: NewsItem = {
              id: `news-placeholder-${Date.now()}`,
              title: '暂无新闻',
              content: '暂未获取到远程新闻，可能是源格式变化或网络问题。稍后重试，或访问官网查看最新动态。',
              date: new Date().toISOString().split('T')[0],
              type: 'announcement',
              author: 'System'
            };
            setState({ news: [placeholder], errorMessage: '' });
          }
        } catch (e) {
          console.error('[reaxel_News] Fallback fetch failed:', e);
          const placeholder: NewsItem = {
            id: `news-placeholder-${Date.now()}`,
            title: '暂无新闻',
            content: '暂未获取到远程新闻，可能是网络策略（CSP）限制或网络异常。请稍后重试。',
            date: new Date().toISOString().split('T')[0],
            type: 'announcement',
            author: 'System'
          };
          setState({ news: [placeholder], errorMessage: '' });
        }
      }
    } catch (error) {
      console.error('[reaxel_News] Error fetching news:', error);
      const placeholder: NewsItem = {
        id: `news-placeholder-${Date.now()}`,
        title: '暂无新闻',
        content: '暂未获取到远程新闻，可能是网络策略（CSP）限制或网络异常。请稍后重试。',
        date: new Date().toISOString().split('T')[0],
        type: 'announcement',
        author: 'System'
      };
      setState({ news: [placeholder], errorMessage: '' });
    } finally {
      setState({ isLoading: false });
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
