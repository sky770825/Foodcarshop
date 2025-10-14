/**
 * 🚀 应用入口文件
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import './styles/globals.css';

// 检查是否支持 Service Worker（PWA）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // PWA service worker 会在后续添加
    console.log('✅ Service Worker 支持可用');
  });
}

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

