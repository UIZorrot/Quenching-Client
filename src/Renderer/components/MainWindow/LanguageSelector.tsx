import React from 'react';
import { Dropdown, Button, Space } from 'antd';
import { GlobalOutlined, DownOutlined } from '@ant-design/icons';
import { useTranslation, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../utils/i18n';
import { useSound } from '../../hooks/useSound';
import type { MenuProps } from 'antd';
// import styles from './LanguageSelector.module.less';

// 临时样式对象
const styles = {
  languageSelector: 'language-selector',
  flag: 'flag',
  dropdownButton: 'dropdown-button'
};

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage, supportedLanguages } = useTranslation();
  const { playHover } = useSound();

  const handleLanguageChange = (language: SupportedLanguage) => {
    setLanguage(language);
  };

  const menuItems: MenuProps['items'] = Object.entries(supportedLanguages).map(([code, config]) => ({
    key: code,
    label: (
      <Space>
        <span className={styles.flag}>{config.flag}</span>
        <span>{config.name}</span>
      </Space>
    ),
    onClick: () => handleLanguageChange(code as SupportedLanguage)
  }));

  const currentLanguageConfig = supportedLanguages[currentLanguage];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomLeft"
      trigger={['click']}
    >
      <Button
        type="text"
        size="small"
        onMouseEnter={() => playHover()}
        style={{
          color: '#d4af37',
          border: '1px solid #d4af37',
          borderRadius: '4px',
          padding: '4px 8px',
    filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.6))',  
        }}
      >
        <Space size={4}>
          <GlobalOutlined />
          <span className={styles.flag}>{currentLanguageConfig.flag}</span>
          <span >{currentLanguageConfig.name}</span>
          <DownOutlined/>
        </Space>
      </Button>
    </Dropdown>
  );
};
