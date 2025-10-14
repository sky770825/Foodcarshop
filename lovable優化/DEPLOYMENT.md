# 🚀 部署指南

本文檔提供詳細的部署步驟，幫助您快速將應用部署到生產環境。

## 📋 部署前檢查清單

### 1. 環境配置

確保已正確配置以下內容：

```typescript
// src/types/index.ts

export const API_ENDPOINTS = {
  auth: 'YOUR_AUTH_API_URL',      // ✅ 授權管理 API
  order: 'YOUR_ORDER_API_URL',    // ✅ 訂單系統 API
};

export const WEBSITE_ID = 'WEB001'; // ✅ 網站授權 ID
```

### 2. 測試檢查

```bash
# 執行 ESLint 檢查
npm run lint

# 執行類型檢查
npx tsc --noEmit

# 本地構建測試
npm run build
npm run preview
```

## 🌐 部署方式

### 方式一：Vercel 部署（推薦）

#### 1. 安裝 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登入 Vercel

```bash
vercel login
```

#### 3. 部署

```bash
# 首次部署
vercel

# 生產環境部署
vercel --prod
```

#### 4. 環境變量配置

在 Vercel 控制台中設置環境變量：

```
VITE_AUTH_API=your_auth_api_url
VITE_ORDER_API=your_order_api_url
VITE_WEBSITE_ID=WEB001
```

### 方式二：Netlify 部署

#### 1. 創建 `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

#### 2. 部署

```bash
# 安裝 Netlify CLI
npm install -g netlify-cli

# 登入
netlify login

# 部署
netlify deploy --prod
```

### 方式三：傳統伺服器部署

#### 1. 構建應用

```bash
npm run build
```

#### 2. 上傳文件

將 `dist/` 目錄中的所有文件上傳到伺服器的 web 根目錄。

#### 3. Nginx 配置範例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/foodcar-order/dist;
    index index.html;

    # Gzip 壓縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 快取設置
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安全標頭
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### 4. Apache 配置範例

創建 `.htaccess` 文件：

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Gzip 壓縮
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# 快取控制
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

## 🔐 SSL 證書配置

### 使用 Let's Encrypt（免費）

```bash
# 安裝 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 獲取證書（Nginx）
sudo certbot --nginx -d your-domain.com

# 獲取證書（Apache）
sudo certbot --apache -d your-domain.com

# 自動續期
sudo certbot renew --dry-run
```

## 📊 性能優化建議

### 1. CDN 配置

推薦使用 CDN 加速靜態資源：
- Cloudflare（免費）
- AWS CloudFront
- 阿里雲 CDN

### 2. 圖片優化

```bash
# 使用 ImageMagick 批量壓縮圖片
mogrify -quality 85 -resize 800x800 *.jpg
mogrify -quality 85 -resize 800x800 *.png
```

### 3. 預載入關鍵資源

在 `index.html` 中添加：

```html
<link rel="preload" href="/assets/main.js" as="script">
<link rel="preload" href="/assets/main.css" as="style">
```

## 🔍 監控與分析

### 1. Google Analytics

在 `index.html` 中添加追蹤代碼：

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 2. 錯誤監控

推薦使用 Sentry 進行錯誤監控：

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

## 📱 PWA 部署配置

### 1. 生成圖標

使用 [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) 生成圖標：

```bash
npx pwa-asset-generator logo.png ./public/icons --background "#fef9f3" --splash-only
```

### 2. 註冊 Service Worker

已在 `src/main.tsx` 中自動註冊。

### 3. HTTPS 要求

PWA 必須在 HTTPS 環境下運行（localhost 除外）。

## 🧪 部署後測試

### 1. 功能測試

- ✅ 場地選擇功能
- ✅ 商品加入購物車
- ✅ 訂單提交
- ✅ 庫存更新
- ✅ 圖片放大功能
- ✅ 深色模式切換

### 2. 性能測試

使用 [Lighthouse](https://developers.google.com/web/tools/lighthouse) 測試：

```bash
npm install -g lighthouse
lighthouse https://your-domain.com --view
```

目標分數：
- Performance: >= 90
- Accessibility: >= 95
- Best Practices: >= 90
- SEO: >= 90

### 3. 跨瀏覽器測試

- Chrome (最新版)
- Firefox (最新版)
- Safari (iOS 14+)
- Edge (最新版)

### 4. 移動裝置測試

- iOS Safari
- Android Chrome
- 微信內建瀏覽器

## 🔄 持續集成/持續部署 (CI/CD)

### GitHub Actions 範例

創建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          VITE_AUTH_API: ${{ secrets.AUTH_API }}
          VITE_ORDER_API: ${{ secrets.ORDER_API }}
          VITE_WEBSITE_ID: ${{ secrets.WEBSITE_ID }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📞 技術支援

如遇部署問題，請聯繫：

- **LINE 官方帳號**：https://lin.ee/YyXagFg
- **Email**：[email protected]
- **技術支援時間**：週一至週五 09:00-18:00

## 🔗 相關資源

- [Vite 部署文檔](https://vitejs.dev/guide/static-deploy.html)
- [React 部署文檔](https://react.dev/learn/start-a-new-react-project#deploying-to-production)
- [PWA 部署指南](https://web.dev/progressive-web-apps/)
- [Nginx 文檔](https://nginx.org/en/docs/)

---

最後更新：2025-01-XX

