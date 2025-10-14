/**
 * 🔧 Service Worker - PWA 離線支持
 * 提供基本的快取策略和離線功能
 */

const CACHE_NAME = 'foodcar-order-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安裝中...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 快取資源');
      return cache.addAll(urlsToCache);
    })
  );
  
  // 立即激活新的 Service Worker
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 立即控制所有頁面
  return self.clients.claim();
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 對於 API 請求，採用 Network First 策略
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 克隆響應（因為 response 只能使用一次）
          const responseClone = response.clone();
          
          // 如果是成功的響應，更新快取
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // 網路失敗時，嘗試從快取中讀取
          return caches.match(request);
        })
    );
    return;
  }
  
  // 對於靜態資源，採用 Cache First 策略
  event.respondWith(
    caches.match(request).then((response) => {
      // 快取命中，直接返回
      if (response) {
        return response;
      }
      
      // 快取未命中，從網路獲取
      return fetch(request).then((response) => {
        // 只快取成功的 GET 請求
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'error' ||
          request.method !== 'GET'
        ) {
          return response;
        }
        
        // 克隆響應並存入快取
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        
        return response;
      });
    })
  );
});

// 推播通知（預留，未來可擴展）
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 收到推播:', event);
  
  const options = {
    body: event.data ? event.data.text() : '您的訂單已更新',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'order-notification',
    requireInteraction: true,
  };
  
  event.waitUntil(
    self.registration.showNotification('極品鹽水雞', options)
  );
});

// 點擊推播通知
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知被點擊:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

