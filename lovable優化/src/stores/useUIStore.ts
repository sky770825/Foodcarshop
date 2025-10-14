/**
 * 🎨 UI 状态管理
 * 管理主题、模态框、通知等 UI 状态
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  // 主题
  theme: Theme;
  isDarkMode: boolean;
  
  // 模态框
  imageModal: {
    isOpen: boolean;
    imageSrc: string;
    imageAlt: string;
  };
  
  // 通知
  notification: {
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };
  
  // 加载状态
  isSubmitting: boolean;
  
  // 分类展开状态
  expandedCategories: Set<string>;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
  openImageModal: (src: string, alt: string) => void;
  closeImageModal: () => void;
  showNotification: (type: UIState['notification']['type'], message: string) => void;
  hideNotification: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  toggleCategory: (category: string) => void;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;
}

// 检测系统主题偏好
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        isDarkMode: getSystemTheme() === 'dark',
        imageModal: {
          isOpen: false,
          imageSrc: '',
          imageAlt: '',
        },
        notification: {
          show: false,
          type: 'info',
          message: '',
        },
        isSubmitting: false,
        expandedCategories: new Set(),

        setTheme: (theme) => {
          const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');
          set({ theme, isDarkMode: isDark });
          
          // 更新 HTML 属性
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
          }
        },

        toggleDarkMode: () => {
          const { isDarkMode } = get();
          const newTheme = isDarkMode ? 'light' : 'dark';
          get().setTheme(newTheme);
        },

        openImageModal: (src, alt) => {
          set({
            imageModal: {
              isOpen: true,
              imageSrc: src,
              imageAlt: alt,
            },
          });
          
          // 锁定背景滚动
          if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
          }
        },

        closeImageModal: () => {
          set({
            imageModal: {
              isOpen: false,
              imageSrc: '',
              imageAlt: '',
            },
          });
          
          // 恢复滚动
          if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
          }
        },

        showNotification: (type, message) => {
          set({
            notification: {
              show: true,
              type,
              message,
            },
          });
          
          // 3秒后自动隐藏
          setTimeout(() => {
            get().hideNotification();
          }, 3000);
        },

        hideNotification: () => {
          set((state) => ({
            notification: {
              ...state.notification,
              show: false,
            },
          }));
        },

        setSubmitting: (isSubmitting) => set({ isSubmitting }),

        toggleCategory: (category) => {
          set((state) => {
            const newExpanded = new Set(state.expandedCategories);
            if (newExpanded.has(category)) {
              newExpanded.delete(category);
            } else {
              newExpanded.add(category);
            }
            return { expandedCategories: newExpanded };
          });
        },

        expandAllCategories: () => {
          // 需要从 inventory store 获取所有分类名称
          // 这里暂时留空，在组件中调用时传入
          set({ expandedCategories: new Set() });
        },

        collapseAllCategories: () => {
          set({ expandedCategories: new Set() });
        },
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({ theme: state.theme }), // 只持久化主题设置
      }
    ),
    { name: 'UIStore' }
  )
);

// 监听系统主题变化
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useUIStore.getState();
    if (store.theme === 'system') {
      store.setTheme('system');
    }
  });
}

