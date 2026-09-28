import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface GlobalLoadingState {
  visible: boolean;
  message: string;
  percent?: number;
  detail?: string;
}

interface GlobalLoadingContextType {
  showLoading: (message: string, percent?: number, detail?: string) => void;
  hideLoading: () => void;
  updateLoading: (message: string, percent?: number, detail?: string) => void;
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

  const showLoading = useCallback((message: string, percent?: number, detail?: string) => {
    setLoadingState({
      visible: true,
      message,
      percent,
      detail,
    });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(prev => prev.visible ? { ...prev, visible: false } : prev);
  }, []);

  const updateLoading = useCallback((message: string, percent?: number, detail?: string) => {
    setLoadingState(prev => {
      if (!prev.visible) return prev;
      return { ...prev, message, percent, detail: detail === undefined ? prev.detail : detail };
    });
  }, []);

  return (
    <GlobalLoadingContext.Provider value={{ showLoading, hideLoading, updateLoading }}>
      {children}
      {loadingState.visible && ReactDOM.createPortal(
        <div className="global-loading-overlay" role="alertdialog" aria-modal="true" aria-live="polite" aria-busy="true">
          <div className="global-loading-card">
            <div className="global-loading-title">{loadingState.message}</div>
            {loadingState.detail ? <div className="global-loading-detail">{loadingState.detail}</div> : null}
            <div className="global-loading-track" aria-hidden="true">
              {typeof loadingState.percent === 'number' && loadingState.percent > 0 ? (
                <div
                  className="global-loading-fill"
                  style={{ width: `${Math.max(0, Math.min(100, loadingState.percent))}%` }}
                />
              ) : (
                <div className="global-loading-fill is-indeterminate" />
              )}
            </div>
            {typeof loadingState.percent === 'number' && loadingState.percent > 0 ? (
              <div className="global-loading-percent">{Math.round(loadingState.percent)}%</div>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </GlobalLoadingContext.Provider>
  );
};
