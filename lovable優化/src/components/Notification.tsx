/**
 * 🔔 通知组件
 */

import { useEffect } from 'react';
import { useUIStore } from '@/stores/useUIStore';

export function Notification() {
  const { notification, hideNotification } = useUIStore();

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        hideNotification();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification.show, hideNotification]);

  if (!notification.show) return null;

  const bgColors = {
    success: '#059669',
    error: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: bgColors[notification.type],
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        animation: 'slideIn 0.3s ease',
        maxWidth: '90vw',
      }}
    >
      {notification.message}
    </div>
  );
}

