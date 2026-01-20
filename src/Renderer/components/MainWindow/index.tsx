import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Layout, Typography, Dropdown, MenuProps, message, Modal, Spin } from 'antd';
import {
  PlayCircleOutlined,
  SettingOutlined,
  BgColorsOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  CloseOutlined,
  MinusOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from '../../utils/i18n';
import { useWar3Detector } from '../../hooks/useWar3Detector';
import { useModInstaller } from '../../hooks/useModInstaller';
import { useWar3Settings } from '../../hooks/useWar3Settings';
import { useSound } from '../../hooks/useSound';
import { BackgroundVideo } from './BackgroundVideo';
import { LanguageSelector } from './LanguageSelector';
import SettingsModal from './SettingsModal';
import { ThemeModal } from './ThemeModal';
import { AboutModal } from './AboutModal';
import { NewsPanel } from './NewsPanel';
import { InstallModal } from './InstallModal';
import { SkinModal } from './SkinModal';
import { useGlobalLoading } from '../GlobalLoadingProvider';
// import styles from './MainWindow.module.less';

const { Content } = Layout;
const { Title, Text } = Typography;

// 临时样式对象，避免CSS模块加载问题
const styles: any = {
  mainWindow: 'main-window',
  titleBar: 'title-bar',
  titleBarLeft: 'title-bar-left',
  titleBarRight: 'title-bar-right',
  titleBarButton: 'title-bar-button',
  windowControls: 'window-controls',
  languageSelector: 'language-selector',
  backgroundVideo: 'background-video',
  centerContent: 'center-content',
  content: 'content',
  mainContent: 'main-content',
  logoSection: 'logo-section',
  logo: 'logo',
  titleSection: 'title-section',
  mainTitle: 'main-title',
  subtitle: 'subtitle',
  versionInfo: 'version-info',
  versionText: 'version-text',
  modeText: 'mode-text',
  warningText: 'warning-text',
  mainButtonSection: 'main-button-section',
  startButton: 'start-button',
  bottomSection: 'bottom-section',
  bottomLeft: 'bottom-left',
  bottomButtons: 'bottom-buttons',
  bottomButton: 'bottom-button',
  progressSection: 'progress-section',
  progressText: 'progress-text',
  progressBar: 'progress-bar',
  progressFill: 'progress-fill',
  progressPercent: 'progress-percent',
  disclaimer: 'disclaimer',
  designerCredit: 'designer-credit',
  newsPanel: 'news-panel',
  newsToggle: 'news-toggle',
  modalOverlay: 'modal-overlay',
  modal: 'modal',
  modalHeader: 'modal-header',
  modalContent: 'modal-content',
  modalFooter: 'modal-footer',
  settingsSection: 'settings-section',
  settingItem: 'setting-item',
  themeGrid: 'theme-grid',
  themeCard: 'theme-card',
  aboutContent: 'about-content',
  componentList: 'component-list',
  componentItem: 'component-item',
  selected: 'selected',
  installProgress: 'install-progress'
};

export const MainWindow: React.FC = () => {
  const { t } = useTranslation();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isNewsPanelOpen, setIsNewsPanelOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [remoteVersion, setRemoteVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { showLoading, hideLoading, updateLoading } = useGlobalLoading();

  // War3 检测和MOD安装
  const {
    currentInstallation,
    isInWar3Directory,
    launchGame,
    detectInstallations
  } = useWar3Detector();

  const {
    isInstalling,
    progress,
  } = useModInstaller();

  const { modSettings, saveModSettings, loadSettings } = useWar3Settings();

  const [isFullPackageInstalled, setIsFullPackageInstalled] = useState(false);
  const [installingFullPackage, setInstallingFullPackage] = useState(false);
  const [modEnabledUI, setModEnabledUI] = useState(modSettings?.modEnabled ?? true);
  const [isModToggling, setIsModToggling] = useState(false);
  const [modToggleStatus, setModToggleStatus] = useState<{ message: string; percent: number } | null>(null);

  const { playMain, playSmall, playHover } = useSound();

  // 同步全局 Loading 状态
  useEffect(() => {
    if (isModToggling) {
      showLoading(modToggleStatus?.message || '正在切换MOD...', modToggleStatus?.percent);
    } else if (installingFullPackage) {
      showLoading('正在安装完整包...');
    } else if (isInstalling && progress?.status === 'installing') {
      showLoading(progress?.message || '处理中...', typeof progress?.progress === 'number' ? progress.progress : undefined);
    } else {
      hideLoading();
    }
  }, [isModToggling, modToggleStatus, installingFullPackage, isInstalling, progress, showLoading, hideLoading]);

  // 窗口控制
  const handleMinimize = useCallback(() => {
    // 立即响应，不等待IPC完成
    window.electronAPI?.minimizeWindow();
  }, []);

  const handleClose = useCallback(() => {
    playSmall(); // 退出使用 clicksmall
    window.electronAPI?.closeWindow();
  }, [playSmall]);

  const refreshFullPackageStatus = async (explicitPath?: string) => {
    const api = window.electronAPI;
    if (!api || !api.pathExists || !api.readDirectory) {
      return;
    }

    let war3Path = explicitPath;

    if (!war3Path) {
      war3Path = currentInstallation?.path;

      if (!war3Path && api.getConfig) {
        war3Path = await api.getConfig('war3Path');
      }
    }

    if (!war3Path) {
      setIsFullPackageInstalled(false);
      return;
    }

    const normalizedPath = war3Path.replace(/\\/g, '/');
    let basePath = normalizedPath;

    if (/\.exe$/i.test(normalizedPath)) {
      const lastSlash = normalizedPath.lastIndexOf('/');
      basePath = lastSlash > 0 ? normalizedPath.slice(0, lastSlash) : normalizedPath;
    }

    try {
      const patchDir = `${basePath}/_retail_/patch`;
      const qmoffPatchDir = `${basePath}/_retail_/QMoff/patch`;

      const checkDirForKeep = async (dir: string) => {
        const exists = await api.pathExists(dir);
        if (!exists) {
          return false;
        }
        const items = await api.readDirectory(dir);
        return items.some((item: any) =>
          typeof item.name === 'string' && item.name.toLowerCase() === 'keep.que'
        );
      };

      const hasKeepInPatch = await checkDirForKeep(patchDir);
      const hasKeepInQmoff = await checkDirForKeep(qmoffPatchDir);

      if (hasKeepInPatch || hasKeepInQmoff) {
        setIsFullPackageInstalled(true);
        return;
      }

      const patchExists = (await api.pathExists(patchDir)) && (await api.readDirectory(patchDir)).length > 0;
      const qmoffPatchExists = (await api.pathExists(qmoffPatchDir)) && (await api.readDirectory(qmoffPatchDir)).length > 0;

      setIsFullPackageInstalled(patchExists || qmoffPatchExists);
    } catch (error) {
      setIsFullPackageInstalled(false);
    }
  };

  useEffect(() => {
    refreshFullPackageStatus();
    if (currentInstallation?.path) {
      console.log('[MainWindow] War3 installation detected, loading settings...', currentInstallation.path);
      loadSettings(currentInstallation.path);
    }
  }, [currentInstallation?.path]);

  useEffect(() => {
    const syncModEnabled = async () => {
      let enabled = typeof modSettings?.modEnabled === 'boolean' ? modSettings.modEnabled : true;

      try {
        if (window.electronAPI?.getConfig) {
          const stored = await window.electronAPI.getConfig('modSettings');
          if (stored && typeof stored === 'object' && typeof stored.modEnabled === 'boolean') {
            enabled = stored.modEnabled;
          }
        }
      } catch (error) {
      }

      setModEnabledUI(enabled);
    };

    syncModEnabled();
  }, [modSettings?.modEnabled]);

  const handleModToggle = async () => {
    if (isModToggling) {
      return;
    }

    setIsModToggling(true);

    console.log('[ModToggle] Toggle requested, current modEnabledUI =', modEnabledUI);

    let targetPath = currentInstallation?.path;

    if (!targetPath && window.electronAPI?.getConfig) {
      targetPath = await window.electronAPI.getConfig('war3Path');
    }

    if (!targetPath) {
      message.error('未检测到 Warcraft III 安装路径，请在设置中指定目录。');
      setIsModToggling(false);
      return;
    }

    try {
      const newEnabled = !modEnabledUI;

      console.log('[ModToggle] Start toggling, newEnabled =', newEnabled, 'war3Path =', targetPath);

      const api = window.electronAPI;
      if (api?.pathExists && api?.readDirectory && (api?.moveFile || (api?.copyFile && api?.deleteFile))) {
        const baseDir = `${targetPath}/_retail_`;
        const qmoffBaseDir = `${targetPath}/_retail_/QMoff`;

        console.log('[ModToggle] baseDir =', baseDir, 'qmoffBaseDir =', qmoffBaseDir);

        const allDirs = [
          'buildings',
          'campaign',
          'cos',
          'doodads',
          'environment',
          'fonts',
          'patch',
          'replaceabletextures',
          'scripts',
          'shaders',
          'splats',
          'terrainart',
          'textures',
          'ui',
          'units'
        ];

        const moveAll = async (fromBase: string, toBase: string) => {
          const total = allDirs.length;
          for (let i = 0; i < total; i++) {
            const dirName = allDirs[i];
            const source = `${fromBase}/${dirName}`;
            const target = `${toBase}/${dirName}`;

            console.log(`[ModToggle] Step ${i + 1}/${total}: Moving ${dirName}`);

            setModToggleStatus({
              message: `正在移动 ${dirName}...`,
              percent: Math.round((i / total) * 100)
            });

            if (api.moveDirectory) {
              await api.moveDirectory(source, target);
            } else {
              // Fallback to moveFile if moveDirectory is not available (shouldn't happen)
              await api.moveFile(source, target);
            }
          }
        };

        if (newEnabled) {
          console.log('[ModToggle] direction: QMoff -> base (开启 MOD)');
          await moveAll(qmoffBaseDir, baseDir);
        } else {
          console.log('[ModToggle] direction: base -> QMoff (关闭 MOD)');
          await moveAll(baseDir, qmoffBaseDir);
        }
      }

      await refreshFullPackageStatus(targetPath);

      await saveModSettings(targetPath, { modEnabled: newEnabled });
      setModEnabledUI(newEnabled);
      message.success(newEnabled ? 'MOD 已启用' : 'MOD 已禁用');
    } catch (error) {
      console.error('[ModToggle] toggle failed:', error);
      message.error('设置失败');
    } finally {
      console.log('[ModToggle] toggle finished');
      setIsModToggling(false);
      setModToggleStatus(null);
    }
  };

  // 启动游戏
  const handleStartGame = async () => {
    playMain();
    // 1. 尝试从 Config 获取路径
    let exePath = '';
    if (window.electronAPI?.getConfig) {
      const savedPath = await window.electronAPI.getConfig('war3Path');
      if (savedPath) {
        // 如果是文件夹，拼接可执行文件
        if (!savedPath.endsWith('.exe')) {
          // 简单的猜测逻辑，实际应复用 useWar3Detector 的逻辑
          exePath = savedPath.includes('Warcraft III.exe') ? savedPath : `${savedPath}/_retail_/x86_64/Warcraft III.exe`;
        } else {
          exePath = savedPath;
        }
      }
    }

    // 2. 如果 Config 没有，尝试使用自动检测的 currentInstallation
    if (!exePath && currentInstallation) {
      exePath = currentInstallation.executablePath;
    }

    // 3. 如果都没有，弹出选择框
    if (!exePath) {
      // message.info('请选择魔兽争霸III安装目录');
      const path = await window.electronAPI?.selectGamePath();
      if (path) {
        // 保存后重新检测 (这里只是临时设置 exePath，UI 刷新依赖 Config 变更触发的重渲染或手动刷新)
        exePath = path.includes('.exe') ? path : `${path}/_retail_/x86_64/Warcraft III.exe`;

        // 触发一次重新检测以更新界面状态
        detectInstallations();
      } else {
        return; // 用户取消
      }
    }

    // 4. 执行启动
    try {
      if (window.electronAPI?.launchGame) {
        // 注意：launchGame 在 Main process 会优先读取 Config 中的 war3Path
        // 所以只要 selectGamePath 成功保存了 Config，这里直接调用即可
        await window.electronAPI.launchGame();
        message.success('游戏启动成功！');
      }
    } catch (error) {
      message.error(`游戏启动失败: ${error.message}`);
    }
  };

  // 更换魔兽目录（仅选择并保存，不直接启动）
  const handleChangeWar3Path = async () => {
    if (!window.electronAPI?.selectGamePath) {
      return;
    }
    const path = await window.electronAPI.selectGamePath();
    if (path) {
      message.success(`已设置魔兽目录: ${path}`);
      // 重新检测安装信息，刷新当前安装显示
      detectInstallations();
    }
  };

  // 模态框控制
  const openModal = (modalType: string) => {
    // 检查 MOD 是否开启：涂装 and 设置按钮受限
    if (modalType === 'skin' || modalType === 'settings') {
      if (!modEnabledUI) {
        message.error('请先开启淬火 MOD 引擎');
        return;
      }
    }

    if (modalType === 'setup' && !currentInstallation) {
      message.warning('请先检测War3安装路径');
      detectInstallations();
      return;
    }
    playMain(); // 二级菜单入口使用 clickmain
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // 安装设置处理
  const handleInstallSetup = () => {
    if (!currentInstallation) {
      message.error('未检测到War3安装路径');
      return;
    }

    openModal('install');
  };

  // 音效播放
  const playHoverSound = () => {
    playHover();
  };

  useEffect(() => {
    const checkVersion = async () => {
      let localVer = '';
      let remoteVer = '';

      try {
        const v = await window.electronAPI?.getAppVersion();
        localVer = (v || '').trim();
        setAppVersion(localVer);
        console.log('Local Version:', localVer);
      } catch (err) {
        console.error('Failed to get app version:', err);
      }

      try {
        const rv = await window.electronAPI?.fetchVersion();
        remoteVer = (rv || '').trim();
        setRemoteVersion(remoteVer);
        console.log('Remote Version:', remoteVer);
      } catch (err) {
        console.error('Failed to fetch remote version:', err);
      }

      if (localVer && remoteVer && localVer !== remoteVer) {
        setUpdateAvailable(true);
      }
    };
    checkVersion();
  }, []);

  const handleInstallFullPackage = async () => {
    if (!window.electronAPI?.installFullPackage) {
      return;
    }

    try {
      setInstallingFullPackage(true);
      const zipPath = await window.electronAPI.selectFile?.({
        title: '请选择淬火Mod整合包 (zip)',
        filters: [{ name: 'Zip Archive', extensions: ['zip'] }]
      });

      if (!zipPath) {
        setInstallingFullPackage(false);
        return;
      }

      const result = await window.electronAPI.installFullPackage(zipPath);

      if (result && result.success) {
        if (result.skipped) {
          message.info('淬火Mod整合包已安装，无需重复操作');
        } else {
          message.success('淬火Mod整合包安装完成');
        }
        setIsFullPackageInstalled(true);
      } else if (result && result.error === 'noWar3Path') {
        message.error('请先设置魔兽目录再安装淬火Mod整合包');
      } else if (result && result.error === 'noZip') {
        message.error('选择的文件无效或不存在，请确认后重试');
      } else {
        message.error(`安装失败: ${(result && result.error) || '未知错误'}`);
      }
    } catch (e: any) {
      message.error(`安装失败: ${e && e.message ? e.message : '未知错误'}`);
    } finally {
      setInstallingFullPackage(false);
    }
  };

  return (
    <Layout
      className={styles.mainWindow}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: "'Trajan Pro 3', 'Microsoft YaHei UI Light', sans-serif"
      }}
    >
      {/* 背景视频 */}
      <BackgroundVideo />

      {/* 窗口控制栏 */}
      <div
        className={styles.titleBar}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 15px',
          zIndex: 1000,
          // @ts-ignore
          WebkitAppRegion: 'drag'
        }}
      >
        <div
          className={styles.titleBarLeft}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textShadow: '0 1px 1px rgba(0, 0, 0, 0.5), 0 0 5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Button
            type="text"
            icon={<QuestionCircleOutlined style={{
              filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5))'
            }} />}
            className={styles.titleBarButton}
            onClick={() => openModal('about')}
          />

          <Button
            type="text"
            className={styles.titleBarButton}
            onClick={() => openModal('skin')}
            style={{ fontSize: '12px', textShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.6)', }}
          >
            {t('main.btn.skin')}
          </Button>


          <Button
            type="text"
            className={styles.titleBarButton}
            onClick={() => openModal('settings')}
            style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.6)', fontSize: '12px' }}
          >
            {t('main.btn.settings')}
          </Button>

          <Button
            type="text"
            className={styles.titleBarButton}
            onClick={() => openModal('theme')}
            style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.6)', fontSize: '12px' }}
          >
            {t('main.btn.theme')}
          </Button>

          <Button
            type="text"
            className={styles.titleBarButton}
            onClick={() => setIsNewsPanelOpen(!isNewsPanelOpen)}
            style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.6)', fontSize: '12px' }}
          >
            {t('main.btn.news')}
          </Button>

          <Button
            type="text"
            className={styles.titleBarButton}
            onClick={() => openModal('about')}
            style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.6)', fontSize: '12px' }}
          >
            {t('main.btn.about')}
          </Button>

          <LanguageSelector />
        </div>

        <div
          className={styles.titleBarRight}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Button
            type="text"
            icon={<MinusOutlined />}
            className={styles.titleBarButton}
            onClick={handleMinimize}
          />
          <Button
            type="text"
            icon={<CloseOutlined />}
            className={styles.titleBarButton}
            onClick={handleClose}
          />
        </div>
      </div>

      <Content
        className={styles.content}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          padding: '40px 20px 20px',
          position: 'relative'
        }}
      >
        {/* 主要内容区域 */}
        <div
          className={styles.mainContent}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            color: '#d4af37',
            maxWidth: '800px'
          }}
        >
          {/* Logo和标题重叠区域 */}
          <div
            style={{
              position: 'relative',
              marginBottom: '40px',
              display: 'inline-block'
            }}
          >
            {/* Logo - 在下层，可点击 */}
            <div
              onClick={handleModToggle}
              style={{
                cursor: 'pointer',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                zIndex: 1,
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.9), 0 0 5px rgba(0, 0, 0, 0.5)',
                filter: modEnabledUI
                  ? 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.4)) brightness(1.1)'
                  : 'grayscale(0.8) brightness(0.4)',
                transform: modEnabledUI ? 'scale(1)' : 'scale(0.95)',
              }}
              title="点击图标打开/关闭淬火"
            >
              <img
                src="./assets/quenching/logo.png"
                alt="Quenching Logo"
                className={styles.logo}
                style={{
                  width: '311px',
                  height: '311px',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* 标题区域 - 在上层，与Logo重叠 */}
            <div
              className={styles.titleSection}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 2,
                width: '600px',
                pointerEvents: 'none' // 让点击事件穿透到下方的 Logo
              }}
            >
              <Text
                style={{
                  color: '#b8860b',
                  fontSize: '1.2rem',
                  display: 'block',
                  marginBottom: '10px',
                  textShadow: '0 0 15px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,1)',
                  letterSpacing: '3px'
                }}
              >
                {t('main.title.secondary')}
              </Text>
              <Title
                level={1}
                style={{
                  color: '#d4af37',
                  fontSize: '3.5rem',
                  fontWeight: 'bold',
                  margin: '0 0 5px 0',
                  textShadow: '0 0 15px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,1)',
                  fontFamily: "'Trajan Pro 3', serif",
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase'
                }}
              >
                {t('main.title.primary')}
              </Title>

              <Text className={styles.versionText} style={{ fontSize: '24px', color: '#d4af37', textShadow: '0 0 15px rgba(0,0,0,0.9), 2px 2px 4px rgba(0,0,0,1)', }}>
                {remoteVersion || t('main.version.value')}
              </Text>
            </div>

            {/* MOD 状态小提示 - 放在 Logo 下方 */}
            <div style={{
              position: 'absolute',
              bottom: '50px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              zIndex: 3
            }}>

              <div style={{
                letterSpacing: '2px',
                color: '#888',
                fontSize: '14px',
                fontStyle: 'italic',
                textShadow: '0 1px 1px rgba(0, 0, 0, 0.9), 0 0 5px rgba(0, 0, 0, 0.5)',
              }}>
                点击图标打开/关闭
              </div>
            </div>

          </div>

          <div
            className={styles.versionInfo}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.85rem',
              color: '#888',
              marginTop: '-10px'
            }}
          >

            <Text className={styles.modeText} style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.9), 0 0 5px rgba(0, 0, 0, 0.5)', color: '#d4af37' }}>
              {currentInstallation ?
                (isFullPackageInstalled ? '完整包已安装' : '完整包未安装') :
                '未检测到War3'
              }
            </Text>
            {/* {!isInWar3Directory && (
              <Text className={styles.warningText} style={{ color: '#ff4d4f', fontSize: '11px', opacity: 0.8 }}>
                ⚠️ 建议将程序放在War3根目录下运行
              </Text>
            )} */}
          </div>

          {/* 主要按钮 */}
          <div className={styles.mainButtonSection}>
            {updateAvailable && (
              <div style={{ marginBottom: '10px' }}>
                <Button
                  type="link"
                  onClick={() => window.electronAPI?.openExternal('https://www.tianxiazhengyi.net/qm/qmdownload.html')}
                  style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.9), 0 0 5px rgba(0, 0, 0, 0.5)', color: '#d4af37', fontWeight: 700 }}
                >
                  有新版本下载
                </Button>
              </div>
            )}
            <div style={{ marginBottom: '8px' }}>
              <div
                onClick={
                  installingFullPackage || isFullPackageInstalled
                    ? undefined
                    : handleInstallFullPackage
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: installingFullPackage || isFullPackageInstalled ? 'default' : 'pointer',
                  color: '#d4af37',
                  textDecoration: installingFullPackage || isFullPackageInstalled ? 'none' : 'underline',
                  opacity: installingFullPackage || isFullPackageInstalled ? 0.7 : 1,
                  textShadow: '0 1px 1px rgba(0, 0, 0, 0.9), 0 0 5px rgba(0, 0, 0, 0.5)'
                }}
              >
                <Text>
                  {isFullPackageInstalled
                    ? ' '
                    : installingFullPackage
                      ? ' '
                      : '点击安装完整包'}
                </Text>
              </div>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              className={styles.startButton}
              onClick={handleStartGame}
              onMouseEnter={playHoverSound}
              disabled={isInstalling}
              loading={isInstalling && progress?.status === 'installing'}
              style={{
                background: 'linear-gradient(45deg, #d4af37, #f4d03f)',
                border: '2px solid #d4af37',
                borderRadius: '8px',
                height: '50px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: '#000',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.8)',
                transition: 'all 0.3s ease',
                filter: 'drop-shadow(3px 3px 6px rgba(0, 0, 0, 0.6))',
              }}
            >
              {isInstalling ?
                (progress?.message || '处理中...') :
                t('main.btn.start')
              }
            </Button>

            {/* 更换魔兽目录（文字按钮样式） */}
            <div style={{ marginTop: '8px' }}>
              <Text
                onClick={handleChangeWar3Path}
                style={{
                  cursor: 'pointer',
                  color: '#d4af37',
                  textDecoration: 'underline',
                  textShadow: '0 1px 1px rgba(0, 0, 0, 0.8)'
                }}
              >
                更换魔兽目录
              </Text>
            </div>

            {/* 安装进度显示 */}
            {isInstalling && progress && (
              <div className={styles.progressSection}>
                <Text className={styles.progressText}>
                  {progress.message}
                </Text>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${progress.progress || 0}%`,
                      backgroundColor: progress.status === 'error' ? '#ff4d4f' : '#52c41a'
                    }}
                  />
                </div>
                <Text className={styles.progressPercent}>
                  {progress.progress || 0}%
                </Text>
              </div>
            )}

          </div>

        </div>


        {/* 底部按钮区域 */}
        <div
          className={styles.bottomSection}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px'
          }}
        >
          <div
            className={styles.bottomLeft}
            style={{
              color: '#666',
              fontSize: '0.8rem',
              textAlign: 'center',
              flex: 1
            }}
          >
            <div style={{ marginBottom: '5px' }}>
              <Text className={styles.designerCredit} style={{ color: '#888', letterSpacing: '1px' }}>
                正
              </Text>
            </div>
            <div>
              <Button
                type="link"
                size="small"
                onClick={() => window.electronAPI?.openExternal('https://www.tianxiazhengyi.net')}
                style={{
                  color: '#d4af37',
                  fontSize: '0.8rem',
                  padding: 0,
                  height: 'auto'
                }}
              >
                www.tianxiazhengyi.net
              </Button>
            </div>
          </div>
        </div>
      </Content>

      {/* 新闻面板 */}
      <NewsPanel isExpanded={isNewsPanelOpen} onToggle={setIsNewsPanelOpen} />

      {/* 模态框 */}
      <SettingsModal
        open={activeModal === 'settings'}
        onClose={closeModal}
      />

      <ThemeModal
        open={activeModal === 'theme'}
        onClose={closeModal}
      />

      <AboutModal
        open={activeModal === 'about'}
        onClose={closeModal}
      />

      <InstallModal
        open={activeModal === 'install'}
        onClose={closeModal}
      />

      <SkinModal
        open={activeModal === 'skin'}
        onClose={closeModal}
      />
    </Layout>
  );
};
