import React, { useState, useEffect } from 'react';
import { Typography, Button, Space, Tag, Spin, Empty } from 'antd';
import {
  ReloadOutlined,
  CalendarOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useNews } from '../../utils/news';
import { useTranslation } from '../../utils/i18n';
import { useSound } from '../../hooks/useSound';
import ReactMarkdown from 'react-markdown';
import { OverlayModal } from './OverlayModal';
import styles from './NewsPanel.module.less';

// 样式保护代理，防止 styles 为 undefined 时崩溃
const s = new Proxy(styles || {}, {
  get: (target, prop) => {
    if (typeof prop === 'string') {
      return target[prop] || prop;
    }
    return target[prop];
  }
}) as any;

const { Title, Text, Paragraph } = Typography;

interface NewsPanelProps {
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export const NewsPanel: React.FC<NewsPanelProps> = ({
  isExpanded = false,
  onToggle
}) => {
  const { t, currentLanguage } = useTranslation();
  const { playSmall, playHover } = useSound();
  const {
    filteredNews,
    isLoading,
    lastUpdated,
    fetchNews,
    errorMessage
  } = useNews();

  // 初始化拉取新闻
  useEffect(() => {
    if (isExpanded) {
      const lang = currentLanguage === 'zh-CN' ? 'cn' : 'en';
      fetchNews(false, lang);
    }
  }, [isExpanded, currentLanguage]);

  const handleRefresh = () => {
    const lang = currentLanguage === 'zh-CN' ? 'cn' : 'en';
    fetchNews(true, lang);
  };

  return (
    <OverlayModal
      open={isExpanded}
      onClose={() => onToggle?.(false)}
      title={"最新动态"}
      width="900px"
    >
      <div className={s.newsModalContent}>
        {isLoading ? (
          <div className={s.loadingContainer} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <Spin size="large" tip="正在抓取最新情报..." />
          </div>
        ) : filteredNews.length > 0 ? (
          <div className={s.newsListContainer} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
                style={{ color: '#d4af37' }}
              >
                刷新
              </Button>
            </div>
            {filteredNews.map((item, index) => (
              <div key={item.id} className={s.newsItem} style={{ marginBottom: '48px', borderBottom: index < filteredNews.length - 1 ? '1px solid rgba(212, 175, 55, 0.1)' : 'none', paddingBottom: '32px' }}>
                <div className={s.newsHeader}>
                  <div className={s.newsMeta} style={{ marginBottom: '16px' }}>
                    <Space align="center" size={12}>
                      {item.tags && item.tags.map(tag => (
                        <Tag key={tag} color="gold" style={{ marginRight: 0 }}>{tag}</Tag>
                      ))}
                      {item.version && <Tag color="purple">{item.version}</Tag>}
                      <Text style={{ color: '#888' }}><CalendarOutlined /> {item.date}</Text>
                    </Space>
                  </div>
                  <Title level={2} style={{ color: '#d4af37', margin: '0 0 24px 0' }}>{item.title}</Title>
                </div>

                <div className={s.markdownBody}>
                  <ReactMarkdown>{item.content}</ReactMarkdown>
                </div>
              </div>
            ))}

            {lastUpdated && (
              <div className={s.newsFooter} style={{ textAlign: 'center', marginTop: '32px', paddingBottom: '20px' }}>
                <Text type="secondary" style={{ fontSize: '11px', color: '#666' }}>
                  数据来自远程服务器，最后同步: {new Date(lastUpdated).toLocaleString()}
                </Text>
              </div>
            )}
          </div>
        ) : (
          <div className={s.emptyContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            {errorMessage ? (
              <div className={s.errorContainer} style={{ textAlign: 'center' }}>
                <Text style={{ color: '#ff4d4f', display: 'block', marginBottom: '16px' }}>网络错误</Text>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  style={{ color: '#d4af37', borderColor: '#d4af37' }}
                  ghost
                >
                  重试
                </Button>
              </div>
            ) : (
              <>
                <Empty
                  description={<span style={{ color: '#888' }}>暂无新闻</span>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    playSmall();
                    handleRefresh();
                  }}
                  onMouseEnter={() => playHover()}
                  style={{ marginTop: '16px', color: '#d4af37', borderColor: '#d4af37' }}
                  ghost
                >
                  尝试刷新
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </OverlayModal>
  );
};
