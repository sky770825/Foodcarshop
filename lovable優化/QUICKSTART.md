# ⚡ 快速開始指南

本指南幫助您在 5 分鐘內啟動項目。

## 🎯 最速啟動（3 步驟）

### 1️⃣ 安裝依賴

```bash
npm install
# 或使用 pnpm
pnpm install
```

### 2️⃣ 配置 API（重要！）

打開 `src/types/index.ts`，修改以下內容：

```typescript
export const API_ENDPOINTS = {
  auth: 'YOUR_AUTH_API_URL',  // 替換為您的授權 API
  order: 'YOUR_ORDER_API_URL', // 替換為您的訂單 API
};

export const WEBSITE_ID = 'WEB001'; // 您的網站授權 ID
```

### 3️⃣ 啟動開發伺服器

```bash
npm run dev
```

訪問 http://localhost:3000 🎉

## 🔧 開發工具指令

```bash
# 開發模式（熱重載）
npm run dev

# 類型檢查
npm run build  # 會自動執行 tsc

# 代碼檢查
npm run lint

# 代碼格式化
npm run format

# 生產構建
npm run build

# 預覽生產版本
npm run preview
```

## 📂 核心文件說明

### 必須配置的文件

1. **`src/types/index.ts`** - API 端點配置 ⚠️ 必須修改
2. **`src/styles/globals.css`** - 主題顏色（可選）

### 常用組件位置

- 商品卡片：`src/components/ProductCard.tsx`
- 訂單表單：`src/components/OrderForm.tsx`
- 頂部導航：`src/components/Header.tsx`

### 狀態管理

- 訂單狀態：`src/stores/useOrderStore.ts`
- 庫存狀態：`src/stores/useInventoryStore.ts`
- UI 狀態：`src/stores/useUIStore.ts`

## 🎨 自定義主題

### 修改品牌顏色

編輯 `src/styles/globals.css`：

```css
:root {
  --primary: #d97706;      /* 主色：橘色 */
  --primary-dark: #b45309; /* 深橘色 */
  --accent: #f59e0b;       /* 強調色 */
}
```

### 修改 Logo

替換 Header 組件中的圖片網址：

```typescript
// src/components/Header.tsx
<img
  src="YOUR_LOGO_URL"  // 修改這裡
  alt="您的品牌名稱"
/>
```

## 🐛 常見問題

### Q: 安裝依賴失敗？

```bash
# 清除快取重試
rm -rf node_modules package-lock.json
npm install
```

### Q: 類型錯誤？

```bash
# 確保 TypeScript 版本正確
npm install typescript@5.3.3 --save-dev
```

### Q: 樣式沒有生效？

確保 `src/main.tsx` 中有引入全局樣式：

```typescript
import './styles/globals.css';
```

### Q: API 請求失敗？

1. 檢查 `src/types/index.ts` 中的 API 端點是否正確
2. 檢查網路連線
3. 打開瀏覽器控制台查看錯誤訊息

## 📱 測試功能清單

啟動應用後，測試以下功能：

- [ ] 場地選擇下拉選單
- [ ] 主餐商品顯示
- [ ] 配菜分類展開/收合
- [ ] 商品數量加減
- [ ] 圖片點擊放大
- [ ] 訂單即時預覽
- [ ] 總金額計算
- [ ] 表單驗證
- [ ] 訂單提交
- [ ] 深色模式切換
- [ ] 響應式佈局（手機/平板/電腦）

## 🚀 進階配置

### 啟用 PWA（離線支持）

PWA 配置已包含，構建後自動啟用。

### 添加 Google Analytics

1. 取得 GA Measurement ID
2. 在 `src/App.tsx` 中添加追蹤代碼
3. 參考 `DEPLOYMENT.md` 完整說明

### 部署到生產環境

詳見 `DEPLOYMENT.md` 文件。

## 📞 需要幫助？

- 📖 查看完整 README：[README.md](./README.md)
- 🚀 部署指南：[DEPLOYMENT.md](./DEPLOYMENT.md)
- 💬 LINE 客服：https://lin.ee/YyXagFg

## 🎓 學習資源

### React 相關
- [React 官方文檔](https://react.dev/)
- [TypeScript 手冊](https://www.typescriptlang.org/docs/)

### 狀態管理
- [Zustand 文檔](https://zustand-demo.pmnd.rs/)

### 構建工具
- [Vite 指南](https://vitejs.dev/guide/)

---

祝您開發順利！如有問題歡迎隨時聯繫我們 ❤️

