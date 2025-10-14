/**
 * 🛠️ 防抖函数
 * 避免频繁触发事件
 */

/**
 * 防抖函数 - 延迟执行
 * @param func 要执行的函数
 * @param wait 延迟时间（毫秒）
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      if (timeout) clearTimeout(timeout);
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

