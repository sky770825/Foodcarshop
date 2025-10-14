/**
 * 🎯 类型定义文件
 * 集中管理所有 TypeScript 类型，提供类型安全保障
 */

// ========== 商品相关类型 ==========

/** 商品类型 */
export type ProductType = 'main' | 'side';

/** 主餐项目 */
export interface MainItem {
  name: string;
  img?: string;
  imageUrl?: string;
}

/** 配菜项目 */
export interface SideItem {
  name: string;
}

/** 配菜分类 */
export interface SideCategories {
  [category: string]: SideItem[];
}

/** 商品库存信息 */
export interface StockInfo {
  available: boolean;
  stock: number;
  initialStock: number;
}

/** 库存状态映射表 */
export interface Inventory {
  [itemName: string]: StockInfo;
}

// ========== 订单相关类型 ==========

/** 订单商品项 */
export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

/** 口味选项 */
export interface TasteOptions {
  辣度: string;
  鹹度: string;
  檸檬: string;
  蒜泥: string;
}

/** 去骨选项 */
export interface CutOptions {
  [itemName: string]: string;
}

/** 订单数据 */
export interface OrderData {
  ts: string;
  name: string;
  phone: string;
  venue: string;
  method: string;
  eta: string;
  itemsDetail: string;
  total: number;
  taste: string;
  cut: string;
  note: string;
  orderSummary: string;
  source: string;
}

/** 订单提交响应 */
export interface OrderResponse {
  ok: boolean;
  msg?: string;
  orderNo?: string;
}

// ========== 系统配置相关类型 ==========

/** 場地選項 */
export interface VenueOption {
  code: string;
  name: string;
  status: string;
}

/** 时间选项 */
export interface TimeOptions {
  hours: string[];
  minutes: string[];
}

/** 系统配置响应 */
export interface ConfigResponse {
  ok: boolean;
  timeOptions?: TimeOptions;
  methodOptions?: string[];
  venueOptions?: VenueOption[];
}

/** 库存响应 */
export interface InventoryResponse {
  ok: boolean;
  msg?: string;
  inventory: Inventory;
  categories?: SideCategories;
  mainItems?: MainItem[];
}

// ========== 授权相关类型 ==========

/** 授权检查响应 */
export interface AuthResponse {
  ok?: boolean;
  authorized: boolean;
  msg?: string;
  reason?: 'expired' | 'disabled';
  businessName?: string;
  plan?: string;
  expireDate?: string;
  showWarning?: boolean;
  daysLeft?: number;
  isTrial?: boolean;
}

// ========== 場地快取類型 ==========

/** 場地快取資料 */
export interface VenueCacheData {
  inventory: Inventory;
  categories: SideCategories;
  mainItems: MainItem[];
  timestamp: number;
}

/** 場地快取映射表 */
export interface VenueCache {
  [venueCode: string]: VenueCacheData;
}

// ========== 表单相关类型 ==========

/** 表单输入值 */
export interface FormInputs {
  venue: string;
  name: string;
  phone: string;
  method: string;
  etaHour: string;
  etaMinute: string;
  spicy: string;
  saltiness: string;
  lemon: string;
  scallion: string;
  note: string;
}

/** 数量输入项 */
export interface QuantityInput {
  name: string;
  type: ProductType;
  value: number;
}

// ========== 价格配置 ==========

/** 价格配置 */
export interface PriceConfig {
  main: number;
  side: number;
}

// ========== 常量 ==========

/** 价格配置常量 */
export const PRICE: PriceConfig = {
  main: 150,
  side: 30,
};

/** 缓存有效期（毫秒） */
export const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5分钟

/** 网站ID（授权用） */
export const WEBSITE_ID = 'WEB001';

/** API 端点 */
export const API_ENDPOINTS = {
  auth: 'https://script.google.com/macros/s/AKfycbyQ6GNnO8RRR-_IB25wG2zA3w4Ekqx1asgrvx3YN_25mVvSkNeLtmC9ZIPo-AMFMtxU/exec',
  order: 'https://script.google.com/macros/s/AKfycbwrFyfD8_QPwY63V4HoJ7mKlMtyWFrn16R_qLeNHqh45UIyfnU-Gd0DUAuUIa0dvxCJ/exec',
};

