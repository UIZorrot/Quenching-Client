import React, { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { MainWindow } from './components/MainWindow';
import './styles/global.less';
import { GlobalLoadingProvider } from './components/GlobalLoadingProvider';

const App: React.FC = () => {
  useEffect(() => {
    // Run after the launcher has mounted; the IPC returns immediately and
    // registration errors are logged in the main process only.
    const timer = window.setTimeout(() => {
      void window.electronAPI?.ensureLocalFiles().catch((error) => {
        console.warn('Could not schedule local-file registration:', error);
      });
    }, 1000);
    return () => window.clearTimeout(timer);
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
