/**
 * 🍗 商品卡片组件
 */

import { useInventoryStore } from '@/stores/useInventoryStore';
import { useOrderStore } from '@/stores/useOrderStore';
import { useUIStore } from '@/stores/useUIStore';
import { PRICE } from '@/types';
import { formatStockDisplay } from '@/utils/formatters';

interface ProductCardProps {
  name: string;
  imageUrl?: string;
  type: 'main' | 'side';
  showCutOption?: boolean;
}

export function ProductCard({ name, imageUrl, type, showCutOption = false }: ProductCardProps) {
  const { isItemOutOfStock, getStockInfo } = useInventoryStore();
  const { quantities, cutOptions, increaseQuantity, decreaseQuantity, setCutOption } =
    useOrderStore();
  const { openImageModal } = useUIStore();

  const isOutOfStock = isItemOutOfStock(name);
  const stockInfo = getStockInfo(name);
  const quantity = quantities[name] || 0;
  const cutOption = cutOptions[name] || '去骨';
  const price = type === 'main' ? PRICE.main : PRICE.side;

  const stockDisplay = formatStockDisplay(stockInfo.current, stockInfo.initial);

  const handleImageClick = () => {
    if (imageUrl) {
      const largeImageUrl = imageUrl.replace('w=400&h=400', 'w=800&h=800');
      openImageModal(largeImageUrl, `${name} 商品圖片`);
    }
  };

  const handleImageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleImageClick();
    }
  };

  return (
    <div
      className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
      role="listitem"
      aria-label={`${name}，每份${price}元`}
      style={{
        background: '#fff',
        border: `1.5px solid ${quantity > 0 ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'clamp(6px, 1.5vw, 10px)',
        padding: 'clamp(6px, 1.5vw, 8px)',
        transition: 'all .25s ease',
        position: 'relative',
        opacity: isOutOfStock ? 0.6 : 1,
        pointerEvents: isOutOfStock ? 'none' : 'auto',
        boxShadow: quantity > 0 ? '0 2px 8px rgba(217,119,6,.15)' : 'none',
      }}
    >
      {/* 缺货标签 */}
      {isOutOfStock && (
        <div
          className="out-of-stock-badge"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            color: '#fff',
            padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
            borderRadius: 'clamp(4px, 1vw, 6px)',
            fontSize: 'clamp(11px, 2.5vw, 12px)',
            fontWeight: 700,
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
          }}
        >
          ✕ 缺貨中
        </div>
      )}

      {/* 商品图片 */}
      {imageUrl && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`點擊放大查看${name}圖片`}
          onClick={handleImageClick}
          onKeyDown={handleImageKeyDown}
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '75%',
            borderRadius: 'clamp(4px, 1vw, 6px)',
            overflow: 'hidden',
            marginBottom: 'clamp(5px, 1.2vw, 6px)',
            cursor: 'pointer',
            background: '#f3f4f6',
          }}
        >
          <img
            src={imageUrl}
            alt={`${name} 商品圖片`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = `https://via.placeholder.com/400x400/fef3c7/b45309?text=${encodeURIComponent(
                name
              )}`;
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform .3s ease',
            }}
          />
        </div>
      )}

      {/* 商品信息 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'clamp(5px,1.2vw,6px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px,1vw,6px)', flex: 1 }}>
          <div
            style={{
              fontSize: 'clamp(13px, 2.8vw, 14px)',
              fontWeight: 600,
              marginBottom: 0,
            }}
          >
            {name}
          </div>
          <div
            role="status"
            aria-live="polite"
            style={{
              fontSize: 'clamp(10px,2.2vw,11px)',
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: stockDisplay.color, fontWeight: 600 }}>{stockDisplay.text}</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 'clamp(14px, 3vw, 15px)',
            fontWeight: 700,
            color: 'var(--primary)',
            marginBottom: 0,
          }}
          aria-label={`價格${price}元`}
        >
          ${price}
        </div>
      </div>

      {/* 数量控制 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(4px,1vw,6px)' }}>
        <div
          role="group"
          aria-label={`${name}數量控制`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(3px, 0.8vw, 4px)',
            background: quantity > 0 ? '#fffbeb' : '#fff',
            border: `1.5px solid ${quantity > 0 ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'clamp(6px, 1.5vw, 8px)',
            padding: 'clamp(2px, 0.5vw, 3px)',
            transition: 'all .2s ease',
          }}
        >
          <button
            type="button"
            onClick={() => decreaseQuantity(name)}
            disabled={isOutOfStock || quantity === 0}
            aria-label={`減少${name}數量`}
            style={{
              width: 'clamp(24px, 6vw, 28px)',
              height: 'clamp(24px, 6vw, 28px)',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: 'clamp(4px, 1vw, 6px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
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
            aria-valuemin={0}
            aria-valuemax={99}
            aria-valuenow={quantity}
            style={{
              border: 'none',
              background: 'transparent',
              width: 'clamp(36px, 9vw, 42px)',
              textAlign: 'center',
              padding: 'clamp(4px, 1vw, 5px)',
              fontWeight: 600,
              fontSize: 'clamp(14px, 3.2vw, 15px)',
            }}
          />
          <button
            type="button"
            onClick={() => increaseQuantity(name)}
            disabled={isOutOfStock || quantity >= 99}
            aria-label={`增加${name}數量`}
            style={{
              width: 'clamp(24px, 6vw, 28px)',
              height: 'clamp(24px, 6vw, 28px)',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: 'clamp(4px, 1vw, 6px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
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

        {/* 去骨选项 */}
        {showCutOption && quantity > 0 && (
          <select
            value={cutOption}
            onChange={(e) => setCutOption(name, e.target.value)}
            aria-label={`${name}去骨選項`}
            style={{
              width: '100%',
              fontSize: 'clamp(11px,2.5vw,12px)',
              padding: 'clamp(4px, 1vw, 5px) clamp(6px, 1.5vw, 8px)',
              border: '1.5px solid var(--border)',
              borderRadius: 'clamp(6px, 1.5vw, 8px)',
              background: '#fff',
            }}
          >
            <option value="去骨">去骨</option>
            <option value="保留骨頭">保留骨頭</option>
          </select>
        )}
      </div>
    </div>
  );
}

