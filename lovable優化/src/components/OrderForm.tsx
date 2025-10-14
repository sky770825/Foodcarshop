/**
 * 📝 订单表单组件
 * 完整的订购流程表单
 */

import { useEffect, useState } from 'react';
import { useOrder } from '@/hooks/useOrder';
import { useInventory } from '@/hooks/useInventory';
import { fetchConfig } from '@/services/api';
import { ProductCard } from './ProductCard';
import { SideItem } from './SideItem';
import { CategoryBlock } from './CategoryBlock';
import type { TimeOptions, VenueOption } from '@/types';

export function OrderForm() {
  const {
    formData,
    orderItems,
    totalAmount,
    tasteOptions,
    updateFormData,
    setTasteOption,
    recalculateOrder,
    resetOrder,
    submit,
  } = useOrder();

  const { mainItems, sideCategories, switchVenue, preloadAllVenues } = useInventory();

  const [timeOptions, setTimeOptions] = useState<TimeOptions>({ hours: [], minutes: [] });
  const [methodOptions, setMethodOptions] = useState<string[]>([]);
  const [venueOptions, setVenueOptions] = useState<VenueOption[]>([]);
  const [orderResult, setOrderResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    orderNo?: string;
    orderSummary?: string;
    eta?: string;
  }>({ type: null, message: '' });

  // 載入系統配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await fetchConfig();
        if (data.timeOptions) setTimeOptions(data.timeOptions);
        if (data.methodOptions) setMethodOptions(data.methodOptions);
        if (data.venueOptions && data.venueOptions.length > 0) {
          setVenueOptions(data.venueOptions);
          
          // 🚀 預載入所有場地資料（背景執行，不阻塞 UI）
          setTimeout(() => {
            preloadAllVenues(data.venueOptions);
          }, 500); // 延遲 500ms，讓頁面先完成載入
        }
      } catch (err) {
        console.warn('配置載入失敗，使用預設值');
      }
    };
    loadConfig();
  }, [preloadAllVenues]);

  // 處理場地切換
  const handleVenueChange = async (venue: string) => {
    updateFormData({ venue });
    if (venue) {
      await switchVenue(venue);
    }
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await submit();

    if (result.success && result.orderNo) {
      // 組合取餐時間顯示
      const eta = `${formData.etaHour}:${formData.etaMinute}`;
      
      // 生成訂單摘要（用於顯示和複製）
      const nameParts = formData.name.trim().split(/[\s#]/);
      const mainName = nameParts[0] || '';
      const last3Digits = formData.phone.trim().slice(-3);
      const timeStr = `${formData.etaHour}點${formData.etaMinute}分`;
      
      // 取得場地名稱
      const venue = venueOptions.find((v) => v.code === formData.venue);
      const venueName = venue?.name || '未指定';
      
      // 格式化餐點（每行3個）
      const itemLines: string[] = [];
      for (let i = 0; i < orderItems.length; i += 3) {
        const lineItems = orderItems
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
      
      const orderSummary = `① 姓名.後三碼：${mainName}.${last3Digits}
② 取餐場地：${venueName}
③ 想預訂的時間：${timeStr}
④ 想預訂的餐點：
${itemsText}
⑤ 想搭配的調味：
${tasteText}
金額：${totalAmount}`;

      setOrderResult({
        type: 'success',
        message: `✅ 訂單已送出！`,
        orderNo: result.orderNo,
        orderSummary,
        eta,
      });

      // 自動滾動到結果
      setTimeout(() => {
        document.getElementById('order-result')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    } else {
      setOrderResult({
        type: 'error',
        message: '❌ 送出失敗，請重試',
      });
    }
  };

  // 處理清空表單
  const handleReset = () => {
    if (confirm('確定要清空所有選項嗎？')) {
      resetOrder();
      setOrderResult({ type: null, message: '' });
    }
  };

  useEffect(() => {
    recalculateOrder();
  }, [recalculateOrder]);

  return (
    <form onSubmit={handleSubmit} className="container">
      {/* 基本資料 */}
      <div className="card">
        <h2 className="section-title">訂購資料</h2>
        
        {/* 場地選擇 */}
        <div style={{ marginBottom: 'clamp(14px, 3.5vw, 18px)' }}>
          <label htmlFor="venue" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
            📍 取餐場地 <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            id="venue"
            required
            value={formData.venue}
            onChange={(e) => handleVenueChange(e.target.value)}
            style={{
              width: '100%',
              padding: 'clamp(10px, 2.5vw, 12px)',
              border: '1.5px solid var(--primary)',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              fontSize: 'clamp(15px, 3.5vw, 16px)',
              fontWeight: 600,
            }}
          >
            <option value="">請選擇取餐場地...</option>
            {venueOptions.map((v) => (
              <option key={v.code} value={v.code}>
                📍 {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* 姓名和电话 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'clamp(12px, 3vw, 16px)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="name" className="form-label">
              餐群姓名 & 群組ID <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="例如：王小明 #A123"
              autoComplete="off"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="phone" className="form-label">
              手機末3碼或全碼 <span className="required">*</span>
            </label>
            <input
              id="phone"
              type="text"
              required
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              placeholder="例如：123 或 0912345678"
              autoComplete="tel"
            />
          </div>
        </div>

        {/* 取餐方式和时间 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(12px, 3vw, 16px)', marginTop: 'clamp(14px, 3.5vw, 18px)' }}>
          <div>
            <label htmlFor="method" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              取餐方式 <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              id="method"
              required
              value={formData.method}
              onChange={(e) => updateFormData({ method: e.target.value })}
              style={{
                width: '100%',
                padding: 'clamp(10px, 2.5vw, 12px)',
                border: '1.5px solid var(--border)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                fontSize: 'clamp(15px, 3.5vw, 16px)',
              }}
            >
              <option value="">選擇方式...</option>
              {methodOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              預計取餐時間 <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(8px, 2vw, 10px)' }}>
              <select
                required
                value={formData.etaHour}
                onChange={(e) => updateFormData({ etaHour: e.target.value })}
                style={{
                  width: '100%',
                  padding: 'clamp(10px, 2.5vw, 12px)',
                  border: '1.5px solid var(--accent)',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  fontSize: 'clamp(15px, 3.5vw, 16px)',
                  fontWeight: 600,
                }}
              >
                <option value="">時</option>
                {timeOptions.hours.map((h) => (
                  <option key={h} value={h}>
                    {h} 點
                  </option>
                ))}
              </select>

              <select
                required
                value={formData.etaMinute}
                onChange={(e) => updateFormData({ etaMinute: e.target.value })}
                style={{
                  width: '100%',
                  padding: 'clamp(10px, 2.5vw, 12px)',
                  border: '1.5px solid var(--accent)',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  fontSize: 'clamp(15px, 3.5vw, 16px)',
                  fontWeight: 600,
                }}
              >
                <option value="">分</option>
                {timeOptions.minutes.map((m) => (
                  <option key={m} value={m}>
                    {m} 分
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 主餐區 */}
      <div className="card" role="region" aria-labelledby="main-dishes-title">
        <h2 className="section-title" id="main-dishes-title">
          主餐選擇 <span style={{ color: 'var(--primary)', fontSize: 'clamp(14px,3.5vw,16px)' }}>$150/份</span>
        </h2>
        <div className="product-grid" role="list" aria-label="主餐列表">
          {mainItems.map((item) => (
            <ProductCard
              key={item.name}
              name={item.name}
              imageUrl={item.imageUrl || item.img}
              type="main"
              showCutOption
            />
          ))}
        </div>
      </div>

      {/* 單點區 */}
      <div className="card" role="region" aria-labelledby="side-dishes-title">
        <h2 className="section-title" id="side-dishes-title">
          單點配菜 <span style={{ color: 'var(--primary)', fontSize: 'clamp(14px,3.5vw,16px)' }}>$30/份</span>
        </h2>
        <div className="side-list" role="list" aria-label="配菜列表">
          {Object.entries(sideCategories).map(([category, items]) => (
            <CategoryBlock key={category} category={category} itemCount={items.length}>
              {items.map((item) => (
                <SideItem key={item.name} name={item.name} />
              ))}
            </CategoryBlock>
          ))}
        </div>
      </div>

      {/* 口味客製 */}
      <div className="card" role="region" aria-labelledby="taste-title">
        <h2 className="section-title" id="taste-title">
          口味客製
        </h2>
        <div className="taste-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="spicy" className="form-label">
              <span aria-hidden="true">🌶️</span> 辣度
            </label>
            <select
              id="spicy"
              name="spicy"
              value={tasteOptions.辣度}
              onChange={(e) => setTasteOption('辣度', e.target.value)}
              aria-label="選擇辣度"
            >
              <option value="不辣">不辣</option>
              <option value="微辣">微辣</option>
              <option value="小辣">小辣</option>
              <option value="中辣">中辣</option>
              <option value="大辣">大辣</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="saltiness" className="form-label">
              <span aria-hidden="true">🧂</span> 鹹度
            </label>
            <select
              id="saltiness"
              name="saltiness"
              value={tasteOptions.鹹度}
              onChange={(e) => setTasteOption('鹹度', e.target.value)}
              aria-label="選擇鹹度"
            >
              <option value="清淡">清淡</option>
              <option value="正常">正常</option>
              <option value="重鹹">重鹹</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="lemon" className="form-label">
              <span aria-hidden="true">🍋</span> 檸檬
            </label>
            <select
              id="lemon"
              name="lemon"
              value={tasteOptions.檸檬}
              onChange={(e) => setTasteOption('檸檬', e.target.value)}
              aria-label="選擇是否加檸檬"
            >
              <option value="加檸檬">加檸檬</option>
              <option value="不加檸檬">不加檸檬</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="scallion" className="form-label">
              <span aria-hidden="true">🧅</span> 蒜泥
            </label>
            <select
              id="scallion"
              name="scallion"
              value={tasteOptions.蒜泥}
              onChange={(e) => setTasteOption('蒜泥', e.target.value)}
              aria-label="選擇是否加蒜泥"
            >
              <option value="加蒜泥">加蒜泥</option>
              <option value="不加蒜泥">不加蒜泥</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 'clamp(16px,4vw,18px)', marginBottom: 0 }}>
          <label htmlFor="note" className="form-label">
            <span aria-hidden="true">💬</span> 備註說明
          </label>
          <textarea
            id="note"
            name="note"
            value={formData.note}
            onChange={(e) => updateFormData({ note: e.target.value })}
            placeholder="💡 滿300贈送筍片，如不需要筍片請提前告知"
            aria-label="訂單備註說明"
            aria-describedby="note-help"
          />
          <span id="note-help" className="sr-only">
            可在此輸入特殊需求或備註事項
          </span>
        </div>
      </div>

      {/* 訂單預覽 + 總計（多欄佈局） */}
      <div className="summary-grid">
        {/* 訂單預覽 */}
        <div className="card" role="region" aria-labelledby="preview-title">
          <h2 className="section-title" id="preview-title">
            <span aria-hidden="true">📋</span> 訂單預覽
          </h2>
          <div
            style={{
              background: '#f9fafb',
              padding: 'clamp(10px, 2.5vw, 12px)',
              borderRadius: 'clamp(6px, 1.5vw, 8px)',
              border: '1.5px dashed var(--border)',
              minHeight: '80px',
            }}
          >
            {orderItems.length === 0 ? (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 'clamp(15px, 4vw, 20px)' }}>
                尚未選擇商品
              </div>
            ) : (
              orderItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'clamp(4px, 1vw, 5px) 0',
                    borderBottom: idx < orderItems.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <strong>{item.name}</strong> × {item.qty}{' '}
                  <span style={{ float: 'right', color: 'var(--primary)' }}>${item.subtotal}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 總計與按鈕 */}
        <div className="card" role="region" aria-labelledby="total-title">
          <div className="total-section">
            <div className="total-row">
              <span className="total-label" id="total-title">訂單總額</span>
              <span className="total-amount" id="totalAmt" role="status" aria-live="polite" aria-atomic="true">
                ${totalAmount}
              </span>
            </div>
          </div>

          <div className="btn-group">
            <button
              type="button"
              onClick={handleReset}
              className="btn-ghost"
              aria-label="清空所有選項重新填寫"
            >
              清空重填
            </button>
            <button
              type="submit"
              className="btn-primary"
              aria-label="送出訂單到系統"
            >
              <span aria-hidden="true">✓</span> 送出訂單
            </button>
          </div>

          {/* 訂單結果 */}
          <div id="result" role="status" aria-live="assertive" aria-atomic="true">
            {orderResult.type === 'success' && orderResult.orderNo && (
              <>
                <div className="message success">
                  ✅ 訂單已送出！<br />
                  <strong>訂單編號：{orderResult.orderNo}</strong>
                  <br />
                  <small>請準時於今日 {orderResult.eta} 取餐</small>
                </div>
                
                {/* 訂單摘要框 */}
                {orderResult.orderSummary && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '14px',
                      background: '#f9fafb',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'clamp(8px, 2vw, 10px)',
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      lineHeight: 1.8,
                      whiteSpace: 'pre-line',
                      fontFamily: 'monospace',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--text)',
                          fontSize: 'clamp(13px, 3.2vw, 14px)',
                          fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                      >
                        您此次的訂單如下
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          const summaryText = orderResult.orderSummary || '';
                          navigator.clipboard.writeText(summaryText);
                          btn.textContent = '✓ 已複製';
                          setTimeout(() => {
                            btn.textContent = '📋 複製訂單';
                          }, 2000);
                        }}
                        style={{
                          padding: '4px 10px',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: 'clamp(10px, 2.5vw, 11px)',
                          cursor: 'pointer',
                          fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📋 複製訂單
                      </button>
                    </div>
                    <div>{orderResult.orderSummary}</div>
                  </div>
                )}
              </>
            )}
            
            {orderResult.type === 'error' && (
              <div className="message error">{orderResult.message}</div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

