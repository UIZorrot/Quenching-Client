import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSound } from '../../hooks/useSound';

interface OverlayModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: number | string;
  titleFont?: string;
}

export const OverlayModal: React.FC<OverlayModalProps> = ({
  open,
  onClose,
  children,
  title,
  width = '80%',
  titleFont = "'Trajan Pro 3', serif"
}) => {
  const { playHover } = useSound();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible && !open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: open ? 'auto' : 'none'
      }}
    >
      {/* 背景遮罩 - 黑色半透明 */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          opacity: open ? 1 : 0,
          transition: 'opacity 0.3s ease',
          cursor: 'pointer'
        }}
      />

      {/* 内容容器 */}
      <div
        style={{
          position: 'relative',
          width: width,
          maxWidth: '1200px',
          height: '85vh',
          background: 'transparent',
          zIndex: 2001,
          opacity: open ? 1 : 0,
          transform: open ? 'scale(1)' : 'scale(0.95)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 标题栏 */}
        {title && (
          <div style={{
            padding: '20px 0',
            textAlign: 'center',
            color: '#d4af37',
            fontSize: '2rem',
            fontFamily: titleFont,
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
            marginBottom: '20px'
          }}>
            {title}
          </div>
        )}

        {/* 内容区域 - 可滚动 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d4af37 rgba(0,0,0,0.3)'
        }}>
          {children}
        </div>

        {/* 关闭按钮 (右上角) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            color: '#d4af37',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #d4af37',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.8)',
            transition: 'all 0.2s',
            zIndex: 3000
          }}
          onMouseEnter={e => {
            playHover();
            e.currentTarget.style.background = '#d4af37';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
            e.currentTarget.style.color = '#d4af37';
          }}
        >
          ×
        </div>
      </div>
    </div>,
    document.body
  );
};
