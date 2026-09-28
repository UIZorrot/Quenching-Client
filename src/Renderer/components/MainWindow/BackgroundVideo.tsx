import React, { useRef, useEffect, useState } from 'react';
import styles from './BackgroundVideo.module.less';

// 检查 styles 是否存在，避免 undefined 错误
const safeStyles = styles || {
  backgroundVideo: 'background-video',
  video: 'video',
  overlay: 'overlay'
};

interface BackgroundVideoProps {
  volume?: number;
  opacity?: number;
  paused?: boolean;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  volume = 0,
  opacity = 0.65,
  paused = false
}) => {
  const resolveAssetPath = (rel: string) => {
    const p = rel.startsWith('/') ? rel.slice(1) : rel;
    if (window.location.protocol === 'file:') {
      return new URL(p, document.baseURI).href;
    }
    return rel.startsWith('/') ? rel : `/${rel}`;
  };
  const [currentTheme, setCurrentTheme] = useState('magicstorm');
  const [videoSources, setVideoSources] = useState({
    active: '',
    next: ''
  });
  const [fadeState, setFadeState] = useState<'idle' | 'fading'>('idle');

  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const [activeVideo, setActiveVideo] = useState<1 | 2>(1);

  // 视频源映射
  const themeVideos: Record<string, string> = {
    'magicstorm': 'assets/quenching/magicstorm.mp4',
    'roc': 'assets/quenching/mainmenu1.mp4', // 混乱之治
    'tft': 'assets/quenching/mainmenu0.mp4', // 冰封王座
    'quenching': 'assets/quenching/mainmenu2.mp4',
    'warcraft2': 'assets/quenching/mainmenu3.mp4',
    'city': 'assets/quenching/mainmenu4.mp4',
    'plaguelands': 'assets/quenching/mainmenu5.mp4'
  };

  // 初始化加载
  useEffect(() => {
    const loadTheme = async () => {
      console.log('[BackgroundVideo] Starting to load theme...');
      try {
        let themeId = 'magicstorm';
        if (window.electronAPI?.getConfig) {
          const savedTheme = await window.electronAPI.getConfig('theme');
          if (savedTheme) themeId = savedTheme;
        }

        console.log('[BackgroundVideo] Current theme ID:', themeId);
        setCurrentTheme(themeId);

        let initialSrc = '';
        if (themeId.startsWith('custom-')) {
          const customThemes = await window.electronAPI?.getConfig('customThemes');
          const theme = customThemes?.find((t: any) => t.id === themeId);
          initialSrc = theme?.videoPath || themeVideos['magicstorm'];
        } else {
          initialSrc = themeVideos[themeId] || themeVideos['magicstorm'];
        }

        console.log('[BackgroundVideo] Setting initial video source:', initialSrc);
        setVideoSources({ active: resolveAssetPath(initialSrc), next: '' });
      } catch (error) {
        console.error('[BackgroundVideo] Failed to load theme, falling back to magicstorm:', error);
        setVideoSources({ active: resolveAssetPath(themeVideos['magicstorm']), next: '' });
      }
    };

    loadTheme();
  }, []);

  // 只给当前视频设置资源；播放由可见性统一控制。
  useEffect(() => {
    const activeRef = activeVideo === 1 ? videoRef1 : videoRef2;
    if (activeRef.current && videoSources.active) {
      if (!activeRef.current.src.endsWith(videoSources.active)) {
        activeRef.current.src = videoSources.active;
        activeRef.current.load();
      }
    }
  }, [videoSources.active, activeVideo]);

  // 遮罩弹窗和窗口不可见时，后台视频不再持续解码、与 3D 预览争抢 GPU。
  useEffect(() => {
    const syncPlayback = () => {
      const first = videoRef1.current, second = videoRef2.current;
      if (paused || document.hidden) {
        first?.pause(); second?.pause();
        return;
      }
      if (fadeState !== 'fading') {
        const active = activeVideo === 1 ? first : second;
        const inactive = activeVideo === 1 ? second : first;
        inactive?.pause();
        if (active?.src) active.play().catch(error => console.warn('[BackgroundVideo] Playback failed:', error));
      }
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => document.removeEventListener('visibilitychange', syncPlayback);
  }, [paused, activeVideo, fadeState, videoSources.active]);

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = async (e: any) => {
      if (e.detail) {
        const newThemeId = e.detail;
        let newSrc = '';

        if (newThemeId.startsWith('custom-')) {
          const customThemes = await window.electronAPI?.getConfig('customThemes');
          const theme = customThemes?.find((t: any) => t.id === newThemeId);
          newSrc = theme?.videoPath || themeVideos['magicstorm'];
        } else {
          newSrc = themeVideos[newThemeId] || themeVideos['magicstorm'];
        }

        setVideoSources(prev => {
          if (newSrc !== prev.active) {
            setFadeState('fading');
            setCurrentTheme(newThemeId);
            return { ...prev, next: (window.location.protocol === 'file:' ? new URL(newSrc.startsWith('/') ? newSrc.slice(1) : newSrc, document.baseURI).href : (newSrc.startsWith('/') ? newSrc : `/${newSrc}`)) };
          }
          return prev;
        });
      }
    };

    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  // 处理渐变逻辑
  useEffect(() => {
    if (!paused && fadeState === 'fading' && videoSources.next) {
      const nextVideo = activeVideo === 1 ? videoRef2.current : videoRef1.current;
      const currentVideo = activeVideo === 1 ? videoRef1.current : videoRef2.current;

      if (nextVideo && currentVideo) {
        nextVideo.src = videoSources.next;
        nextVideo.load();

        const onCanPlay = () => {
          nextVideo.play().then(() => {
            // 切换激活视频
            currentVideo.pause();
            setActiveVideo(activeVideo === 1 ? 2 : 1);
            setVideoSources({ active: videoSources.next, next: '' });
            setTimeout(() => {
              setFadeState('idle');
            }, 1000); // 1s 渐变时间
          }).catch(console.error);
        };

        nextVideo.addEventListener('canplay', onCanPlay, { once: true });
        return () => nextVideo.removeEventListener('canplay', onCanPlay);
      }
    }
  }, [fadeState, videoSources.next, paused]);

  return (
    <div
      className={safeStyles.backgroundVideo}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0, // 放在最底层
        overflow: 'hidden',
        backgroundColor: '#000'
      }}
    >
      {/* 视频层 1 */}
      <video
        ref={videoRef1}
        className={safeStyles.video}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          // 移除 transform 和 translate 以防止亚像素模糊
          objectFit: 'cover',
          opacity: activeVideo === 1 ? 1 : 0,
          transition: 'opacity 1s ease-in-out',
          zIndex: activeVideo === 1 ? 1 : 0
        }}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => console.log('[BackgroundVideo] Video 1 loaded data')}
        onError={(e) => console.error('[BackgroundVideo] Video 1 error:', e)}
      />

      {/* 视频层 2 */}
      <video
        ref={videoRef2}
        className={safeStyles.video}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          // 移除 transform 和 translate 以防止亚像素模糊
          objectFit: 'cover',
          opacity: activeVideo === 2 ? 1 : 0,
          transition: 'opacity 1s ease-in-out',
          zIndex: activeVideo === 2 ? 1 : 0
        }}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => console.log('[BackgroundVideo] Video 2 loaded data')}
        onError={(e) => console.error('[BackgroundVideo] Video 2 error:', e)}
      />

      {/* 遮罩层 */}
      <div
        className={safeStyles.overlay}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.4) 100%)',
          zIndex: 2,
          opacity
        }}
      />
    </div>
  );
};
