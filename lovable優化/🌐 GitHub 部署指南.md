# 🌐 GitHub 部署指南

## ⚠️ 重要差異

### HTML 版本 vs React 版本

```
HTML 版本：
┌─────────────────────────┐
│ cheenken.html           │ ← 直接上傳 GitHub
│                         │
│ ✅ 可以直接打開使用     │
│ ✅ GitHub Pages 直接運行│
│ ✅ 不需要任何處理       │
└─────────────────────────┘

React 版本：
┌─────────────────────────┐
│ src/ (TypeScript)       │ ← 原始碼（無法直接用）
│ ├─ components/          │
│ └─ ...                  │
│                         │
│ ❌ 不能直接打開         │
│ ❌ 需要先構建           │
│ ❌ 需要 Node.js 環境    │
└─────────────────────────┘
      ↓ npm run build
┌─────────────────────────┐
│ dist/ (編譯後)          │ ← 這個才能用！
│ ├─ index.html           │
│ ├─ assets/              │
│ │  ├─ main.js          │
│ │  └─ main.css         │
│ └─ ...                  │
│                         │
│ ✅ 可以直接打開         │
│ ✅ 可以上傳 GitHub Pages│
│ ✅ 已優化壓縮           │
└─────────────────────────┘
```

---

## 🚀 GitHub Pages 部署方式

### 方式一：手動構建 + 上傳（簡單）

#### 步驟 1：本地構建

```bash
cd lovable優化
npm install     # 首次需要安裝依賴
npm run build   # 構建生產版本
```

**結果：**
- ✅ 生成 `dist/` 資料夾
- ✅ 包含所有編譯後的文件

#### 步驟 2：創建 GitHub 儲存庫

```bash
# 在 GitHub 上創建新儲存庫（例如：foodcar-order）

# 本地初始化
git init
git add .
git commit -m "🎉 初始提交：React + TypeScript 訂單系統"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/foodcar-order.git
git push -u origin main
```

#### 步驟 3：部署到 GitHub Pages

**選項 A：使用 gh-pages 套件**

```bash
# 安裝 gh-pages
npm install --save-dev gh-pages

# 修改 package.json
```

在 `package.json` 加入：

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  },
  "homepage": "https://YOUR_USERNAME.github.io/foodcar-order"
}
```

```bash
# 一鍵部署
npm run deploy
```

**選項 B：手動上傳 dist 資料夾**

```bash
# 切換到 gh-pages 分支
git checkout --orphan gh-pages

# 只保留 dist/ 內容
git rm -rf .
cp -r dist/* .
git add .
git commit -m "🚀 部署到 GitHub Pages"
git push origin gh-pages

# 切回主分支
git checkout main
```

#### 步驟 4：啟用 GitHub Pages

1. 前往 GitHub 儲存庫設定
2. 左側選單點擊 **Pages**
3. Source 選擇 **gh-pages** 分支
4. 點擊 **Save**
5. 等待 1-2 分鐘
6. 訪問：`https://YOUR_USERNAME.github.io/foodcar-order`

---

### 方式二：GitHub Actions 自動部署（推薦）

#### 步驟 1：創建工作流程文件

創建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout 📥
        uses: actions/checkout@v3

      - name: Setup Node.js 🔧
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies 📦
        run: npm ci

      - name: Build 🏗️
        run: npm run build

      - name: Deploy to GitHub Pages 🚀
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### 步驟 2：推送到 GitHub

```bash
git add .
git commit -m "🚀 新增 GitHub Actions 自動部署"
git push origin main
```

#### 步驟 3：等待自動部署

- GitHub Actions 會自動構建
- 自動部署到 `gh-pages` 分支
- 1-3 分鐘後即可訪問

**優點：**
- ✅ 每次 push 自動部署
- ✅ 不需要手動構建
- ✅ 持續集成/持續部署（CI/CD）

---

## 🎯 更簡單的方案：Vercel / Netlify（推薦！）

### 為什麼推薦？

| 特性 | GitHub Pages | Vercel / Netlify |
|------|-------------|------------------|
| 自動構建 | ⚠️ 需設定 | ✅ 內建 |
| 自動 HTTPS | ✅ | ✅ |
| 自動預覽 | ❌ | ✅ 每個 PR |
| 環境變數 | ❌ | ✅ |
| 自訂網域 | ✅ | ✅ |
| 部署速度 | 中 | 快 ⚡ |
| CDN | ❌ | ✅ 全球 |

---

### Vercel 部署（最推薦）⭐

#### 步驟 1：推送到 GitHub

```bash
git init
git add .
git commit -m "🎉 初始提交"
git remote add origin https://github.com/YOUR_USERNAME/foodcar-order.git
git push -u origin main
```

#### 步驟 2：連接 Vercel

1. 前往 [vercel.com](https://vercel.com)
2. 使用 GitHub 登入
3. 點擊 **New Project**
4. 選擇您的儲存庫 `foodcar-order`
5. Vercel 自動偵測 Vite 專案
6. 點擊 **Deploy**

**🎉 完成！** 自動取得網址：`https://foodcar-order.vercel.app`

#### 步驟 3：設定環境變數（重要！）

在 Vercel 專案設定中：

1. 前往 **Settings** → **Environment Variables**
2. 新增：
   ```
   VITE_AUTH_API = your_auth_api_url
   VITE_ORDER_API = your_order_api_url
   VITE_WEBSITE_ID = WEB001
   ```
3. 點擊 **Save**
4. 重新部署（Vercel 會自動觸發）

**優點：**
- ✅ 每次 git push 自動部署
- ✅ 自動 HTTPS
- ✅ 全球 CDN 加速
- ✅ 免費方案已足夠

---

### Netlify 部署（同樣推薦）⭐

#### 方式：拖放部署（最簡單）

1. 本地構建：
   ```bash
   npm run build
   ```

2. 前往 [netlify.com](https://www.netlify.com)
3. 將 `dist/` 資料夾**拖放**到頁面中
4. **🎉 完成！** 立即取得網址

#### 方式：Git 連接（自動部署）

1. 前往 [netlify.com](https://www.netlify.com)
2. 點擊 **Add new site** → **Import from Git**
3. 選擇您的 GitHub 儲存庫
4. 設定：
   - Build command: `npm run build`
   - Publish directory: `dist`
5. 點擊 **Deploy**

---

## 📋 完整部署檢查清單

### ✅ 部署前準備

- [ ] 已修改 `src/types/index.ts` 的 API 端點
- [ ] 已測試本地構建：`npm run build`
- [ ] 已測試預覽：`npm run preview`
- [ ] 已檢查無 ESLint 錯誤：`npm run lint`
- [ ] 已測試所有功能正常

### ✅ GitHub 設定

- [ ] 已創建 GitHub 儲存庫
- [ ] 已推送代碼到 GitHub
- [ ] 已設定 `.gitignore`（node_modules, dist）

### ✅ 部署設定

- [ ] 選擇部署平台（Vercel/Netlify/GitHub Pages）
- [ ] 已設定環境變數（API 端點）
- [ ] 已設定自訂網域（可選）
- [ ] 已啟用 HTTPS

### ✅ 部署後檢查

- [ ] 網站可正常訪問
- [ ] 所有功能正常運作
- [ ] API 請求成功
- [ ] 圖片正常載入
- [ ] 手機版正常顯示
- [ ] 深色模式正常

---

## 🆚 部署方式對比

### HTML 版本部署

```bash
# 超簡單：
1. 上傳 cheenken.html 到 GitHub
2. 啟用 GitHub Pages
3. 完成！✅

優點：
✅ 不需要構建
✅ 不需要 Node.js
✅ 3 分鐘搞定

缺點：
❌ 未優化（文件較大）
❌ 未壓縮
```

---

### React 版本部署

```bash
# 需要構建：
1. npm run build（生成 dist/）
2. 部署 dist/ 到託管服務
3. 完成！✅

優點：
✅ 自動優化
✅ 自動壓縮
✅ 代碼分割
✅ 更快的載入速度

缺點：
⚠️ 需要構建步驟
⚠️ 需要 Node.js（本地或 CI/CD）
```

---

## 💡 推薦部署方案

### 🏆 最佳方案：Vercel（免費）

**為什麼？**
1. ✅ **零配置**：自動偵測 Vite 專案
2. ✅ **自動部署**：git push 即部署
3. ✅ **全球 CDN**：載入超快
4. ✅ **免費 HTTPS**：自動配置
5. ✅ **預覽部署**：每個 PR 都有預覽網址
6. ✅ **環境變數**：支援多環境配置

**步驟：**
```
1. GitHub 推送代碼
2. Vercel 連接儲存庫
3. 點擊 Deploy
4. 完成！（約 2 分鐘）
```

---

### 🥈 次佳方案：Netlify（免費）

**優點：**
- ✅ 可拖放部署（超簡單）
- ✅ 自動部署
- ✅ 免費 HTTPS

**步驟：**
```
1. npm run build
2. 拖放 dist/ 到 Netlify
3. 完成！（約 1 分鐘）
```

---

### 🥉 備選方案：GitHub Pages（免費）

**優點：**
- ✅ 與代碼在同一個地方
- ✅ 免費

**缺點：**
- ⚠️ 需要手動設定 GitHub Actions
- ⚠️ 無環境變數支援
- ⚠️ 無預覽部署

---

## 🔧 如果要用 GitHub Pages

### 方法 1：使用 GitHub Actions（推薦）

我已經為您準備好了配置文件！

#### 步驟 1：創建工作流程

```bash
mkdir -p .github/workflows
```

創建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: write
    
    steps:
      - name: Checkout 📥
        uses: actions/checkout@v3

      - name: Setup Node.js 🔧
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install 📦
        run: npm ci

      - name: Build 🏗️
        run: npm run build

      - name: Deploy 🚀
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

#### 步驟 2：修改 vite.config.ts

```typescript
export default defineConfig({
  base: '/foodcar-order/', // 👈 改成您的儲存庫名稱
  // ... 其他設定
});
```

#### 步驟 3：推送到 GitHub

```bash
git add .
git commit -m "🚀 新增 GitHub Actions 部署"
git push origin main
```

#### 步驟 4：啟用 GitHub Pages

1. 前往儲存庫 **Settings** → **Pages**
2. Source 選擇 **gh-pages** 分支
3. 點擊 **Save**
4. 等待部署完成（約 2-3 分鐘）
5. 訪問：`https://YOUR_USERNAME.github.io/foodcar-order`

---

### 方法 2：手動部署（不推薦）

```bash
# 1. 構建
npm run build

# 2. 切換分支
git checkout -b gh-pages

# 3. 只保留 dist 內容
rm -rf !(dist)
mv dist/* .
rm -rf dist

# 4. 提交並推送
git add .
git commit -m "🚀 部署"
git push origin gh-pages

# 每次更新都要重複這些步驟... 很麻煩 😰
```

---

## 🎯 三種部署方式對比

| 平台 | 優點 | 缺點 | 難度 | 推薦度 |
|------|------|------|------|--------|
| **Vercel** | 自動部署、CDN、環境變數 | 需註冊帳號 | ⭐ 簡單 | ⭐⭐⭐⭐⭐ |
| **Netlify** | 拖放部署、自動部署 | 需註冊帳號 | ⭐ 簡單 | ⭐⭐⭐⭐ |
| **GitHub Pages** | 免費、同一平台 | 需設定 Actions | ⭐⭐ 中等 | ⭐⭐⭐ |

---

## 📝 詳細步驟（以 Vercel 為例）

### 完整流程（從頭到尾）

#### 1. 準備代碼

```bash
cd lovable優化

# 測試構建
npm install
npm run build
npm run preview  # 預覽構建結果

# 確認沒問題
```

#### 2. 推送到 GitHub

```bash
# 初始化 Git（如果還沒有）
git init

# 加入所有文件
git add .

# 提交
git commit -m "🎉 React + TypeScript 訂單系統"

# 在 GitHub 創建儲存庫後
git remote add origin https://github.com/YOUR_USERNAME/foodcar-order.git

# 推送
git push -u origin main
```

#### 3. 部署到 Vercel

**A. 網頁操作：**

1. 前往 https://vercel.com
2. 點擊 **Sign Up** 或 **Log In**（使用 GitHub 帳號）
3. 點擊 **Add New...** → **Project**
4. 選擇 `foodcar-order` 儲存庫
5. Vercel 自動偵測設定：
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   ```
6. 點擊 **Deploy**
7. 等待 1-2 分鐘
8. **🎉 完成！** 取得網址

**B. CLI 操作（更快）：**

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
vercel

# 生產部署
vercel --prod
```

#### 4. 設定環境變數

1. 在 Vercel 專案頁面
2. **Settings** → **Environment Variables**
3. 新增變數：
   ```
   Name: VITE_AUTH_API
   Value: https://script.google.com/macros/s/YOUR_AUTH_ID/exec
   
   Name: VITE_ORDER_API
   Value: https://script.google.com/macros/s/YOUR_ORDER_ID/exec
   
   Name: VITE_WEBSITE_ID
   Value: WEB001
   ```
4. **Save**
5. **Redeploy**（重新部署以套用變數）

#### 5. 測試上線網站

訪問您的網址：`https://foodcar-order.vercel.app`

測試：
- ✅ 頁面正常載入
- ✅ API 請求正常
- ✅ 訂單可以提交
- ✅ 手機版正常顯示

---

## ⚡ 快速對比總結

### HTML 版本（cheenken.html）

```
上傳到 GitHub → 開啟 GitHub Pages → 完成
                  ↑
              3 分鐘搞定 ✅
              
優點：超簡單
缺點：未優化
```

---

### React 版本（lovable優化/）

```
推送到 GitHub → 連接 Vercel → 自動構建 → 完成
                  ↑           ↑
              1 分鐘設定   2 分鐘構建
              
優點：自動優化、CDN、環境變數
缺點：需要構建步驟
```

---

## 🎓 為什麼 React 版本不能直接用？

### 技術原因

```
React 版本的原始碼：
├─ .tsx 文件 (TypeScript + JSX)
│  → 瀏覽器無法直接執行 ❌
│
├─ import 語法
│  → 瀏覽器原生不完全支援 ❌
│
├─ 路徑別名 (@/components)
│  → 瀏覽器不認識 ❌
│
└─ CSS Modules
   → 需要構建工具處理 ❌

需要 Vite 構建後：
├─ .tsx → .js (編譯)
├─ import → 打包成單一文件
├─ 路徑別名 → 解析成實際路徑
└─ CSS → 壓縮並注入
   ↓
✅ 瀏覽器可以執行的純 HTML + JS + CSS
```

---

## 📦 構建後的結果

### dist/ 資料夾內容

```
dist/
├─ index.html (約 2KB)
├─ assets/
│  ├─ vendor-abc123.js (React 等，約 45KB)
│  ├─ main-def456.js (您的代碼，約 35KB)
│  └─ main-ghi789.css (樣式，約 8KB)
└─ manifest.json
   service-worker.js

總計：~88KB（Gzip 後 ~30KB）
```

**特點：**
- ✅ 已壓縮和優化
- ✅ 代碼分割（vendor 和 app 分離）
- ✅ 檔案名帶 hash（快取友善）
- ✅ 可直接部署使用

---

## 🎯 我的建議

### 對於您的情況：

**推薦：Vercel 部署** 🏆

**理由：**
1. ✅ **最簡單**：連接 GitHub 點一下就好
2. ✅ **自動化**：每次 push 自動部署
3. ✅ **免費**：個人專案完全免費
4. ✅ **快速**：全球 CDN 加速
5. ✅ **專業**：自動 HTTPS、環境變數

**步驟總結：**
```
1. 推送代碼到 GitHub (5 分鐘)
2. Vercel 連接儲存庫 (2 分鐘)
3. 設定環境變數 (2 分鐘)
4. 完成！🎉

總時間：不到 10 分鐘
```

---

## 📞 需要幫助？

### 部署遇到問題？

查看詳細文檔：
- 📖 `DEPLOYMENT.md` - 完整部署教學
- 📖 `QUICKSTART.md` - 快速開始指南

### 常見問題

**Q: 一定要用 Vercel 嗎？**
A: 不一定，Netlify 或 GitHub Pages 也可以，但 Vercel 最簡單。

**Q: 可以用自己的網域嗎？**
A: 可以！Vercel/Netlify 都支援自訂網域。

**Q: 環境變數一定要設定嗎？**
A: 是的，否則 API 請求會失敗。

**Q: 每次改代碼都要重新構建嗎？**
A: 開發時不用（npm run dev 自動更新）
   部署時會自動構建（Vercel/Netlify）

---

## 🎊 總結

| 問題 | 答案 |
|------|------|
| **能直接上 GitHub 就用嗎？** | ❌ 不行，需要構建 |
| **需要什麼步驟？** | ✅ 構建 → 部署 |
| **推薦用什麼部署？** | ✅ Vercel（最簡單） |
| **需要付費嗎？** | ✅ 不用（免費方案夠用） |
| **困難嗎？** | ✅ 不難（10 分鐘搞定） |

---

**雖然不能像 HTML 版本那樣直接用，但用 Vercel 部署也只需要 10 分鐘，而且更專業！** 🚀

