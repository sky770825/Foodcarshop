/**
 * 🖼️ 图片放大模态框组件
 */

import { useEffect } from 'react';
import { useUIStore } from '@/stores/useUIStore';

export function ImageModal() {
  const { imageModal, closeImageModal } = useUIStore();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && imageModal.isOpen) {
        closeImageModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [imageModal.isOpen, closeImageModal]);

  if (!imageModal.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalImageLabel"
      aria-describedby="modalImageDesc"
      tabIndex={-1}
      onClick={closeImageModal}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.8)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn .2s ease',
      }}
    >
      <img
        src={imageModal.imageSrc}
        alt={imageModal.imageAlt}
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          borderRadius: 'var(--radius)',
          animation: 'zoomIn .2s ease',
        }}
      />
      <span id="modalImageLabel" className="sr-only">
        圖片放大檢視
      </span>
      <span id="modalImageDesc" className="sr-only">
        點擊任意處關閉，或按 ESC 鍵退出
      </span>
    </div>
  );
}

