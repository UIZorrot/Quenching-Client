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
import { useWar3Settings } from '../../hooks/useWar3Settings';
import { useSound } from '../../hooks/useSound';
import { BackgroundVideo } from './BackgroundVideo';
import { LanguageSelector } from './LanguageSelector';
import SettingsModal from './SettingsModal';
import { CampaignModal } from './CampaignModal';
import { ThemeModal } from './ThemeModal';
import { AboutModal } from './AboutModal';
import { NewsPanel } from './NewsPanel';
import { SkinModal } from './SkinModal';
import { ThirdPartyModal } from './ThirdPartyModal';
import { useGlobalLoading } from '../GlobalLoadingProvider';
import { APP_VERSION } from '../../version';
import { isNewerClientVersion } from '../../../shared/client-version';
import { GameChannel, gameChannelFolder } from '../../../shared/game-channel';
import { GraphicsSelection, VersionSelection } from '../../../shared/mod-profile';
import { activeSkinArtSet } from '../../../shared/active-skin-art-set';
// import styles from './MainWindow.module.less';

const { Content } = Layout;
const { Title, Text } = Typography;
const FULL_PACKAGE_GUIDE_URL = 'https://qm.txzy.net/special/players';
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_FOCUS_RECHECK_MS = 5 * 60 * 1000;

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
  selected: 'selected'
};

const PROFILE_STEP_FALLBACKS: Record<string, string> = {
  save: '正在保存这项设置',
  'write-graphics': '正在写入游戏画质偏好',
  'sync-start': '正在同步对应的 MOD 资源',
  environment: '正在同步环境资源',
  dnc: '正在同步昼夜光照',
  shaders: '正在同步着色器',
  skin: '正在切换可破坏物皮肤',
  layout: '正在整理画质目录',
  'layout-water': '正在应用水面布局',
  terrain: '正在应用地形',
  trees: '正在应用树木',
  water: '正在应用水面',
  finish: '正在完成这项设置',
};

const profileStepText = (step: string, translate: (key: string, fallback?: string) => string) =>
  translate(`msg.settings.step.${step}`, PROFILE_STEP_FALLBACKS[step] || '正在应用设置...');

export const MainWindow: React.FC = () => {
  const { t } = useTranslation();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isNewsPanelOpen, setIsNewsPanelOpen] = useState(false);
  const [installedModState, setInstalledModState] = useState<InstalledModState | null>(null);
  const [modUpdateStatus, setModUpdateStatus] = useState<ModUpdateStatus | null>(null);
  const [checkingModUpdate, setCheckingModUpdate] = useState(false);
  const [checkingFullPackageUpdate, setCheckingFullPackageUpdate] = useState(false);
  const [updatingMod, setUpdatingMod] = useState(false);
  const [clientUpdateVersion, setClientUpdateVersion] = useState('');
  const [clientUpdateStatus, setClientUpdateStatus] = useState<ClientUpdateStatus | null>(null);
  const [updatingClient, setUpdatingClient] = useState(false);
  const [clientUpdateProgress, setClientUpdateProgress] = useState('');
  const modStatusRequestId = useRef(0);
  const { showLoading, hideLoading, updateLoading } = useGlobalLoading();

  // War3 检测和MOD安装
  const {
    currentInstallation,
    isInWar3Directory,
    launchGame,
    detectInstallations
  } = useWar3Detector();


  const { modSettings, settings: war3Settings, saveModSettings, saveSettings, loadSettings } = useWar3Settings();

  const [isFullPackageInstalled, setIsFullPackageInstalled] = useState(false);
  const [installingFullPackage, setInstallingFullPackage] = useState(false);
  const [modEnabledUI, setModEnabledUI] = useState(modSettings?.modEnabled ?? true);
  const [branchModStates, setBranchModStates] = useState<Record<GameChannel, { available: boolean; installed: boolean; enabled: boolean }> | null>(null);
  const [isModToggling, setIsModToggling] = useState(false);
  const [modToggleStatus, setModToggleStatus] = useState<{ message: string; percent: number } | null>(null);
  const [installProgress, setInstallProgress] = useState<{ message: string; percent: number } | null>(null);
  const [gameChannel, setGameChannel] = useState<GameChannel>('retail');
  const [switchingChannel, setSwitchingChannel] = useState(false);
  const [switchingGraphics, setSwitchingGraphics] = useState(false);
  const [applyStatus, setApplyStatus] = useState<{ title: string; detail: string; percent?: number } | null>(null);
  const [detectedVersion, setDetectedVersion] = useState('');
  const [installSpace, setInstallSpace] = useState<InstallSpaceStatus | null>(null);
  const [savedGamePath, setSavedGamePath] = useState('');

  useEffect(() => {
    // The detector's first scan may run while the renderer is still mounting.
    // Independently restore the persisted path so a transient probe failure
    // never makes the home page look like the user's choice was forgotten.
    void window.electronAPI?.getConfig('war3Path')
      .then((value) => setSavedGamePath(value || ''))
      .catch((error) => console.warn('Could not read the saved Warcraft III directory:', error));
    void detectInstallations();
  }, []);

  useEffect(() => {
    if (!savedGamePath || currentInstallation) return;
    const retrySavedPath = () => { void detectInstallations(); };
    window.addEventListener('focus', retrySavedPath);
    return () => window.removeEventListener('focus', retrySavedPath);
  }, [savedGamePath, currentInstallation, detectInstallations]);

  const refreshInstallSpace = async () => {
    try {
      setInstallSpace(await window.electronAPI?.getInstallSpaceStatus?.() || null);
    } catch {
      setInstallSpace(null);
    }
  };

  const warnInsufficientInstallSpace = (space: InstallSpaceStatus) => {
    const gib = 1024 ** 3;
    message.warning(`${t('main.space.insufficient')} (${t('main.space.remaining')}: ${(space.freeBytes / gib).toFixed(1)} GiB; ${t('main.space.required')}: ${(space.requiredBytes / gib).toFixed(1)} GiB)`);
  };

  useEffect(() => {
    window.electronAPI?.getConfig('gameChannel').then((value) => {
      setGameChannel(value === 'ptr' ? 'ptr' : 'retail');
    });
  }, []);

  useEffect(() => {
    const handleProgress = (e: any) => {
      setInstallProgress(e.detail);
    };
    window.addEventListener('mod-install-progress', handleProgress);
    return () => window.removeEventListener('mod-install-progress', handleProgress);
  }, []);

  const { playMain, playSmall, playHover } = useSound();

  // 同步全局 Loading 状态
  useEffect(() => {
    const handleProfileProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ step?: string; percent?: number }>).detail;
      if (!detail?.step) return;
      setApplyStatus((prev) => prev ? {
        ...prev,
        detail: profileStepText(detail.step, t),
        percent: detail.percent,
      } : prev);
    };
    window.addEventListener('mod-profile-progress', handleProfileProgress);
    return () => window.removeEventListener('mod-profile-progress', handleProfileProgress);
  }, [t]);

  useEffect(() => {
    if (isModToggling) {
      showLoading(modToggleStatus?.message || t('msg.settings.updating'), modToggleStatus?.percent);
    } else if (installingFullPackage) {
      showLoading(installProgress?.message || t('msg.install.full_package'), installProgress?.percent);
    } else if (updatingMod) {
      showLoading(t('msg.update.applying', '正在下载并安装 MOD 更新...'));
    } else if (switchingGraphics || switchingChannel) {
      showLoading(
        applyStatus?.title || t('msg.settings.updating'),
        applyStatus?.percent,
        applyStatus?.detail,
      );
    } else {
      hideLoading();
    }
  }, [isModToggling, modToggleStatus, installingFullPackage, installProgress, updatingMod, switchingGraphics, switchingChannel, applyStatus, showLoading, hideLoading, t]);

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
    if (!api?.getFullPackageStatus) {
      setIsFullPackageInstalled(false);
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

    try {
      const installed = await api.getFullPackageStatus(war3Path);
      setIsFullPackageInstalled(!!installed);
    } catch (error: any) {
      setIsFullPackageInstalled(false);
      message.error(error?.message || String(error));
    }
  };

  const refreshBranchModStates = async () => {
    try {
      const configuredPath = currentInstallation?.path || await window.electronAPI.getConfig('war3Path');
      if (!configuredPath) {
        setBranchModStates(null);
        return;
      }
      setBranchModStates(await window.electronAPI.getBranchModStates());
    } catch {
      setBranchModStates(null);
    }
  };

  useEffect(() => {
    const onFocus = () => { void refreshBranchModStates(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [currentInstallation?.path]);

  const refreshModUpdateStatus = useCallback(async (war3Path: string): Promise<ModUpdateStatus | null> => {
    const requestId = ++modStatusRequestId.current;
    setCheckingModUpdate(true);
    try {
      const installed = await window.electronAPI.getInstalledModState(war3Path);
      if (requestId === modStatusRequestId.current) setInstalledModState(installed);
      const status = await window.electronAPI.getModUpdateStatus(war3Path);
      if (requestId === modStatusRequestId.current) {
        if (status.decision !== 'unavailable') setModUpdateStatus(status);
        if (status.current) setInstalledModState(status.current);
      }
      return status;
    } catch (error: any) {
      message.error(error?.message || String(error));
      return null;
    } finally {
      if (requestId === modStatusRequestId.current) setCheckingModUpdate(false);
    }
  }, []);

  useEffect(() => {
    refreshFullPackageStatus();
    void refreshBranchModStates();
    refreshInstallSpace();
    if (currentInstallation?.path) {
      console.log('[MainWindow] War3 installation detected, loading settings...', currentInstallation.path);
      loadSettings(currentInstallation.path);
    }
  }, [currentInstallation?.path, gameChannel]);

  useEffect(() => {
    modStatusRequestId.current += 1;
    setInstalledModState(null);
    setModUpdateStatus(null);
    const war3Path = currentInstallation?.path;
    if (!war3Path) return () => { modStatusRequestId.current += 1; };

    let disposed = false;
    let inFlight = false;
    let lastCheckedAt = 0;
    const check = (force = false) => {
      if (disposed || inFlight || (!force && Date.now() - lastCheckedAt < UPDATE_FOCUS_RECHECK_MS)) return;
      lastCheckedAt = Date.now();
      inFlight = true;
      void refreshModUpdateStatus(war3Path).finally(() => { inFlight = false; });
    };
    const onFocus = () => check();
    const onOnline = () => check(true);
    check(true);
    const interval = window.setInterval(() => check(true), UPDATE_CHECK_INTERVAL_MS);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      modStatusRequestId.current += 1;
    };
  }, [currentInstallation?.path, gameChannel, refreshModUpdateStatus]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    let lastCheckedAt = 0;
    const check = (force = false) => {
      if (disposed || inFlight || (!force && Date.now() - lastCheckedAt < UPDATE_FOCUS_RECHECK_MS)) return;
      lastCheckedAt = Date.now();
      inFlight = true;
      void window.electronAPI.getClientUpdateStatus()
        .then(async (status) => {
          if (!disposed) {
            setClientUpdateStatus(status);
            let remote = status.decision === 'available' || status.decision === 'incompatible' ? (status.targetVersion || '') : '';
            if (status.decision === 'unavailable') {
              const gateVersion = await window.electronAPI.fetchVersion().catch(() => '');
              if (isNewerClientVersion(gateVersion, status.currentVersion)) remote = gateVersion;
            }
            if (!disposed) setClientUpdateVersion(remote);
          }
        })
        .catch(() => { /* Keep the last successful result until the next check. */ })
        .finally(() => { inFlight = false; });
    };
    const onFocus = () => check();
    const onOnline = () => check(true);
    check(true);
    const interval = window.setInterval(() => check(true), UPDATE_CHECK_INTERVAL_MS);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => window.electronAPI.onClientUpdateProgress(progress => {
    setClientUpdateProgress(`${progress.message} (${progress.completed}/${progress.total})`);
  }), []);

  const startClientUpdate = useCallback(() => {
    Modal.confirm({
      title: '更新客户端',
      content: '更新包校验完成后，客户端会自动关闭、替换文件并重新启动。请先保存正在进行的操作。',
      okText: '下载并更新',
      cancelText: '取消',
      onOk: async () => {
        setUpdatingClient(true);
        try { await window.electronAPI.applyClientUpdate(); }
        catch (error: any) {
          message.error(`客户端更新失败：${error?.message || String(error)}`);
          setUpdatingClient(false);
        }
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDetectedVersion('');
    if (currentInstallation?.path) {
      window.electronAPI?.detectWar3Version?.(currentInstallation.path)
        .then((info) => {
          if (!cancelled && info?.source !== 'unknown') setDetectedVersion(info.version || '');
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [currentInstallation?.path, gameChannel]);

  const handleChannelChange = (next: GameChannel) => {
    if (next === gameChannel || !branchModStates?.[next]?.available || switchingChannel || switchingGraphics || installingFullPackage || isModToggling || updatingMod) return;
    Modal.confirm({
      centered: true,
      title: t('main.channel.confirm.title', 'Switch game branch'),
      content: t('main.channel.launchOnly', '只切换启动分支；Retail 与 PTR 的 MOD 安装状态不会改变。'),
      okText: t('main.channel.confirm.ok', 'Switch'),
      cancelText: t('main.channel.confirm.cancel', 'Cancel'),
      onOk: async () => {
        setApplyStatus({
          title: `${t('msg.settings.applying', '正在应用')}${t('main.channel.label', '游戏分支')}：${next === 'ptr' ? 'PTR' : 'Retail'}`,
          detail: t('main.channel.launchOnly', '只切换启动分支；Retail 与 PTR 的 MOD 安装状态不会改变。'),
        });
        setSwitchingChannel(true);
        try {
          await window.electronAPI.switchGameChannel(next);
          setGameChannel(next);
          await detectInstallations();
          await refreshFullPackageStatus();
          await refreshBranchModStates();
          await refreshInstallSpace();
          if (currentInstallation?.path) await loadSettings(currentInstallation.path);
        } catch (error: any) {
          message.error(`${t('main.channel.failed', 'Switch failed')}: ${error?.message || error}`);
        } finally {
          setSwitchingChannel(false);
          setApplyStatus(null);
        }
      },
    });
  };

  const graphicsMode = activeSkinArtSet(modSettings?.graphicsSelection, war3Settings?.hd, modSettings?.classicMode, war3Settings?.detectedGraphics);
  const selectedGraphics = modSettings.classicMode ? 'sd' : modSettings.graphicsSelection;
  const handleProfileChange = async (selection: { versionSelection?: VersionSelection; graphicsSelection?: GraphicsSelection }) => {
    if (switchingGraphics || switchingChannel || installingFullPackage || isModToggling || updatingMod) return;
    const war3Path = currentInstallation?.path || await window.electronAPI?.getConfig?.('war3Path');
    if (!war3Path) {
      message.warning(t('install.not_found'));
      return;
    }

    const nextVersion = selection.versionSelection ?? modSettings.versionSelection;
    const nextGraphics = selection.graphicsSelection ?? selectedGraphics;
    const deAllowed = nextVersion === 'v30' || (nextVersion === 'auto' && /^3\./.test(detectedVersion));
    if (selection.graphicsSelection === 'de' && !deAllowed) return;
    // Switching to an older build must also leave DE in the same resource transition.
    const change: { versionSelection?: VersionSelection; graphicsSelection?: GraphicsSelection; classicMode?: boolean } = nextGraphics === 'de' && !deAllowed
      ? { ...selection, graphicsSelection: 'hd' as const }
      : selection;
    // The retired Settings toggle parked whole asset directories. Migrate that
    // state as part of a Home profile change so HD/DE really restores them.
    if (modSettings.classicMode) {
      change.classicMode = false;
      if (selection.graphicsSelection === undefined) change.graphicsSelection = 'sd';
    }

    const versionLabel = (value: VersionSelection) => {
      if (value === 'auto') return t('main.home.auto', '自动检测');
      if (value === 'v1') return t('main.home.v1', '1.36 及以下');
      if (value === 'v20') return '2.0–2.02';
      if (value === 'v203') return '2.03–2.04';
      return t('main.home.v30', '3.0 及以上');
    };
    const graphicsLabel = (value: GraphicsSelection) => {
      if (value === 'auto') return t('main.home.auto', '自动检测');
      if (value === 'sd') return t('main.home.sd', 'SD · 经典');
      if (value === 'de') return t('main.home.de', 'DE · 决定版');
      return t('main.home.hd', 'HD · 高清');
    };
    const named: string[] = [];
    if (change.versionSelection) named.push(`${t('main.home.gameVersion', '魔兽版本')}：${versionLabel(change.versionSelection)}`);
    if (change.graphicsSelection) named.push(`${t('main.home.graphics', '画质模式')}：${graphicsLabel(change.graphicsSelection)}`);
    setApplyStatus({
      title: named.length
        ? `${t('msg.settings.applying', '正在应用')}${named.join('，')}`
        : t('msg.settings.updating', '正在应用设置...'),
      detail: profileStepText('save', t),
      percent: 8,
    });
    setSwitchingGraphics(true);
    try {
      await saveModSettings(war3Path, change, (step, percent) => {
        setApplyStatus((prev) => prev ? { ...prev, detail: profileStepText(step, t), percent } : prev);
      });
      if (!modEnabledUI) {
        message.info(t('main.home.profileSavedForNextEnable', '设置已保存；启用 MOD 后会应用对应资源。'));
      } else {
        message.success(t('msg.settings.updated'));
      }
      await refreshFullPackageStatus(war3Path).catch(() => {});
    } catch (error: any) {
      message.error(`${t('msg.mod.failed')}: ${error?.message || error}`);
      // saveModSettings persists the selection before extraction. Restore the
      // previous UI/config if extraction failed instead of highlighting a pack
      // that was never applied.
      await window.electronAPI?.setConfig?.('modSettings', modSettings).catch(() => {});
      if (change.graphicsSelection !== undefined) {
        await saveSettings(war3Path, { hd: war3Settings.hd }).catch(() => {});
      }
      await loadSettings(war3Path).catch(() => {});
    } finally {
      setSwitchingGraphics(false);
      setApplyStatus(null);
    }
  };

  useEffect(() => {
    setModEnabledUI(branchModStates?.[gameChannel]?.enabled ?? false);
  }, [branchModStates, gameChannel]);

  const handleBranchModToggle = async (channel: GameChannel) => {
    if (isModToggling || updatingMod || installingFullPackage) return;
    if (!branchModStates?.[channel]?.available) return;
    const enabled = !(branchModStates?.[channel]?.enabled ?? false);
    setIsModToggling(true);
    setModToggleStatus({ message: `${channel === 'ptr' ? 'PTR' : 'Retail'} MOD ${enabled ? '启用' : '关闭'}中…`, percent: 0 });
    try {
      const result = await window.electronAPI.setBranchModEnabled(channel, enabled);
      if (result.needsZip) {
        message.warning(t('main.home.basicModeHint', '无需完整包也能开启 MOD 基础功能；完整资源功能需另行安装。'));
        return;
      }
      setBranchModStates(result.states);
      await refreshFullPackageStatus();
      message.success(`${channel === 'ptr' ? 'PTR' : 'Retail'} MOD 已${enabled ? '启用' : '关闭'}`);
    } catch (error: any) {
      message.error(`${t('msg.mod.failed')}: ${error?.message || error}`);
    } finally {
      setIsModToggling(false);
      setModToggleStatus(null);
    }
  };

  // 启动游戏
  const handleStartGame = async () => {
    if (updatingMod) return;
    playMain();
    // 1. 尝试从 Config 获取路径
    let exePath = '';
    if (window.electronAPI?.getConfig) {
      const savedPath = await window.electronAPI.getConfig('war3Path');
      if (savedPath) {
        // 如果是文件夹，拼接可执行文件
        if (!savedPath.endsWith('.exe')) {
          // 简单的猜测逻辑，实际应复用 useWar3Detector 的逻辑
          exePath = savedPath.includes('Warcraft III.exe') ? savedPath : `${savedPath}/${gameChannelFolder(gameChannel)}/x86_64/Warcraft III.exe`;
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
        exePath = path.includes('.exe') ? path : `${path}/${gameChannelFolder(gameChannel)}/x86_64/Warcraft III.exe`;

        // 触发一次重新检测以更新界面状态
        detectInstallations();
        const selected = await window.electronAPI?.getConfig('gameChannel');
        setGameChannel(selected === 'ptr' ? 'ptr' : 'retail');
      } else {
        return; // 用户取消
      }
    }

    // 4. 执行启动
    try {
      if (window.electronAPI?.launchGame) {
        const selected = await window.electronAPI.getConfig('gameChannel');
        const channel: GameChannel = selected === 'ptr' ? 'ptr' : 'retail';
        const states = await window.electronAPI.getBranchModStates();
        setBranchModStates(states);
        if (!states[channel].available) {
          message.error(`${gameChannelFolder(channel)} ${t('main.channel.modMissing', '未安装')}`);
          return;
        }
        // 注意：launchGame 在 Main process 会优先读取 Config 中的 war3Path
        // 所以只要 selectGamePath 成功保存了 Config，这里直接调用即可
        await window.electronAPI.launchGame();
        message.success(t('msg.game.start.success'));
      }
    } catch (error) {
      hideLoading();
      message.error(`${t('msg.game.start.failed')}: ${error.message}`);
    }
  };

  // 更换魔兽目录（仅选择并保存，不直接启动）
  const handleChangeWar3Path = async () => {
    if (updatingMod || checkingFullPackageUpdate || installingFullPackage || switchingGraphics || switchingChannel) return;
    if (!window.electronAPI?.selectGamePath) {
      return;
    }
    const path = await window.electronAPI.selectGamePath();
    if (path) {
      setSavedGamePath(path);
      message.success(`${t('msg.war3.path.set')}: ${path}`);
      // 重新检测安装信息，刷新当前安装显示
      detectInstallations();
      const selected = await window.electronAPI.getConfig('gameChannel');
      setGameChannel(selected === 'ptr' ? 'ptr' : 'retail');
      await refreshBranchModStates();
      refreshInstallSpace();
    }
  };

  // 模态框控制
  const openModal = async (modalType: string) => {
    if (modalType === 'skin') {
      let configured = '';
      try { configured = await window.electronAPI.getConfig('war3Path') || ''; } catch {}
      const normalized = (value: string) => value.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();
      const matches = !!configured && !!currentInstallation?.path && normalized(configured) === normalized(currentInstallation.path);
      let valid = false;
      if (matches && currentInstallation?.isValid) {
        try {
          valid = await window.electronAPI.pathExists(currentInstallation.executablePath) &&
            await window.electronAPI.pathExists(`${currentInstallation.path}/Data`);
        } catch {}
      }
      if (!valid) {
        message.warning(t('skin.panel.needGamePath', '请先在首页设置正确的魔兽争霸 III 目录，再打开涂装。'));
        void detectInstallations();
        return;
      }
    }
    // 检查 MOD 是否开启：涂装 and 设置按钮受限
    if (modalType === 'skin' || modalType === 'settings') {
      if (!modEnabledUI) {
        message.error(t('msg.mod.engine.required'));
        return;
      }
    }

    if (modalType === 'setup' && !currentInstallation) {
      message.warning(t('install.not_found'));
      detectInstallations();
      return;
    }
    playMain(); // 二级菜单入口使用 clickmain
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };


  // 音效播放
  const playHoverSound = () => {
    playHover();
  };

  const openFullPackageGuide = async () => {
    await window.electronAPI.openExternal(FULL_PACKAGE_GUIDE_URL);
  };

  const promptFullPackageGuide = (title: string, description: string) => {
    Modal.confirm({
      title,
      content: description,
      okText: t('main.home.openFullPackageGuide', '获取资源包'),
      cancelText: t('main.home.later', '稍后'),
      onOk: openFullPackageGuide,
    });
  };

  const handleCheckFullPackageUpdate = async () => {
    if (checkingFullPackageUpdate || checkingModUpdate || updatingMod || installingFullPackage || switchingGraphics || switchingChannel || isModToggling) return;
    const war3Path = currentInstallation?.path || await window.electronAPI?.getConfig?.('war3Path');
    if (!war3Path) {
      message.warning(t('install.not_found'));
      return;
    }
    setCheckingFullPackageUpdate(true);
    try {
      const installed = await window.electronAPI.getFullPackageStatus(war3Path);
      setIsFullPackageInstalled(!!installed);
      if (!installed) {
        promptFullPackageGuide(
          t('main.home.fullMissing', '完整版 MOD 尚未安装'),
          t('main.home.fullMissingGuide', '请点击以下链接前往玩家页面下载完整版，再使用左侧按钮选择下载好的 ZIP 安装。')
        );
        return;
      }

      const status = await window.electronAPI.getModUpdateStatus(war3Path);
      setModUpdateStatus(status);
      if (status.decision === 'unavailable' || !status.target) {
        message.warning(t('msg.update.service_unavailable', '更新服务暂不可用，请稍后再试'));
      } else if (!status.current) {
        promptFullPackageGuide(
          t('main.home.fullVersionUnknown', '无法确认完整版版本'),
          t('main.home.fullVersionUnknownGuide', '请前往玩家页面核对并下载最新完整版。')
        );
      } else if (status.current.sequence < status.target.sequence) {
        promptFullPackageGuide(
          t('main.home.fullUpdateAvailable', '发现新版 MOD'),
          `${t('main.home.fullUpdateVersion', '最新 MOD 版本')}：${status.target.displayVersion}。${t('main.home.fullUpdateGuide', '请前往玩家页面确认并下载对应的完整版。')}`
        );
      } else {
        message.info(t('main.home.fullUpToDate', '当前 MOD 版本与线上一致；完整版发布状态请以玩家页面为准'));
      }
    } catch (error: any) {
      message.error(`${t('main.home.fullCheckFailed', '检查完整版更新失败')}: ${error?.message || error}`);
    } finally {
      setCheckingFullPackageUpdate(false);
    }
  };

  const handleModUpdate = async () => {
    if (updatingMod || checkingFullPackageUpdate || installingFullPackage || switchingGraphics || switchingChannel || isModToggling) return;
    const war3Path = currentInstallation?.path || await window.electronAPI?.getConfig?.('war3Path');
    if (!war3Path) {
      message.warning(t('install.not_found'));
      return;
    }

    setUpdatingMod(true);
    try {
      const status = await window.electronAPI.getModUpdateStatus(war3Path);
      setModUpdateStatus(status);
      if (status.current) setInstalledModState(status.current);

      if (status.decision === 'patch') {
        const result = await window.electronAPI.applyModUpdate(war3Path);
        if (!result.applied) throw new Error(result.error || result.status.reason);
        message.success(t('msg.update.success', 'MOD 已更新'));
        await refreshFullPackageStatus(war3Path);
        await refreshModUpdateStatus(war3Path);
      } else if (status.decision === 'requiresFullPackage') {
        promptFullPackageGuide(
          t('main.home.fullMissing', '需要安装完整版 MOD'),
          t('msg.update.full_required', '当前版本无法使用补丁，请下载完整版。')
        );
      } else if (status.decision === 'unknownInstallation') {
        promptFullPackageGuide(
          t('main.home.fullVersionUnknown', '无法确认完整版版本'),
          t('msg.update.unknown_install', '无法确认已安装版本，请重新安装完整版。')
        );
      } else if (status.decision === 'unavailable') {
        message.warning(t('msg.update.service_unavailable', '更新服务暂不可用，请稍后再试'));
      } else {
        message.info(t('msg.update.up_to_date', 'MOD 已是最新版本'));
      }
    } catch (error: any) {
      const detail = String(error?.message || error);
      message.error(/public key is not configured|all manifest sources failed/.test(detail)
        ? t('msg.update.service_unavailable', '更新服务暂不可用，请稍后再试')
        : `${t('msg.update.failed', 'MOD 更新失败')}: ${detail}`);
    } finally {
      setUpdatingMod(false);
    }
  };

  const handleInstallFullPackage = async (targetChannel: GameChannel = gameChannel) => {
    if (updatingMod || checkingFullPackageUpdate || installingFullPackage || switchingGraphics || switchingChannel) return;
    if (!window.electronAPI?.installFullPackage) {
      return;
    }

    try {
      setInstallingFullPackage(true);
      setInstallProgress(null);
      const zipPath = await window.electronAPI.selectFile?.({
        title: t('msg.install.select_zip'),
        filters: [{ name: 'Zip Archive', extensions: ['zip'] }]
      });

      if (!zipPath) {
        setInstallingFullPackage(false);
        return;
      }

      const result = await window.electronAPI.installFullPackage(zipPath, targetChannel);

      if (result && result.success) {
        if (result.skipped) {
          message.info(t('msg.install.already_installed'));
        } else {
          message.success(t('msg.install.success'));
        }
        await refreshFullPackageStatus();
        await refreshBranchModStates();
        const war3Path = currentInstallation?.path || await window.electronAPI.getConfig('war3Path');
        if (war3Path) await refreshModUpdateStatus(war3Path);
      } else if (result && result.error === 'incompletePackage') {
        await refreshFullPackageStatus();
        message.error(t('main.status.full_not_installed'));
      } else if (result && result.error === 'insufficientSpace') {
        const insufficientSpace = { freeBytes: result.freeBytes!, requiredBytes: result.requiredBytes!, insufficient: true, estimate: false };
        setInstallSpace(insufficientSpace);
        warnInsufficientInstallSpace(insufficientSpace);
      } else if (result && result.error === 'noWar3Path') {
        message.error(t('msg.install.no_path'));
      } else if (result && result.error === 'wrongChannel') {
        message.error(t('main.channel.wrong', 'Select the installed game branch first.'));
      } else if (result && result.error === 'noZip') {
        message.error(t('msg.install.invalid_zip'));
      } else {
        message.error(`${t('msg.install.failed')}: ${(result && result.error) || '未知错误'}`);
      }
    } catch (e: any) {
      message.error(`安装失败: ${e && e.message ? e.message : '未知错误'}`);
    } finally {
      setInstallingFullPackage(false);
      refreshInstallSpace();
    }
  };

  const modUpdateAvailable = isFullPackageInstalled && modUpdateStatus?.current && modUpdateStatus.target &&
    modUpdateStatus.current.sequence < modUpdateStatus.target.sequence;

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
      <BackgroundVideo paused={activeModal !== null} />

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
            onClick={() => openModal('thirdParty')}
            style={{ fontSize: '12px', textShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.6)' }}
          >
            {t('main.btn.thirdParty')}
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
            onClick={() => openModal('campaign')}
            style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.6)', fontSize: '12px' }}
          >
            {t('main.btn.campaign')}
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

      <Content className="home-content" style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="home-shell">
          <section className="home-hero" aria-label={t('main.title.primary')}>
            <div className="home-hero-top">
              <span className="home-kicker">{t('main.title.secondary')}</span>
              <span className="home-channel-badge" title={t('main.home.modVersion', 'MOD version')}>
                {installedModState ? `MOD v${(installedModState.displayVersion || installedModState.version).replace(/^v/i, '')}`
                  : isFullPackageInstalled ? `MOD ${t('main.home.installed', '已安装')}` : 'MOD —'}
              </span>
            </div>
            <div className="home-brand">
              <div className={`home-logo-toggle ${modEnabledUI ? '' : 'is-off'}`}>
                <img src="./assets/quenching/logo.png" alt="" />
              </div>
              <div>
                <h1>{t('main.title.primary')}</h1>
                <p>{t('main.home.subtitle', 'Choose your game version and graphics profile before launching.')}</p>
                <span className="home-mod-state">{modEnabledUI ? t('main.home.modOn', 'Quenching MOD enabled') : t('main.home.modOff', 'Quenching MOD disabled')}</span>
                <div className="home-mod-toggle">
                  <button type="button" role="switch" aria-checked={modEnabledUI}
                    disabled={!branchModStates?.[gameChannel]?.available || isModToggling || switchingChannel || switchingGraphics || installingFullPackage || updatingMod}
                    onClick={() => void handleBranchModToggle(gameChannel)}>
                    {isModToggling ? t('main.home.switchingMod', '正在切换 MOD…')
                      : modEnabledUI ? t('main.home.disableMod', '关闭 MOD') : t('main.home.enableMod', '开启 MOD')}
                  </button>
                  {!isFullPackageInstalled && <small>{t('main.home.basicModeHint', '无需完整包也能开启 MOD 基础功能；完整资源功能需另行安装。')}</small>}
                </div>
              </div>
            </div>
            <div className="home-hero-status">
              <span className={`home-status-dot ${currentInstallation && isFullPackageInstalled ? 'is-ready' : ''}`} />
              <div>
                <strong>{currentInstallation
                  ? (isFullPackageInstalled ? t('main.status.full_installed') : t('main.status.full_not_installed'))
                  : t('main.status.no_war3')}</strong>
                <small>{currentInstallation?.path || savedGamePath || t('main.home.selectDirectory', 'Select your Warcraft III directory to begin.')}</small>
              </div>
            </div>
            <div className="home-hero-footer">
              <div className="home-hero-actions">
                <button type="button" disabled={updatingMod || checkingFullPackageUpdate || installingFullPackage || switchingGraphics || switchingChannel}
                  onClick={() => void handleChangeWar3Path()}>{t('main.home.chooseWar3Directory', '选择魔兽目录')}</button>
                <button type="button" onClick={() => void openFullPackageGuide()}>
                  {t('main.home.openFullPackageGuide', '获取资源包')}
                </button>
                <button type="button" disabled={!branchModStates?.[gameChannel]?.available || installingFullPackage || checkingFullPackageUpdate || updatingMod || switchingGraphics || switchingChannel}
                  onClick={() => void handleInstallFullPackage()}>
                  {installingFullPackage ? t('msg.install.installing', '正在安装...') : t('main.home.installFullPackage', '安装资源包')}
                </button>
              </div>
            </div>
          </section>

          <section className="home-control-card" aria-label={t('main.home.config', 'Launch configuration')}>
            <div className="home-card-heading">
              <div>
                <span className="home-kicker">{t('main.home.ready', 'READY TO PLAY')}</span>
                <h2>{t('main.home.config', 'Launch configuration')}</h2>
              </div>
              <span className="home-channel-badge">{gameChannel === 'ptr' ? 'PTR' : 'RETAIL'}</span>
            </div>

            {(clientUpdateVersion || modUpdateAvailable) && (
              <div className="home-update-notices" role="status" aria-live="polite">
                {clientUpdateVersion && (
                  <div className="home-update-notice">
                    <div>
                      <strong>{t('main.home.clientUpdateAvailable', '发现新版客户端')} · {clientUpdateVersion}</strong>
                      <small>{t('main.home.clientUpdateCurrent', '当前客户端')} {clientUpdateStatus?.currentVersion || APP_VERSION}</small>
                    </div>
                    <div className="home-update-actions">
                      {clientUpdateStatus?.decision === 'available' && (
                        <button type="button" disabled={updatingClient} onClick={startClientUpdate}>
                          {updatingClient ? (clientUpdateProgress || '正在准备更新…') : '自动更新客户端'}
                        </button>
                      )}
                      {clientUpdateStatus?.decision !== 'available' && (
                        <button type="button" onClick={() => void window.electronAPI.openExternal('https://qm.txzy.net/qm/qmdownload.html')}>
                          {t('main.home.downloadClient', '下载客户端')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {modUpdateAvailable && (
                  <div className="home-update-notice">
                    <div>
                      <strong>{t('main.home.fullUpdateAvailable', '发现新版 MOD')} · v{modUpdateStatus.target!.displayVersion.replace(/^v/i, '')}</strong>
                      <small>{t('main.home.modUpdateCurrent', '当前 MOD')} v{(modUpdateStatus.current!.displayVersion || modUpdateStatus.current!.version).replace(/^v/i, '')}</small>
                    </div>
                    <div className="home-update-actions">
                      {modUpdateStatus?.decision === 'patch' && (
                        <button type="button" disabled={updatingMod || installingFullPackage || switchingGraphics || switchingChannel}
                          onClick={() => void handleModUpdate()}>{t('main.home.applyModUpdate', '安装 MOD 更新')}</button>
                      )}
                      <button type="button" onClick={() => void openFullPackageGuide()}>
                        {t('main.home.viewFullPackage', '查看完整版')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="home-control-group">
              <div className="home-group-heading">
                <strong>01&nbsp; {t('main.channel.label')}</strong>
                <small>{t('main.channel.launchOnlyHint')}</small>
              </div>
              <div className="home-options home-options-branch" role="group" aria-label={t('main.channel.label')}>
                {(['retail', 'ptr'] as const).map((channel) => (
                  <button key={channel} type="button" className={`home-option ${gameChannel === channel ? 'is-active' : ''}`}
                    aria-pressed={gameChannel === channel}
                    disabled={!branchModStates?.[channel]?.available || switchingChannel || switchingGraphics || installingFullPackage || isModToggling || updatingMod}
                    onClick={() => handleChannelChange(channel)}>{channel === 'ptr' ? 'PTR' : 'Retail'}{branchModStates && !branchModStates[channel].available ? `（${t('main.channel.modMissing')}）` : ''}</button>
                ))}
              </div>
            </div>

            <div className="home-control-group">
              <div className="home-group-heading">
                <strong>Retail / PTR MOD</strong>
                <small>{t('main.channel.modHint')}</small>
              </div>
              <div className="home-options home-options-branch" role="group" aria-label="分支 MOD 开关">
                {(['retail', 'ptr'] as const).map((channel) => {
                  const state = branchModStates?.[channel];
                  return <button key={channel} type="button"
                    className={`home-option ${state?.enabled ? 'is-active' : ''}`}
                    aria-pressed={!!state?.enabled}
                    disabled={!state?.available || switchingChannel || switchingGraphics || installingFullPackage || isModToggling || updatingMod}
                    onClick={() => void handleBranchModToggle(channel)}>
                    {channel === 'ptr' ? 'PTR' : 'Retail'} MOD：{state?.enabled ? t('main.channel.modOn') : t('main.channel.modOff')}
                    {state && !state.available ? `（${t('main.channel.modMissing', '未安装')}）`
                      : state && !state.installed ? `（${t('main.channel.basicOnly', '基础功能')}）` : ''}
                  </button>;
                })}
              </div>
            </div>

            <div className="home-control-group">
              <div className="home-group-heading">
                <strong>02&nbsp; {t('main.home.gameVersion', 'Warcraft III version')}</strong>
                <small>{detectedVersion ? `${t('main.home.detected', 'Detected')}: ${detectedVersion}` : t('main.home.detectUnknown', 'Version not detected')}</small>
              </div>
              <div className="home-options home-options-version" role="group" aria-label={t('main.home.gameVersion', 'Warcraft III version')}>
                {([
                  ['auto', t('main.home.auto', 'Auto')],
                  ['v1', t('main.home.v1', '1.36 or earlier')],
                  ['v20', '2.0–2.02'],
                  ['v203', '2.03–2.04'],
                  ['v30', t('main.home.v30', '3.0 or later')],
                ] as [VersionSelection, string][]).map(([value, label]) => (
                  <button key={value} type="button"
                    className={`home-option ${modSettings.versionSelection === value ? 'is-active' : ''}`}
                    aria-pressed={modSettings.versionSelection === value}
                    disabled={!currentInstallation || switchingGraphics || switchingChannel || installingFullPackage || isModToggling || updatingMod}
                    onClick={() => void handleProfileChange({ versionSelection: value })}>{label}</button>
                ))}
              </div>
            </div>

            <div className="home-control-group">
              <div className="home-group-heading">
                <strong>03&nbsp; {t('main.home.graphics', 'Graphics profile')}</strong>
                <small>{t('main.home.activeGraphics', 'Current')}: {graphicsMode.toUpperCase()}</small>
              </div>
              <div className="home-options home-options-graphics" role="group" aria-label={t('main.home.graphics', 'Graphics profile')}>
                {([
                  ['auto', t('main.home.auto', 'Auto')],
                  ['sd', t('main.home.sd', 'SD · Classic')],
                  ['hd', t('main.home.hd', 'HD · Reforged')],
                  ['de', t('main.home.de', 'DE · Definitive')],
                ] as [GraphicsSelection, string][]).map(([value, label]) => {
                  const deUnavailable = value === 'de' &&
                    modSettings.versionSelection !== 'v30' &&
                    !(modSettings.versionSelection === 'auto' && /^3\./.test(detectedVersion));
                  return (
                    <button key={value} type="button"
                      className={`home-option ${selectedGraphics === value ? 'is-active' : ''}`}
                      aria-pressed={selectedGraphics === value}
                      title={deUnavailable ? t('main.home.deRequires30', 'DE requires Warcraft III 3.0 or later') : undefined}
                      disabled={!currentInstallation || switchingGraphics || switchingChannel || installingFullPackage || isModToggling || updatingMod || deUnavailable}
                      onClick={() => void handleProfileChange({ graphicsSelection: value })}>{label}</button>
                  );
                })}
              </div>
              <small className="home-profile-note">{selectedGraphics === 'de'
                ? t('main.home.deNote', 'DE uses the definitive resource set; classic mode is HD-only.')
                : t('main.home.profileNote', 'Changing this applies the matching MOD resources.')}</small>
            </div>

            {installSpace?.insufficient && (
              <div className="home-space-warning" role="alert">
                {installSpace.estimate ? t('main.space.low') : t('main.space.warning')}:
                {' '}{(installSpace.freeBytes / 1024 ** 3).toFixed(1)} GiB {t('main.space.remaining')},
                {' '}{t(installSpace.estimate ? 'main.space.reserve' : 'main.space.required')}
                {' '}{(installSpace.requiredBytes / 1024 ** 3).toFixed(1)} GiB
              </div>
            )}

            <div className="home-launch-row">
              <div className="home-install-actions">
                <button type="button" disabled={!currentInstallation || updatingMod || checkingModUpdate || checkingFullPackageUpdate || installingFullPackage || switchingGraphics || switchingChannel || isModToggling}
                  onClick={() => void handleModUpdate()}>
                  {updatingMod ? t('msg.update.applying', '正在下载并安装 MOD 更新...')
                    : checkingModUpdate ? t('msg.update.checking', '正在检查更新...')
                    : modUpdateStatus?.decision === 'patch' ? t('msg.update.download', '有新版本，点击自动更新')
                    : t('msg.update.check', '检查 MOD 更新')}
                </button>
                <button type="button" disabled={!currentInstallation || checkingFullPackageUpdate || checkingModUpdate || updatingMod || installingFullPackage || switchingGraphics || switchingChannel || isModToggling}
                  onClick={() => void handleCheckFullPackageUpdate()}>
                  {checkingFullPackageUpdate ? t('msg.update.checking', '正在检查更新...') : t('main.home.checkFullPackageUpdate', '检查完整版更新')}
                </button>
              </div>
              <Button type="primary" icon={<PlayCircleOutlined />} className="home-launch-button"
                onClick={() => void handleStartGame()} onMouseEnter={playHoverSound}
                disabled={(!!branchModStates && !branchModStates[gameChannel].available) || installingFullPackage || switchingGraphics || switchingChannel || isModToggling || updatingMod}>
                {t('main.btn.start')}
              </Button>
            </div>
          </section>
        </div>
        <div className="home-site-link">
          <button type="button" onClick={() => window.electronAPI?.openExternal('https://qm.txzy.net')}>qm.txzy.net</button>
        </div>
      </Content>

      {/* 新闻面板 */}
      <NewsPanel isExpanded={isNewsPanelOpen} onToggle={setIsNewsPanelOpen} />

      {/* 模态框 */}
      <SettingsModal
        open={activeModal === 'settings'}
        onClose={closeModal}
        isFullPackageInstalled={isFullPackageInstalled}
        onModDeleted={() => {
          setInstalledModState(null);
          setModUpdateStatus(null);
          void refreshFullPackageStatus();
        }}
      />

      <CampaignModal
        open={activeModal === 'campaign'}
        onClose={closeModal}
        war3RootPath={currentInstallation?.path}
        onRequestOpenSettings={() => setActiveModal('settings')}
      />

      <ThemeModal
        open={activeModal === 'theme'}
        onClose={closeModal}
      />

      <AboutModal
        open={activeModal === 'about'}
        onClose={closeModal}
      />


      <SkinModal
        open={activeModal === 'skin'}
        onClose={closeModal}
        isFullPackageInstalled={isFullPackageInstalled}
      />

      <ThirdPartyModal
        open={activeModal === 'thirdParty'}
        onClose={closeModal}
      />
    </Layout >
  );
};
