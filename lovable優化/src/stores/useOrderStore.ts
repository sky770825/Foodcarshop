/**
 * 🛒 订单状态管理
 * 使用 Zustand 管理订单相关状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { OrderItem, TasteOptions, CutOptions, QuantityInput } from '@/types';
import { PRICE } from '@/types';

interface OrderState {
  // 商品数量
  quantities: Record<string, number>;
  
  // 去骨选项
  cutOptions: CutOptions;
  
  // 口味选项
  tasteOptions: TasteOptions;
  
  // 表单数据
  formData: {
    venue: string;
    name: string;
    phone: string;
    method: string;
    etaHour: string;
    etaMinute: string;
    note: string;
  };
  
  // 计算属性
  orderItems: OrderItem[];
  totalAmount: number;
  
  // Actions
  setQuantity: (name: string, value: number) => void;
  increaseQuantity: (name: string) => void;
  decreaseQuantity: (name: string) => void;
  setCutOption: (itemName: string, option: string) => void;
  setTasteOption: (key: keyof TasteOptions, value: string) => void;
  updateFormData: (data: Partial<OrderState['formData']>) => void;
  calculateOrder: () => void;
  resetOrder: () => void;
}

const initialTasteOptions: TasteOptions = {
  辣度: '不辣',
  鹹度: '正常',
  檸檬: '加檸檬',
  蒜泥: '加蒜泥',
};

export const useOrderStore = create<OrderState>()(
  devtools(
    (set, get) => ({
      quantities: {},
      cutOptions: {},
      tasteOptions: initialTasteOptions,
      formData: {
        venue: '',
        name: '',
        phone: '',
        method: '',
        etaHour: '',
        etaMinute: '',
        note: '',
      },
      orderItems: [],
      totalAmount: 0,

      setQuantity: (name, value) => {
        set((state) => ({
          quantities: { ...state.quantities, [name]: Math.max(0, Math.min(99, value)) },
        }));
        get().calculateOrder();
      },

      increaseQuantity: (name) => {
        const current = get().quantities[name] || 0;
        if (current < 99) {
          get().setQuantity(name, current + 1);
        }
      },

      decreaseQuantity: (name) => {
        const current = get().quantities[name] || 0;
        if (current > 0) {
          get().setQuantity(name, current - 1);
        }
      },

      setCutOption: (itemName, option) => {
        set((state) => ({
          cutOptions: { ...state.cutOptions, [itemName]: option },
        }));
      },

      setTasteOption: (key, value) => {
        set((state) => ({
          tasteOptions: { ...state.tasteOptions, [key]: value },
        }));
      },

      updateFormData: (data) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }));
      },

      calculateOrder: () => {
        const { quantities } = get();
        const items: OrderItem[] = [];
        let total = 0;

        // 从 DOM 中获取商品类型信息（临时方案，后续改为从 store 中获取）
        Object.entries(quantities).forEach(([name, qty]) => {
          if (qty > 0) {
            // 根据商品名称判断类型（主餐或配菜）
            // 这里需要访问商品数据，暂时简化处理
            const isMainItem = qty > 0; // 临时逻辑
            const price = isMainItem ? PRICE.main : PRICE.side;
            const subtotal = qty * price;
            
            items.push({ name, qty, price, subtotal });
            total += subtotal;
          }
        });

        set({ orderItems: items, totalAmount: total });
      },

      resetOrder: () => {
        set({
          quantities: {},
          cutOptions: {},
          tasteOptions: initialTasteOptions,
          formData: {
            venue: '',
            name: '',
            phone: '',
            method: '',
            etaHour: '',
            etaMinute: '',
            note: '',
          },
          orderItems: [],
          totalAmount: 0,
        });
      },
    }),
    { name: 'OrderStore' }
  )
);

