import React from 'react';
import { reaxel, createReaxable } from 'reaxes';

// 支持的语言配置
export const SUPPORTED_LANGUAGES = {
  'zh-CN': { name: '中文', flag: '🇨🇳' },
  'en-US': { name: 'English', flag: '🇺🇸' },
  'fr-FR': { name: 'Français', flag: '🇫🇷' },
  'pt-BR': { name: 'Português', flag: '🇧🇷' },
  'ru-RU': { name: 'Русский', flag: '🇷🇺' },
  'es-ES': { name: 'Español', flag: '🇪🇸' }
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// 翻译资源
const translations = {
  'zh-CN': {
    // 主界面
    'main.title.primary': 'QUENCHING',
    'main.title.secondary': '魔兽重制版增强模组',
    'main.title.mode': '重制版',
    'main.version': '目前版本',
    'main.version.value': 'v2.5',
    'main.btn.start': '启动游戏',
    'main.btn.setup': '安装MOD',
    'main.btn.theme': '主题',
    'main.btn.help': '使用说明',
    'main.btn.settings': '基础设置',
    'main.btn.about': '关于我们',
    'main.btn.news': '新闻',
    'main.btn.website': '官网',
    'main.btn.campaign': '战役',
    'main.btn.skin': '涂装',
    'main.btn.disclaimer': '免责声明',

    // 设置界面
    'settings.title': '设置',
    'settings.video': '视频设置',
    'settings.shader': '着色器',
    'settings.water': '水面效果',
    'settings.foliage': '植被效果',
    'settings.lighting': '光照效果',
    'settings.ui': '游戏界面',
    'settings.half': '半透明效果',
    'settings.btn.turnon': '开启',
    'settings.btn.turnoff': '关闭',
    'settings.btn.install': '安装',
    'settings.water.transparent': '透明',
    'settings.water.realistic': '真实',
    'settings.lighting.standard': '标准',
    'settings.lighting.enhanced': '增强',
    'settings.ui.classic': '经典',
    'settings.ui.quenching': '淬火',
    'settings.ui.blizzard': '暴雪',

    // 原版WPF的详细设置翻译
    'settings.shader.version': '着色器版本',
    'settings.shader.132': '1.32版本',
    'settings.shader.133': '1.33+版本',
    'settings.shader.advanced': '高级着色器',
    'settings.shader.compatibility': '兼容性检测',

    'settings.foliage.density': '植被密度',
    'settings.foliage.low': '低密度',
    'settings.foliage.normal': '正常',
    'settings.foliage.high': '高密度',
    'settings.foliage.type': '植被类型',

    'settings.lighting.level': '光照等级',
    'settings.lighting.level1': '基础光照',
    'settings.lighting.level2': '增强光照',
    'settings.lighting.level3': '高级光照',
    'settings.lighting.level4': '对战专用光照',
    'settings.lighting.source': '光源模式',
    'settings.lighting.fixed': '固定光源',
    'settings.lighting.rotating': '旋转光源',

    'settings.tree': '树木设置',
    'settings.tree.style': '树木样式',
    'settings.tree.old': '复古样式',
    'settings.tree.tall': '高耸样式',
    'settings.tree.short': '低垂样式',
    'settings.tree.height': '树木高度',
    'settings.tree.height.16': '1.6倍高度',
    'settings.tree.height.18': '1.8倍高度',

    'settings.terrain': '地形环境',
    'settings.terrain.classic': '经典地形',
    'settings.terrain.vintage': '复古地形',
    'settings.terrain.custom': '自定义比例',

    // 主题界面
    'theme.title': '主题选择',
    'theme.description': '选择你喜欢的视觉主题来个性化你的游戏体验',
    'theme.original': '原版主题',
    'theme.quenching': '淬火主题',
    'theme.warcraft2': '魔兽2主题',
    'theme.city': '城邦主题',
    'theme.custom': '自定义主题',

    // 语言设置
    'language.title': '语言设置',
    'language.select': '选择语言',

    // 进度提示
    'progress.hint': '正在处理...',
    'progress.downloading': '正在下载',
    'progress.installing': '正在安装',
    'progress.extracting': '正在解压',

    // 按钮通用
    'btn.confirm': '确定',
    'btn.cancel': '取消',
    'btn.close': '关闭',
    'btn.back': '返回',
    'btn.next': '下一步',
    'btn.previous': '上一步',

    // 消息提示
    'msg.install.confirm': '检测到你已经安装过MOD，是否要重新安装？',
    'msg.update.available': '检测到有版本更新，是否开始安装？',
    'msg.install.success': '安装成功！',
    'msg.install.failed': '安装失败，请重试',

    // 设置项
    'setup.title': '基础设置',
    'setup.mode.title': '游戏模式',
    'setup.mode.hd': '锁定重制版',
    'setup.mode.sd': '锁定经典版',
    'setup.gpu.title': '显卡类型',
    'setup.gpu.nvidia': 'Nvidia',
    'setup.gpu.amd': 'Intel/AMD',
    'setup.mod.title': '模组开关',
    'setup.mod.on': '开启模组',
    'setup.mod.off': '关闭模组',
    'setup.version.title': '游戏版本',
    'setup.version.132': '1.32',
    'setup.version.133': '1.33+'
  },

  'en-US': {
    // Main interface
    'main.title.primary': 'QuenChing',
    'main.title.secondary': 'Warcraft Enhancement Mod',
    'main.title.mode': 'Reforged Edition',
    'main.version': 'Current Version',
    'main.version.value': 'v2.5',
    'main.btn.start': 'Launch Game',
    'main.btn.setup': 'Install MOD',
    'main.btn.theme': 'Themes',
    'main.btn.help': 'User Guide',
    'main.btn.settings': 'Basic Settings',
    'main.btn.about': 'About Us',
    'main.btn.news': 'News',
    'main.btn.website': 'Website',
    'main.btn.campaign': 'Campaign',
    'main.btn.skin': 'Paint',
    'main.btn.disclaimer': 'Disclaimer',

    // Settings interface
    'settings.title': 'Settings',
    'settings.video': 'Video Settings',
    'settings.shader': 'Shaders',
    'settings.water': 'Water Effects',
    'settings.foliage': 'Foliage Effects',
    'settings.lighting': 'Lighting Effects',
    'settings.ui': 'Game UI',
    'settings.half': 'Transparency',
    'settings.btn.turnon': 'On',
    'settings.btn.turnoff': 'Off',
    'settings.btn.install': 'Install',
    'settings.water.transparent': 'Transparent',
    'settings.water.realistic': 'Realistic',
    'settings.lighting.standard': 'Standard',
    'settings.lighting.enhanced': 'Enhanced',
    'settings.ui.classic': 'Classic',
    'settings.ui.quenching': 'Quenching',
    'settings.ui.blizzard': 'Blizzard',

    // Theme interface
    'theme.title': 'Theme Selection',
    'theme.description': 'Choose your favorite visual theme to personalize your gaming experience',
    'theme.original': 'Original Theme',
    'theme.quenching': 'Quenching Theme',
    'theme.warcraft2': 'Warcraft 2 Theme',
    'theme.city': 'City Theme',
    'theme.custom': 'Custom Theme',

    // Language settings
    'language.title': 'Language Settings',
    'language.select': 'Select Language',

    // Progress hints
    'progress.hint': 'Processing...',
    'progress.downloading': 'Downloading',
    'progress.installing': 'Installing',
    'progress.extracting': 'Extracting',

    // Common buttons
    'btn.confirm': 'Confirm',
    'btn.cancel': 'Cancel',
    'btn.close': 'Close',
    'btn.back': 'Back',
    'btn.next': 'Next',
    'btn.previous': 'Previous',

    // Messages
    'msg.install.confirm': 'MOD already installed. Do you want to reinstall?',
    'msg.update.available': 'Update available. Start installation?',
    'msg.install.success': 'Installation successful!',
    'msg.install.failed': 'Installation failed, please retry',

    // Setup items
    'setup.title': 'Basic Settings',
    'setup.mode.title': 'Game Mode',
    'setup.mode.hd': 'Lock Reforged',
    'setup.mode.sd': 'Lock Classic',
    'setup.gpu.title': 'GPU Type',
    'setup.gpu.nvidia': 'Nvidia',
    'setup.gpu.amd': 'Intel/AMD',
    'setup.mod.title': 'Mod Switch',
    'setup.mod.on': 'Enable Mod',
    'setup.mod.off': 'Disable Mod',
    'setup.version.title': 'Game Version',
    'setup.version.132': '1.32',
    'setup.version.133': '1.33+'
  }
  // 其他语言可以后续添加...
};

// 国际化状态管理
export const reaxel_I18n = reaxel(() => {
  const { store, setState } = createReaxable({
    currentLanguage: 'zh-CN' as SupportedLanguage,
    isLoading: false
  });

  const setLanguage = (language: SupportedLanguage) => {
    setState({ currentLanguage: language });
    // 保存到本地存储
    localStorage.setItem('quenching-language', language);
    // 强制触发状态更新
    setTimeout(() => {
      setState({ currentLanguage: language, isLoading: false });
    }, 10);
  };

  const t = (key: string, fallback?: string): string => {
    const langTranslations = translations[store.currentLanguage];
    return langTranslations?.[key] || fallback || key;
  };

  // 初始化语言（从本地存储读取）
  const savedLanguage = localStorage.getItem('quenching-language') as SupportedLanguage;
  if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
    setState({ currentLanguage: savedLanguage });
  }

  const statics = {
    supportedLanguages: SUPPORTED_LANGUAGES
  };

  return Object.assign(() => ({
    store,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES
  }), {
    store,
    setState,
    setLanguage,
    t,
    statics
  });
});

// React Hook for translations
export const useTranslation = () => {
  const i18n = reaxel_I18n();
  const [state, setState] = React.useState(() => ({ ...i18n.store }));
  const [updateCounter, setUpdateCounter] = React.useState(0);

  // 创建一个包装的setLanguage函数，确保状态更新
  const setLanguage = React.useCallback((language: SupportedLanguage) => {
    i18n.setLanguage(language);
    // 立即更新本地状态
    setState({ currentLanguage: language, isLoading: false });
    // 强制重新渲染
    setUpdateCounter(prev => prev + 1);
  }, [i18n]);

  React.useEffect(() => {
    // 使用更频繁的检查来确保状态同步
    const checkForUpdates = () => {
      const currentState = i18n.store;
      if (currentState.currentLanguage !== state.currentLanguage ||
        currentState.isLoading !== state.isLoading) {
        setState({ ...currentState });
      }
    };

    // 立即检查一次
    checkForUpdates();

    // 设置更频繁的检查
    const interval = setInterval(checkForUpdates, 16); // 约60fps
    return () => clearInterval(interval);
  }, [i18n.store, state.currentLanguage, state.isLoading, updateCounter]);

  return {
    t: i18n.t,
    currentLanguage: state.currentLanguage,
    isLoading: state.isLoading,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
};
