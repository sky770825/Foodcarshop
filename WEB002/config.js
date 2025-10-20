// ============================================
// 🎯 快速配置檔 - 六蒜包·餐車訂購表單
// 生成時間: 2025-10-19 21:26:25
// ============================================

const CONFIG = {
  // === 基本資訊 ===
  brandName: "六蒜包·餐車訂購表單",
  brandSubtitle: "📍 定點餐車｜預訂取餐",
  logoUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop&q=80",
  
  // === 授權系統 ===
  websiteId: "WEB002",  // ⚠️ 請勿修改
  authApiUrl: "https://script.google.com/macros/s/AKfycbyDsD6V7cP239XOFvQ3mRRPILxQsBagt5UIFTJszkfsSf_1SXiDAzIav-F2dXPRU22X/exec",  // ✓ 已自動填入授權API
  
  // === Google Sheets & Apps Script ===
  googleSheetsId: "YOUR_SHEET_ID_HERE",  // ⚠️ 部署時填入
  gasEndpoint: "YOUR_GAS_DEPLOYMENT_URL_HERE",  // ⚠️ 部署時填入
  
  // === 品牌顏色 ===
  colors: {
    primary: "#d97706",
    primaryDark: "#b45309",
    accent: "#f59e0b",
    success: "#059669",
    danger: "#dc2626"
  },
  
  // === 價格設定 ===
  pricing: {
    main: 20,
    side: 10
  },
  
  // === 菜單圖片 ===
  menuImages: [
    { url: "https://i.postimg.cc/FKLFbHb9/image.jpg", alt: "菜單1" },
    { url: "https://i.postimg.cc/TwvdtvQ1/image.jpg", alt: "菜單2" }
  ],
  
  // === 主餐項目 ===
  mainItems: [
    { name: "鹽水半雞", img: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop&q=80" },
    { name: "煙燻半雞", img: "https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=400&h=400&fit=crop&q=80", outOfStock: false },
    { name: "油雞腿", img: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop&q=80" },
    { name: "油雞胸", img: "https://images.unsplash.com/photo-1633237308525-cd587cf71926?w=400&h=400&fit=crop&q=80" }
  ],
  
  // === 單點配菜 ===
  sideItems: {
    "葉菜類": [
      { name: "花椰菜", img: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=600&h=600&fit=crop&q=80" },
      { name: "龍鬚菜", img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&h=600&fit=crop&q=80" }
    ]
  },
  
  // === 取餐時間設定 ===
  pickupTime: {
    hourStart: 14,
    hourEnd: 20,
    minuteInterval: 5
  },
  
  // === 取餐方式選項 ===
  pickupMethods: ["🚶 現場自取", "👥 託人代取"],
  
  // === 口味選項 ===
  tasteOptions: {
    spicy: ["不辣", "微辣", "小辣", "中辣", "大辣"],
    saltiness: ["清淡", "正常", "重鹹"],
    lemon: ["加檸檬", "不加檸檬"],
    scallion: ["加蔥泥", "不加蔥泥"]
  }
};