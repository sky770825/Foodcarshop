/**
 * 🥬 单点配菜组件
 */

import { useInventoryStore } from '@/stores/useInventoryStore';
import { useOrderStore } from '@/stores/useOrderStore';
import { formatStockDisplay } from '@/utils/formatters';

interface SideItemProps {
  name: string;
}

export function SideItem({ name }: SideItemProps) {
  const { isItemOutOfStock, getStockInfo } = useInventoryStore();
  const { quantities, increaseQuantity, decreaseQuantity } = useOrderStore();

  const isOutOfStock = isItemOutOfStock(name);
  const stockInfo = getStockInfo(name);
  const quantity = quantities[name] || 0;

  const stockDisplay = formatStockDisplay(stockInfo.current, stockInfo.initial);

  return (
    <div
      role="listitem"
      aria-label={`${name}，每份30元`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(5px, 1.2vw, 7px)',
        padding: 'clamp(7px, 1.8vw, 9px)',
        background: quantity > 0 ? '#fffbeb' : '#fff',
        border: `1px solid ${quantity > 0 ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'clamp(6px, 1.5vw, 8px)',
        transition: 'all .2s ease',
        opacity: isOutOfStock ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div
          style={{
            fontSize: 'clamp(14px, 3.2vw, 15px)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        <div
          role="status"
          aria-live="polite"
          style={{
            fontSize: 'clamp(9px,2vw,10px)',
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: stockDisplay.color, fontWeight: 600 }}>{stockDisplay.text}</span>
        </div>
      </div>

      {/* 数量控制 */}
      <div
        role="group"
        aria-label={`${name}數量控制`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(3px, 0.8vw, 4px)',
          padding: 'clamp(1px, 0.3vw, 2px)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => decreaseQuantity(name)}
          disabled={isOutOfStock || quantity === 0}
          aria-label={`減少${name}數量`}
          style={{
            width: 'clamp(20px, 5vw, 24px)',
            height: 'clamp(20px, 5vw, 24px)',
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 'clamp(4px, 1vw, 6px)',
            fontSize: 'clamp(12px, 3vw, 14px)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          −
        </button>
        <input
          type="number"
          min="0"
          max="99"
          value={quantity}
          readOnly
          aria-label={`${name}數量`}
          style={{
            border: 'none',
            background: 'transparent',
            width: 'clamp(28px, 7vw, 32px)',
            textAlign: 'center',
            padding: 0,
            fontWeight: 600,
            fontSize: 'clamp(13px, 3vw, 14px)',
          }}
        />
        <button
          type="button"
          onClick={() => increaseQuantity(name)}
          disabled={isOutOfStock || quantity >= 99}
          aria-label={`增加${name}數量`}
          style={{
            width: 'clamp(20px, 5vw, 24px)',
            height: 'clamp(20px, 5vw, 24px)',
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 'clamp(4px, 1vw, 6px)',
            fontSize: 'clamp(12px, 3vw, 14px)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

