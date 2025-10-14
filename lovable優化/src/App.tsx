/**
 * 🚀 主应用组件
 */

import { useEffect, useState } from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Header } from './components/Header';
import { OrderForm } from './components/OrderForm';
import { ImageModal } from './components/ImageModal';
import { Notification } from './components/Notification';
import { LoadingOverlay } from './components/LoadingOverlay';
import { useInventory } from './hooks/useInventory';
import { useUIStore } from './stores/useUIStore';
import { checkAuthorization } from './services/api';
import type { AuthResponse } from './types';

export function App() {
  const { openImageModal } = useUIStore();
  const { loadInventory } = useInventory();
  const [isLoading, setIsLoading] = useState(true);
  const [authData, setAuthData] = useState<AuthResponse | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // 🚀 并行加载授权和库存
        const [auth] = await Promise.allSettled([
          checkAuthorization(),
          loadInventory(),
        ]);

        // 检查授权结果
        if (auth.status === 'fulfilled' && !auth.value.authorized) {
          setAuthData(auth.value);
          return;
        }

        // 如果授权即将到期，可以在这里显示警告
        if (auth.status === 'fulfilled' && auth.value.showWarning) {
          // TODO: 显示到期警告横幅
        }

        console.log('✅ 系统初始化完成');
      } catch (err) {
        console.error('初始化错误:', err);
      } finally {
        // 确保至少显示 2.5 秒加载画面
        setTimeout(() => {
          setIsLoading(false);
        }, 2500);
      }
    };

    initialize();
  }, [loadInventory]);

  // 处理 Logo 点击
  const handleLogoClick = () => {
    openImageModal(
      'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&h=800&fit=crop&q=80',
      '極品鹽水雞 品牌標誌'
    );
  };

  // 如果授权失效，显示授权页面
  if (authData && !authData.authorized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fef9f3 0%, #faf5ed 100%)',
        padding: '20px',
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: 'white',
          borderRadius: '16px',
          padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,.15)',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '36px',
            marginBottom: '16px',
          }}>🔒</div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#dc2626',
            marginBottom: '16px',
          }}>
            授權已{authData.reason === 'expired' ? '到期' : '停用'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '24px',
          }}>
            {authData.msg || '請聯繫客服進行續費'}
          </p>
          <a
            href="https://lin.ee/YyXagFg"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
              color: 'white',
              padding: '13px 32px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              boxShadow: '0 6px 20px rgba(217,119,6,.4)',
            }}
          >
            📞 聯繫客服
          </a>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>極品鹽水雞｜線上預訂</title>
        <meta name="description" content="極品鹽水雞線上訂購系統 - 新鮮美味，現點現做" />
        <meta property="og:title" content="極品鹽水雞｜線上預訂" />
        <meta property="og:description" content="極品鹽水雞線上訂購系統 - 新鮮美味，現點現做" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* 加载遮罩 */}
      <LoadingOverlay show={isLoading} />

      {/* 跳转至主要内容链接（无障碍） */}
      <a
        href="#main-content"
        className="sr-only"
        style={{
          position: 'absolute',
          top: '-100px',
          left: '10px',
          zIndex: 10000,
          background: 'var(--primary)',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '6px',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        ⬇️ 跳至主要內容
      </a>

      {/* 顶部导航栏 */}
      <Header onLogoClick={handleLogoClick} />

      {/* 主要内容 */}
      <main id="main-content" role="main">
        <OrderForm />
      </main>

      {/* 底部版权信息 */}
      <footer
        role="contentinfo"
        style={{
          textAlign: 'center',
          padding: 'clamp(20px, 5vw, 30px) clamp(12px, 3vw, 16px)',
          color: 'var(--muted)',
          fontSize: 'clamp(10px, 2.2vw, 11px)',
          lineHeight: 1.8,
          borderTop: '1px solid var(--border)',
          background: '#fafafa',
          marginTop: 'clamp(20px, 5vw, 30px)',
        }}
      >
        <div>
          系統開發：
          <a
            href="https://lin.ee/YyXagFg"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            快閃餐車小幫手
          </a>{' '}
          <span>©</span> 2025
        </div>
        <div style={{ marginTop: '8px', fontSize: 'clamp(9px, 2vw, 10px)', color: '#9ca3af' }}>
          ⚠️ 本系統受著作權法保護，未經授權不得複製、修改或用於商業用途
        </div>
      </footer>

      {/* 全局组件 */}
      <ImageModal />
      <Notification />
    </HelmetProvider>
  );
}

