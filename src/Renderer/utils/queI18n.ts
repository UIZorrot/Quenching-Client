import React from 'react';

// 支持的语言列表 - 对应原版.que文件
export const SUPPORTED_LANGUAGES = {
  'zh-CN': { name: '中文', flag: '🇨🇳', queFiles: ['hc-trans.que', 'trans.que'] },
  'en-US': { name: 'English', flag: '🇺🇸', queFiles: ['hc-trans-en.que', 'trans-en.que'] },
  'fr-FR': { name: 'Français', flag: '🇫🇷', queFiles: ['hc-trans-fr.que', 'trans-fr.que'] },
  'pt-BR': { name: 'Português', flag: '🇧🇷', queFiles: ['hc-trans-pt.que', 'trans-pt.que'] },
  'ru-RU': { name: 'Русский', flag: '🇷🇺', queFiles: ['hc-trans-ru.que', 'trans-ru.que'] },
  'es-ES': { name: 'Español', flag: '🇪🇸', queFiles: ['hc-trans-sp.que', 'trans-sp.que'] }
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// 解析.que文件格式的函数
const parseQueFile = (content: string): Record<string, string> => {
  const translations: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.startsWith('[') && trimmedLine.includes(']')) {
      const closeBracketIndex = trimmedLine.indexOf(']');
      if (closeBracketIndex > 1) {
        const key = trimmedLine.substring(1, closeBracketIndex);
        const value = trimmedLine.substring(closeBracketIndex + 1);
        if (key && value) {
          // 转换key格式：main-btn-start -> main.btn.start
          const normalizedKey = key.replace(/-/g, '.');
          translations[normalizedKey] = value;
        }
      }
    }
  }
  
  return translations;
};

// 加载.que翻译文件
const loadQueTranslations = async (language: SupportedLanguage): Promise<Record<string, string>> => {
  try {
    const queFiles = SUPPORTED_LANGUAGES[language].queFiles;
    const allTranslations: Record<string, string> = {};
    
    // 加载所有相关的.que文件
    for (const queFile of queFiles) {
      try {
        const response = await fetch(`./assets/quenching/${queFile}`);
        if (response.ok) {
          const content = await response.text();
          const translations = parseQueFile(content);
          Object.assign(allTranslations, translations);
        }
      } catch (error) {
        console.warn(`Failed to load ${queFile}:`, error);
      }
    }
    
    return allTranslations;
  } catch (error) {
    console.warn(`Failed to load translations for ${language}:`, error);
    return {};
  }
};

// i18n状态管理
interface I18nState {
  currentLanguage: SupportedLanguage;
  translations: Record<string, string>;
  isLoading: boolean;
}

const initialState: I18nState = {
  currentLanguage: 'zh-CN',
  translations: {},
  isLoading: false
};

// 创建reaxel store
const i18nStore = createReaxable(initialState);

// i18n操作
const i18nActions = {
  // 设置语言
  setLanguage: async (language: SupportedLanguage) => {
    i18nStore.setState({ isLoading: true });
    
    try {
      const translations = await loadQueTranslations(language);
      i18nStore.setState({
        currentLanguage: language,
        translations,
        isLoading: false
      });
      
      // 保存到localStorage
      localStorage.setItem('quenching-language', language);
    } catch (error) {
      console.error('Failed to set language:', error);
      i18nStore.setState({ isLoading: false });
    }
  },

  // 翻译函数
  t: (key: string, fallback?: string): string => {
    const state = i18nStore.getState();
    return state.translations[key] || fallback || key;
  }
};

// 创建reaxel实例
const reaxel_QueI18n = reaxel({
  store: i18nStore,
  ...i18nActions
});

// 初始化i18n
const initializeI18n = async () => {
  const savedLanguage = localStorage.getItem('quenching-language') as SupportedLanguage;
  const defaultLanguage = savedLanguage || 'zh-CN';
  
  await i18nActions.setLanguage(defaultLanguage);
};

// React Hook for translations
export const useQueTranslation = () => {
  const { store, setLanguage, t } = reaxel_QueI18n();
  const [state, setState] = React.useState(store.getState());

  React.useEffect(() => {
    // 订阅状态变化
    const unsubscribe = store.subscribe((newState: I18nState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [store]);

  return {
    t,
    currentLanguage: state.currentLanguage,
    isLoading: state.isLoading,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
};

// 导出初始化函数
export { initializeI18n };

// 默认导出
export default reaxel_QueI18n;
