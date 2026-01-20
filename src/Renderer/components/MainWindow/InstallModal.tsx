import React, { useState } from 'react';
import { Modal, List, Checkbox, Button, Typography, Space, Tag, Progress, Alert } from 'antd';
import {
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from '../../utils/i18n';
import { useModInstaller } from '../../hooks/useModInstaller';
import { useWar3Detector } from '../../hooks/useWar3Detector';
import { useSound } from '../../hooks/useSound';
// import styles from './InstallModal.module.less';

// 临时样式对象
const styles = {
  installModal: 'install-modal',
  installContent: 'install-content',
  componentList: 'component-list',
  componentItem: 'component-item',
  componentInfo: 'component-info',
  componentName: 'component-name',
  componentDescription: 'component-description',
  componentSize: 'component-size',
  installProgress: 'install-progress',
  progressSection: 'progress-section',
  selected: 'selected'
};

const { Title, Text, Paragraph } = Typography;

interface InstallModalProps {
  open: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { currentInstallation } = useWar3Detector();
  const { playSmall, playHover } = useSound();
  const {
    components,
    selectedComponents,
    isInstalling,
    progress,
    toggleComponent,
    getInstallSize,
    startInstall
  } = useModInstaller();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getComponentTypeIcon = (type: string) => {
    const icons = {
      shader: '🎨',
      texture: '🖼️',
      model: '🏗️',
      sound: '🔊',
      ui: '🖥️',
      script: '📜'
    };
    return icons[type] || '📦';
  };

  const getComponentTypeColor = (type: string) => {
    const colors = {
      shader: 'blue',
      texture: 'green',
      model: 'orange',
      sound: 'purple',
      ui: 'cyan',
      script: 'red'
    };
    return colors[type] || 'default';
  };

  const handleInstall = async () => {
    if (!currentInstallation) {
      return;
    }

    try {
      await startInstall(currentInstallation.path);
      // 安装完成后关闭模态框
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const totalSize = getInstallSize();
  const selectedCount = selectedComponents.size;

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined />
          <span>MOD安装设置</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
      centered
      className={styles.installModal}
      styles={{
        content: {
          background: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid #d4af37',
          borderRadius: '12px'
        }
      }}
      footer={[
        <Button 
          key="cancel" 
          onClick={() => {
            playSmall();
            onClose();
          }}
          onMouseEnter={() => playHover()}
          disabled={isInstalling}
        >
          {t('btn.cancel')}
        </Button>,
        <Button
          key="advanced"
          type="default"
          onClick={() => {
            playSmall();
            setShowAdvanced(!showAdvanced);
          }}
          onMouseEnter={() => playHover()}
          disabled={isInstalling}
        >
          {showAdvanced ? '简单模式' : '高级设置'}
        </Button>,
        <Button
          key="install"
          type="primary"
          onClick={() => {
            playSmall();
            handleInstall();
          }}
          onMouseEnter={() => playHover()}
          loading={isInstalling}
          disabled={selectedCount === 0 || !currentInstallation}
        >
          {isInstalling ? '安装中...' : `安装 (${formatFileSize(totalSize)})`}
        </Button>
      ]}
    >
      <div style={{ padding: '20px 0' }}>
        <div className={styles.installContent}>
          {/* 安装信息 */}
          <Alert
            message="MOD安装信息"
            description={
              <div>
                <p>目标路径: {currentInstallation?.path || '未检测到War3路径'}</p>
                <p>选中组件: {selectedCount} 个</p>
                <p>总大小: {formatFileSize(totalSize)}</p>
              </div>
            }
            type="info"
            icon={<InfoCircleOutlined />}
            className={styles.installContent}
          />

          {/* 安装进度 */}
          {isInstalling && progress && (
            <div className={styles.progressSection}>
              <Title level={5}>安装进度</Title>
              <Progress
                percent={progress.progress || 0}
                status={progress.status === 'error' ? 'exception' : 'active'}
                strokeColor={progress.status === 'error' ? '#ff4d4f' : '#52c41a'}
              />
              <Text>
                {progress.message}
              </Text>
            </div>
          )}

          {/* 组件列表 */}
          <div className={styles.componentList}>
            <Title level={5}>选择要安装的组件</Title>

            <List
              dataSource={components}
              renderItem={(component) => (
                <List.Item
                  className={`${styles.componentItem} ${selectedComponents.has(component.id) ? styles.selected : ''
                    }`}
                  actions={[
                    <Checkbox
                      checked={selectedComponents.has(component.id)}
                      onChange={() => {
                        playSmall();
                        toggleComponent(component.id);
                      }}
                      disabled={!component.optional || isInstalling}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div className={styles.componentInfo}>
                        {getComponentTypeIcon(component.type)}
                      </div>
                    }
                    title={
                      <Space>
                        <span>{component.name}</span>
                        <Tag color={getComponentTypeColor(component.type)}>
                          {component.type}
                        </Tag>
                        {!component.optional && (
                          <Tag color="red">必需</Tag>
                        )}
                        <Text type="secondary" className={styles.componentSize}>
                          {formatFileSize(component.size)}
                        </Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph className={styles.componentDescription}>
                          {component.description}
                        </Paragraph>

                        {showAdvanced && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              文件: {component.files.join(', ')}
                            </Text>
                            {component.dependencies && component.dependencies.length > 0 && (
                              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                依赖: {component.dependencies.join(', ')}
                              </Text>
                            )}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>

          {/* 安装说明 */}
          <Alert
            message="安装说明"
            description={
              <ul>
                <li>安装前请确保War3已关闭</li>
                <li>建议备份重要存档文件</li>
                <li>首次安装可能需要较长时间</li>
                <li>安装完成后可在设置中调整各项效果</li>
              </ul>
            }
            type="warning"
            icon={<ExclamationCircleOutlined />}
            style={{ marginTop: 16 }}
          />
        </div>
      </div>
    </Modal>
  );
};
