import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { Progress, Spin, Typography } from 'antd';

const { Text } = Typography;

interface GlobalLoadingState {
  visible: boolean;
  message: string;
  percent?: number;
}

interface GlobalLoadingContextType {
  showLoading: (message: string, percent?: number) => void;
  hideLoading: () => void;
  updateLoading: (message: string, percent?: number) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

export const GlobalLoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<GlobalLoadingState>({
    visible: false,
    message: '',
  });

  const showLoading = useCallback((message: string, percent?: number) => {
    setLoadingState({
      visible: true,
      message,
      percent,
    });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(prev => ({ ...prev, visible: false }));
  }, []);

  const updateLoading = useCallback((message: string, percent?: number) => {
    setLoadingState(prev => {
      if (!prev.visible) return prev;
      return { ...prev, message, percent };
    });
  }, []);

  return (
    <GlobalLoadingContext.Provider value={{ showLoading, hideLoading, updateLoading }}>
      {children}
      {loadingState.visible && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '32px 48px',
              background: 'rgba(0, 0, 0, 0)',
              borderRadius: 16,
              border: '1px solid rgba(212, 175, 55, 0)',
              boxShadow: '0 0 40px rgba(0, 0, 0, 0)'
            }}
          >
            {typeof loadingState.percent === 'number' ? (
              <Progress
                type="circle"
                percent={Math.max(0, Math.min(100, Math.round(loadingState.percent)))}
                size={72}
                strokeColor="#d4af37"
                trailColor="rgba(212, 175, 55, 0.15)"
                format={(percent) => <span style={{ color: '#d4af37', fontSize: 14 }}>{percent}%</span>}
              />
            ) : (
              <Spin size="large" />
            )}
            <Text style={{ color: '#d4af37', fontSize: 16, fontWeight: 500 }}>{loadingState.message}</Text>
          </div>
        </div>,
        document.body
      )}
    </GlobalLoadingContext.Provider>
  );
};
