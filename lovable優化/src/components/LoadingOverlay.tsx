/**
 * ⏳ 加载遮罩组件
 */

interface LoadingOverlayProps {
  show: boolean;
}

export function LoadingOverlay({ show }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="頁面載入中"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        transition: 'opacity .3s ease',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: 'clamp(20px, 5vw, 30px)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            fontSize: 'clamp(48px, 12vw, 64px)',
            marginBottom: 'clamp(12px, 3vw, 16px)',
            animation: 'bounce 1s ease-in-out infinite',
          }}
        >
          🍗
        </div>
        <div
          style={{
            fontSize: 'clamp(14px, 3.5vw, 16px)',
            fontWeight: 600,
            color: 'var(--primary)',
            marginBottom: '8px',
          }}
        >
          載入中...
        </div>
        <div
          style={{
            fontSize: 'clamp(11px, 2.5vw, 12px)',
            color: 'var(--muted)',
          }}
        >
          請稍候
        </div>
      </div>
    </div>
  );
}

