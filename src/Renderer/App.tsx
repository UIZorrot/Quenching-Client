import React, { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { MainWindow } from './components/MainWindow';
import './styles/global.less';
import { GlobalLoadingProvider } from './components/GlobalLoadingProvider';

const App: React.FC = () => {
  useEffect(() => {
    const setupAllowLocalFiles = async () => {
      try {
        const anyWindow = window as any;
        const platform = anyWindow.platform;
        const api = anyWindow.electronAPI;

        if (!platform || !api) return;

        if (platform.isWindows) {
          const keyPath = 'HKEY_CURRENT_USER\\Software\\Blizzard Entertainment\\Warcraft III';
          try {
            await api.writeRegistry(keyPath, 'Allow Local Files', '1', 'REG_DWORD');
          } catch {}
          try {
            await api.writeRegistry(keyPath, 'Quenching', '1.31', 'REG_SZ');
          } catch {}
        } else if (platform.isMacOS) {
          const command = 'defaults write "com.blizzard.Warcraft III" "Allow Local Files" -int 1';
          try {
            await api.executeCommand(command);
          } catch {}
        }
      } catch (error) {
        console.error('Failed to setup Allow Local Files:', error);
      }
    };

    setupAllowLocalFiles();
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#ffd700',
          colorBgBase: '#000000',
          colorTextBase: '#ffffff',
          fontFamily: 'Trajan Pro 3, Microsoft YaHei UI Light, sans-serif'
        }
      }}
    >
      <GlobalLoadingProvider>
        <MainWindow />
      </GlobalLoadingProvider>
    </ConfigProvider>
  );
};

export default App;
