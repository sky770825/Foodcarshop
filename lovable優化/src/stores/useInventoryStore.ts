/**
 * 📦 库存状态管理
 * 管理商品库存、分类等数据
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  MainItem,
  SideCategories,
  Inventory,
  VenueCache,
  VenueOption,
} from '@/types';

interface InventoryState {
  // 商品資料
  mainItems: MainItem[];
  sideCategories: SideCategories;
  inventory: Inventory;
  
  // 場地相關
  currentVenue: string | null;
  venueOptions: VenueOption[];
  venueCache: VenueCache;
  
  // 載入狀態
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setMainItems: (items: MainItem[]) => void;
  setSideCategories: (categories: SideCategories) => void;
  setInventory: (inventory: Inventory) => void;
  setCurrentVenue: (venue: string | null) => void;
  setVenueOptions: (options: VenueOption[]) => void;
  cacheVenueData: (venue: string, data: VenueCache[string]) => void;
  getCachedVenue: (venue: string) => VenueCache[string] | null;
  clearVenueCache: (venue: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  isItemOutOfStock: (itemName: string) => boolean;
  getStockInfo: (itemName: string) => { current: number; initial: number; available: boolean };
}

// 默认主餐列表
const DEFAULT_MAIN_ITEMS: MainItem[] = [
  { name: '鹽水半雞', img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop&q=80' },
  { name: '煙燻半雞', img: 'https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=400&h=400&fit=crop&q=80' },
  { name: '油雞腿', img: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop&q=80' },
  { name: '油雞胸', img: 'https://images.unsplash.com/photo-1633237308525-cd587cf71926?w=400&h=400&fit=crop&q=80' },
];

// 默认配菜分类
const DEFAULT_SIDE_CATEGORIES: SideCategories = {
  '葉菜類': [
    { name: '花椰菜' },
    { name: '龍鬚菜' },
    { name: '高麗菜' },
    { name: '娃娃菜' },
  ],
  '瓜類': [
    { name: '綠苦瓜' },
    { name: '小黃瓜' },
  ],
  '菇類': [
    { name: '金針菇' },
    { name: '杏鮑菇' },
    { name: '鮮香菇' },
    { name: '黑木耳' },
  ],
  '根莖類': [
    { name: '玉米筍' },
    { name: '筍白筍' },
    { name: '白蘿蔔' },
    { name: '紅蘿蔔' },
    { name: '洋蔥' },
    { name: '蓮藕' },
    { name: '脆筍片' },
  ],
  '豆製品': [
    { name: '豆皮' },
    { name: '百頁豆腐' },
    { name: '小豆干' },
  ],
  '其他': [
    { name: '四季豆' },
    { name: '海帶根' },
    { name: '皮蛋' },
    { name: '鵪鶉蛋' },
    { name: '雞皮' },
    { name: '雞冠' },
    { name: '雞蛋黃' },
    { name: '雞蛋腸' },
  ],
};

export const useInventoryStore = create<InventoryState>()(
  devtools(
    (set, get) => ({
      mainItems: DEFAULT_MAIN_ITEMS,
      sideCategories: DEFAULT_SIDE_CATEGORIES,
      inventory: {},
      currentVenue: null,
      venueOptions: [],
      venueCache: {},
      isLoading: false,
      error: null,

      setMainItems: (items) => set({ mainItems: items }),
      
      setSideCategories: (categories) => set({ sideCategories: categories }),
      
      setInventory: (inventory) => set({ inventory }),
      
      setCurrentVenue: (venue) => set({ currentVenue: venue }),
      
      setVenueOptions: (options) => set({ venueOptions: options }),
      
      cacheVenueData: (venue, data) => {
        set((state) => ({
          venueCache: {
            ...state.venueCache,
            [venue]: data,
          },
        }));
      },
      
      getCachedVenue: (venue) => {
        const cache = get().venueCache[venue];
        if (!cache) return null;
        
        // 检查缓存是否过期（5分钟）
        const now = Date.now();
        const CACHE_EXPIRY = 5 * 60 * 1000;
        if (now - cache.timestamp > CACHE_EXPIRY) {
          return null;
        }
        
        return cache;
      },
      
      clearVenueCache: (venue) => {
        set((state) => {
          const newCache = { ...state.venueCache };
          delete newCache[venue];
          return { venueCache: newCache };
        });
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      isItemOutOfStock: (itemName) => {
        const { inventory } = get();
        const stock = inventory[itemName];
        return !stock || !stock.available || stock.stock <= 0;
      },
      
      getStockInfo: (itemName) => {
        const { inventory } = get();
        const stock = inventory[itemName];
        
        if (!stock) {
          return { current: 0, initial: 0, available: false };
        }
        
        return {
          current: stock.stock || 0,
          initial: stock.initialStock || 0,
          available: stock.available,
        };
      },
    }),
    { name: 'InventoryStore' }
  )
);

