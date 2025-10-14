/**
 * 🌐 API 服务层
 * 封装所有与后端交互的 HTTP 请求
 */

import type {
  AuthResponse,
  ConfigResponse,
  InventoryResponse,
  OrderData,
  OrderResponse,
} from '@/types';
import { API_ENDPOINTS, WEBSITE_ID } from '@/types';

/**
 * 检查授权状态
 */
export async function checkAuthorization(): Promise<AuthResponse> {
  try {
    // 如果没有设定授权 API，跳过检查（开发模式）
    if (!API_ENDPOINTS.auth || API_ENDPOINTS.auth === 'YOUR_AUTH_API_URL_HERE') {
      console.log('⚠️ 未設定授權API，跳過授權檢查');
      return { authorized: true };
    }

    const res = await fetch(`${API_ENDPOINTS.auth}?action=checkAuth&websiteId=${WEBSITE_ID}`);
    const data: AuthResponse = await res.json();

    if (!data.ok) {
      console.error('授權檢查失敗:', data.msg);
      return { authorized: false, msg: data.msg };
    }

    return data;
  } catch (err) {
    console.error('授權檢查錯誤:', err);
    // 网络错误时允许继续使用（避免误锁）
    return { authorized: true };
  }
}

/**
 * 获取系统配置
 */
export async function fetchConfig(): Promise<ConfigResponse> {
  try {
    const res = await fetch(`${API_ENDPOINTS.order}?action=getConfig`);
    const data: ConfigResponse = await res.json();

    if (data.ok) {
      console.log('✅ 系統設定已載入:', data);
      return data;
    }

    throw new Error(data.ok === false ? '載入設定失敗' : '未知錯誤');
  } catch (err) {
    console.warn('⚠️ 無法載入系統設定，使用預設選項:', err);
    throw err;
  }
}

/**
 * 获取库存数据
 */
export async function fetchInventory(venue?: string): Promise<InventoryResponse> {
  try {
    let apiUrl = `${API_ENDPOINTS.order}?action=getInventory`;
    if (venue) {
      apiUrl += `&venue=${venue}`;
    }

    const res = await fetch(apiUrl);
    const data: InventoryResponse = await res.json();

    if (data.ok) {
      console.log('✅ 庫存已載入:', data.inventory);
      return data;
    }

    throw new Error(data.msg || '載入庫存失敗');
  } catch (err) {
    console.warn('⚠️ 無法載入庫存:', err);
    throw err;
  }
}

/**
 * 刷新库存（强制从服务器获取最新数据）
 */
export async function refreshInventory(venue: string): Promise<InventoryResponse> {
  const timestamp = Date.now();
  const apiUrl = `${API_ENDPOINTS.order}?action=getInventory&venue=${venue}&_t=${timestamp}`;

  const res = await fetch(apiUrl);
  const data: InventoryResponse = await res.json();

  if (!data.ok) {
    throw new Error(data.msg || '刷新庫存失敗');
  }

  return data;
}

/**
 * 提交订单
 */
export async function submitOrder(orderData: OrderData): Promise<OrderResponse> {
  try {
    // 检查网络状态
    if (!navigator.onLine) {
      throw new Error('網路已斷線，無法送出訂單');
    }

    // 使用 FormData 格式（Google Apps Script 更相容）
    const formData = new FormData();
    Object.entries(orderData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const res = await fetch(API_ENDPOINTS.order, {
      method: 'POST',
      body: formData,
    });

    const data: OrderResponse = await res.json();

    if (!data.ok) {
      throw new Error(data.msg || '送出訂單失敗');
    }

    return data;
  } catch (err) {
    console.error('提交訂單錯誤:', err);
    throw err;
  }
}

