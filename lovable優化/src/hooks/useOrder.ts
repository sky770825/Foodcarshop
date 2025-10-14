/**
 * 🪝 訂單管理 Hook
 * 封裝訂單提交相關的業務邏輯
 */

import { useCallback } from 'react';
import { useOrderStore } from '@/stores/useOrderStore';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useUIStore } from '@/stores/useUIStore';
import { submitOrder } from '@/services/api';
import {
  formatOrderSummary,
  formatItemsDetail,
  formatTasteOptions,
  formatCutOptions,
  validateName,
  validatePhone,
} from '@/utils/formatters';
import { PRICE } from '@/types';
import type { OrderData } from '@/types';

export function useOrder() {
  const {
    quantities,
    cutOptions,
    tasteOptions,
    formData,
    orderItems,
    totalAmount,
    setQuantity,
    increaseQuantity,
    decreaseQuantity,
    setCutOption,
    setTasteOption,
    updateFormData,
    calculateOrder,
    resetOrder,
  } = useOrderStore();

  const { currentVenue, venueOptions, mainItems } = useInventoryStore();
  const { setSubmitting, showNotification } = useUIStore();

  /**
   * 計算訂單詳情
   */
  const recalculateOrder = useCallback(() => {
    calculateOrder();
  }, [calculateOrder]);

  /**
   * 驗證表單
   */
  const validateForm = useCallback((): { valid: boolean; error?: string } => {
    // 驗證場地
    if (!formData.venue) {
      return { valid: false, error: '⚠️ 請選擇取餐場地' };
    }

    // 驗證姓名
    const nameValidation = validateName(formData.name);
    if (!nameValidation.valid) {
      return { valid: false, error: `⚠️ ${nameValidation.error}` };
    }

    // 驗證電話
    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.valid) {
      return { valid: false, error: `⚠️ ${phoneValidation.error}` };
    }

    // 驗證取餐方式
    if (!formData.method) {
      return { valid: false, error: '⚠️ 請選擇取餐方式' };
    }

    // 驗證時間
    if (!formData.etaHour || !formData.etaMinute) {
      return { valid: false, error: '⚠️ 請選擇取餐時間' };
    }

    // 驗證商品
    if (orderItems.length === 0) {
      return { valid: false, error: '⚠️ 請至少選擇 1 項商品' };
    }

    // 檢查網路狀態
    if (!navigator.onLine) {
      return { valid: false, error: '⚠️ 網路已斷線，無法送出訂單' };
    }

    return { valid: true };
  }, [formData, orderItems]);

  /**
   * 提交訂單
   */
  const submit = useCallback(async (): Promise<{ success: boolean; orderNo?: string }> => {
    // 驗證表單
    const validation = validateForm();
    if (!validation.valid) {
      showNotification('error', validation.error || '表單驗證失敗');
      return { success: false };
    }

    // 防止重複提交
    const currentState = useUIStore.getState();
    if (currentState.isSubmitting) {
      console.log('⏸️ 訂單提交中，請勿重複點擊');
      return { success: false };
    }

    setSubmitting(true);
    showNotification('info', '⏳ 送出中，請稍候...');

    try {
      // 獲取場地名稱
      const venue = venueOptions.find((v) => v.code === formData.venue);
      const venueName = venue?.name || '未指定';

      // 組合取餐時間
      const eta = `${formData.etaHour}:${formData.etaMinute}`;

      // 生成訂單摘要
      const orderSummary = formatOrderSummary(
        formData.name,
        formData.phone,
        venueName,
        eta,
        orderItems,
        tasteOptions,
        totalAmount
      );

      // 只包含有數量的商品的去骨選項
      const activeCutOptions: Record<string, string> = {};
      Object.entries(cutOptions).forEach(([itemName, option]) => {
        if (quantities[itemName] && quantities[itemName] > 0) {
          activeCutOptions[itemName] = option;
        }
      });

      // 構建訂單資料
      const orderData: OrderData = {
        ts: new Date().toISOString(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        venue: formData.venue,
        method: formData.method,
        eta,
        itemsDetail: formatItemsDetail(orderItems),
        total: totalAmount,
        taste: formatTasteOptions(tasteOptions),
        cut: formatCutOptions(activeCutOptions),
        note: formData.note.trim(),
        orderSummary,
        source: 'web-react',
      };

      // 提交訂單
      const response = await submitOrder(orderData);

      if (response.ok && response.orderNo) {
        showNotification('success', `✅ 訂單已送出！訂單編號：${response.orderNo}`);
        return { success: true, orderNo: response.orderNo };
      } else {
        throw new Error(response.msg || '送出訂單失敗');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '送出失敗';
      showNotification('error', `❌ ${message}`);
      console.error('訂單提交錯誤:', err);

      // 如果是庫存不足錯誤，自動將該商品數量歸零
      if (message.includes('庫存不足')) {
        const match = message.match(/【(.+?)】/);
        if (match) {
          const itemName = match[1];
          setQuantity(itemName, 0);
          showNotification('warning', `💡 已自動將「${itemName}」數量歸零，請重新調整訂單`);
        }
      }

      return { success: false };
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm,
    formData,
    orderItems,
    tasteOptions,
    cutOptions,
    quantities,
    totalAmount,
    venueOptions,
    setSubmitting,
    showNotification,
    setQuantity,
  ]);

  return {
    // 状态
    quantities,
    cutOptions,
    tasteOptions,
    formData,
    orderItems,
    totalAmount,
    currentVenue,

    // Actions
    setQuantity,
    increaseQuantity,
    decreaseQuantity,
    setCutOption,
    setTasteOption,
    updateFormData,
    recalculateOrder,
    resetOrder,
    submit,
    validateForm,
  };
}

