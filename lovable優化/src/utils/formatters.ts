/**
 * 🛠️ 格式化工具函数
 * 处理各种数据格式化需求
 */

import type { OrderItem, TasteOptions, CutOptions } from '@/types';

/**
 * 格式化订单摘要
 */
export function formatOrderSummary(
  name: string,
  phone: string,
  venueName: string,
  eta: string,
  items: OrderItem[],
  tasteOptions: TasteOptions,
  total: number
): string {
  const nameParts = name.trim().split(/[\s#]/);
  const mainName = nameParts[0] || '';
  const last3Digits = phone.trim().slice(-3);
  const [hour, minute] = eta.split(':');
  const timeStr = `${hour}點${minute}分`;

  // 格式化餐點（每行3個）
  const itemLines: string[] = [];
  for (let i = 0; i < items.length; i += 3) {
    const lineItems = items
      .slice(i, i + 3)
      .map((it) => `${it.name} x${it.qty}`)
      .join(' / ');
    itemLines.push(lineItems);
  }
  const itemsText = itemLines.join('\n');

  // 格式化調味
  const tasteText = Object.entries(tasteOptions)
    .map(([k, v]) => `${k}：${v}`)
    .join('\n');

  return `① 姓名.後三碼：${mainName}.${last3Digits}
② 取餐場地：${venueName || '未指定'}
③ 想預訂的時間：${timeStr}
④ 想預訂的餐點：
${itemsText}
⑤ 想搭配的調味：
${tasteText}
金額：${total}`;
}

/**
 * 格式化商品详情（用于API传输）
 */
export function formatItemsDetail(items: OrderItem[]): string {
  return items.map((it) => `${it.name} x${it.qty}`).join(' / ');
}

/**
 * 格式化口味选项（用于API传输）
 */
export function formatTasteOptions(tasteOptions: TasteOptions): string {
  return Object.entries(tasteOptions)
    .map(([_, v]) => v)
    .join('、');
}

/**
 * 格式化去骨选项（用于API传输）
 */
export function formatCutOptions(cuts: CutOptions): string {
  return Object.entries(cuts)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

/**
 * 验证姓名格式
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: '請輸入姓名' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: '請輸入有效的姓名（至少 2 個字）' };
  }
  return { valid: true };
}

/**
 * 验证电话格式
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const trimmed = phone.trim();
  if (!trimmed) {
    return { valid: false, error: '請輸入電話號碼' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: '請輸入有效的電話號碼' };
  }
  return { valid: true };
}

/**
 * 格式化库存显示
 */
export function formatStockDisplay(current: number, initial: number): {
  text: string;
  color: string;
} {
  const ratio = initial > 0 ? current / initial : 0;
  let color = 'var(--success)';

  if (current === 0) {
    color = 'var(--danger)';
  } else if (ratio <= 0.3) {
    color = 'var(--accent)';
  }

  return {
    text: `庫存 (${current}/${initial})`,
    color,
  };
}

