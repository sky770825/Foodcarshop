/**
 * 🎯 顶部导航栏组件
 */

import { useUIStore } from '@/stores/useUIStore';

interface HeaderProps {
  onLogoClick?: () => void;
}

export function Header({ onLogoClick }: HeaderProps) {
  const { isDarkMode, toggleDarkMode } = useUIStore();

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
  };

  const handleLogoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLogoClick();
    }
  };

  return (
    <header
      className="brand-header"
      role="banner"
      style={{
        background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
        color: '#fff',
        padding: 'clamp(12px, 3vw, 18px) clamp(12px, 3vw, 16px)',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(217,119,6,.25)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(8px, 2vw, 12px)',
          marginBottom: '4px',
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop&q=80"
          alt="極品鹽水雞 品牌標誌"
          role="button"
          tabIndex={0}
          aria-label="點擊放大查看品牌標誌"
          onClick={handleLogoClick}
          onKeyDown={handleLogoKeyDown}
          style={{
            width: 'clamp(40px, 10vw, 56px)',
            height: 'clamp(40px, 10vw, 56px)',
            borderRadius: '50%',
            background: '#fff',
            padding: '6px',
            cursor: 'pointer',
            transition: 'transform .2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          }}
        />
        <div>
          <h1
            style={{
              fontSize: 'clamp(20px, 4.5vw, 24px)',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '0.5px',
            }}
          >
            極品鹽水雞
          </h1>
          <p
            style={{
              fontSize: 'clamp(12px, 2.5vw, 13px)',
              opacity: 0.9,
              margin: '2px 0 0',
              fontWeight: 400,
            }}
            aria-label="定點餐車，可預訂取餐"
          >
            📍 定點餐車｜預訂取餐
          </p>
        </div>
      </div>

      {/* 深色模式切换按钮 */}
      <button
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
        style={{
          position: 'absolute',
          top: 'clamp(12px, 3vw, 18px)',
          right: 'clamp(12px, 3vw, 16px)',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: 'clamp(32px, 8vw, 40px)',
          height: 'clamp(32px, 8vw, 40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'clamp(16px, 4vw, 20px)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>
    </header>
  );
}

