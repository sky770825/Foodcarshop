// ============================================
// 主應用程式 - 自動從 CONFIG 載入設定（含授權檢查）
// ============================================

// 檢查 CONFIG 是否已載入
if (typeof CONFIG === 'undefined') {
  alert('配置檔載入失敗！請確認 config.js 存在且正確。');
  throw new Error('CONFIG not found');
}

// ====== 授權檢查 ======
async function checkAuthorization() {
  // 如果沒有設定授權系統，跳過檢查（降級處理）
  if (!CONFIG.websiteId || CONFIG.websiteId === 'YOUR_WEBSITE_ID_HERE' ||
      !CONFIG.authApiUrl || CONFIG.authApiUrl === 'YOUR_AUTH_API_URL_HERE') {
    console.log('授權系統未設定，跳過授權檢查');
    return { authorized: true, skipCheck: true };
  }
  
  try {
    const url = `${CONFIG.authApiUrl}?action=checkAuth&websiteId=${CONFIG.websiteId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return data;
  } catch (err) {
    console.error('授權檢查失敗:', err);
    // 降級處理：如果授權API連接失敗，允許使用（避免誤鎖）
    return { authorized: true, error: true };
  }
}

// ====== 顯示授權鎖定彈窗（覆蓋層）======
function showLockScreen(authData) {
  // 創建覆蓋層
  const overlay = document.createElement('div');
  overlay.id = 'authLockOverlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
  `;
  
  overlay.innerHTML = `
    <style>
      @keyframes fadeIn { from {opacity: 0} to {opacity: 1} }
      @keyframes slideUp { from {transform: translateY(30px); opacity: 0} to {transform: translateY(0); opacity: 1} }
      .line-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 28px;
        background: linear-gradient(135deg, #06C755 0%, #00B900 100%);
        color: white;
        text-decoration: none;
        border-radius: 12px;
        font-weight: 700;
        font-size: 16px;
        box-shadow: 0 4px 15px rgba(6, 199, 85, 0.4);
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .line-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(6, 199, 85, 0.5);
      }
      .line-btn:active {
        transform: translateY(0);
      }
      .line-icon {
        width: 24px;
        height: 24px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #06C755;
      }
    </style>
    <div style="
      max-width: 500px;
      background: white;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 25px 80px rgba(0,0,0,0.3);
      text-align: center;
      animation: slideUp 0.4s ease;
      position: relative;
    ">
      <div style="
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        font-size: 42px;
      ">🔒</div>
      
      <h1 style="
        font-size: 28px;
        color: #1a1a1a;
        margin-bottom: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
      ">${authData.reason === 'expired' ? '訂閱已到期' : '授權已停用'}</h1>
      
      ${authData.businessName ? `<p style="color: #6b7280; margin-bottom: 25px; font-size: 16px;">${authData.businessName}</p>` : ''}
      
      <div style="
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 2px solid #fca5a5;
        border-radius: 16px;
        padding: 20px;
        margin: 25px 0;
        text-align: left;
      ">
        <p style="margin: 0; color: #991b1b; font-size: 15px; line-height: 1.6; font-weight: 500;">
          ${authData.msg}
        </p>
        ${authData.expireDate ? `<p style="margin: 12px 0 0; color: #dc2626; font-weight: 700; font-size: 15px;">📅 到期日期：${authData.expireDate}</p>` : ''}
      </div>
      
      <div style="
        background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        border-radius: 16px;
        padding: 24px;
        margin: 25px 0;
        border: 2px solid #e5e7eb;
      ">
        <h3 style="margin: 0 0 15px; font-size: 17px; color: #1a1a1a; font-weight: 700; display: flex; align-items: center; gap: 8px;">
          💰 選擇訂閱方案
        </h3>
        <select style="
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #d1d5db;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          background: white;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        " onchange="this.style.borderColor='#06C755'; this.style.background='#f0fdf4';">
          <option value="">請選擇方案</option>
          <option value="月繳">✨ 月繳 - 600元/月</option>
          <option value="季繳">🎯 季繳 - 1440元/3月（8折優惠）</option>
          <option value="半年繳">🎁 半年繳 - 2880元/6月（8折優惠）</option>
          <option value="年繳">⭐ 年繳 - 5400元/年（75折優惠）</option>
        </select>
        <p style="margin: 12px 0 0; font-size: 13px; color: #6b7280; text-align: left;">
          💡 選擇方案後，點擊下方 LINE 按鈕聯絡我們
        </p>
      </div>
      
      <div style="
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        border-radius: 16px;
        padding: 28px;
        margin: 25px 0;
        border: 2px solid #93c5fd;
      ">
        <h3 style="margin: 0 0 20px; font-size: 18px; color: #1e40af; font-weight: 700;">📞 立即續費</h3>
        
        <a href="https://lin.ee/SPqm3iw" target="_blank" class="line-btn">
          <span class="line-icon">L</span>
          <span>加入 LINE 續費</span>
        </a>
        
        <p style="margin: 15px 0 0; color: #1e40af; font-size: 13px; font-weight: 500;">
          續費時請提供網站ID：<strong style="
            background: white;
            padding: 4px 12px;
            border-radius: 6px;
            color: #dc2626;
            font-size: 15px;
          ">${CONFIG.websiteId}</strong>
        </p>
      </div>
      
      <p style="margin: 20px 0 0; color: #9ca3af; font-size: 13px;">
        重新整理頁面以重新檢查授權狀態
      </p>
    </div>
  `;
  
  // 阻止背景滾動
  document.body.style.overflow = 'hidden';
  
  document.body.appendChild(overlay);
}

// ====== 顯示到期警告 ======
function showExpiryWarning(authData) {
  const warningDiv = document.createElement('div');
  const isTrial = authData.isTrial;
  const bgColor = isTrial ? '#fef2f2' : '#fef3c7';
  const textColor = isTrial ? '#991b1b' : '#92400e';
  const borderColor = isTrial ? '#dc2626' : '#f59e0b';
  
  warningDiv.style.cssText = `
    position: sticky;
    top: 0;
    z-index: 99;
    background: ${bgColor};
    border-bottom: 3px solid ${borderColor};
    padding: 12px 20px;
    text-align: center;
    font-weight: 600;
    color: ${textColor};
    font-size: 14px;
    animation: slideDown 0.3s ease;
  `;
  
  const emoji = isTrial ? '🎁' : '⚠️';
  const prefix = isTrial ? '試用期即將結束' : '訂閱即將到期';
  
  warningDiv.innerHTML = `
    ${emoji} ${prefix}（剩餘 ${authData.daysLeft} 天，${authData.expireDate}），請${isTrial ? '聯繫我們選擇訂閱方案' : '盡快續費以免影響使用'}
  `;
  
  document.body.insertBefore(warningDiv, document.body.firstChild);
}

// ====== 初始化頁面 ======
function initializePage() {
  // 設定頁面標題
  document.title = `${CONFIG.brandName}｜線上預訂`;
  document.getElementById('pageTitle').textContent = `${CONFIG.brandName}｜線上預訂`;
  
  // 設定品牌資訊
  document.getElementById('brandLogo').src = CONFIG.logoUrl;
  document.getElementById('brandLogo').alt = CONFIG.brandName;
  document.getElementById('brandName').textContent = CONFIG.brandName;
  document.getElementById('brandSubtitle').textContent = CONFIG.brandSubtitle;
  
  // 應用品牌顏色
  const root = document.documentElement;
  root.style.setProperty('--primary', CONFIG.colors.primary);
  root.style.setProperty('--primary-dark', CONFIG.colors.primaryDark);
  root.style.setProperty('--accent', CONFIG.colors.accent);
  root.style.setProperty('--success', CONFIG.colors.success);
  root.style.setProperty('--danger', CONFIG.colors.danger);
  
  // 設定價格標籤
  document.getElementById('mainPriceLabel').textContent = `$${CONFIG.pricing.main}/份`;
  document.getElementById('sidePriceLabel').textContent = `$${CONFIG.pricing.side}/份`;
  
  // 生成菜單圖片
  if (CONFIG.menuImages && CONFIG.menuImages.length > 0) {
    generateMenuImages();
    document.getElementById('menuImagesCard').style.display = 'block';
  }
  
  // 生成主餐
  generateMainItems();
  
  // 生成單點配菜
  generateSideItems();
  
  // 生成口味選項
  generateTasteOptions();
  
  // 生成取餐方式
  generatePickupMethods();
  
  // 生成取餐時間
  generatePickupTime();
  
  // 初始化事件監聽
  initializeEventListeners();
}

// ====== 生成菜單圖片 ======
function generateMenuImages() {
  const container = document.getElementById('menuImagesContainer');
  CONFIG.menuImages.forEach(menu => {
    const div = document.createElement('div');
    div.className = 'menu-image-wrap';
    div.dataset.image = menu.url;
    div.dataset.name = menu.alt;
    div.innerHTML = `<img src="${menu.url}" alt="${menu.alt}" class="menu-image" loading="lazy" />`;
    container.appendChild(div);
  });
}

// ====== 生成主餐項目 ======
function generateMainItems() {
  const mainsBox = document.getElementById('mains');
  mainsBox.innerHTML = '';
  
  CONFIG.mainItems.forEach(item => {
    const card = document.createElement('div');
    card.className = item.outOfStock ? 'product-card out-of-stock' : 'product-card';
    card.innerHTML = `
      ${item.outOfStock ? '<div class="out-of-stock-badge">缺貨中</div>' : ''}
      <div class="product-image-wrap" data-image="${item.img.replace('w=400&h=400', 'w=800&h=800')}" data-name="${item.name}">
        <img src="${item.img}" alt="${item.name}" class="product-image" loading="lazy" />
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:clamp(5px,1.2vw,6px);">
        <div class="product-name" style="margin-bottom:0;">${item.name}</div>
        <div class="product-price" style="margin-bottom:0;">$${CONFIG.pricing.main}</div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:clamp(4px,1vw,6px);">
        <div class="qty-control">
          <button type="button" class="qty-btn" data-action="decrease" data-target="${item.name}" ${item.outOfStock ? 'disabled' : ''}>−</button>
          <input 
            type="number" 
            min="0" 
            max="99"
            value="0" 
            data-type="main" 
            data-name="${item.name}" 
            class="qty"
            ${item.outOfStock ? 'disabled' : ''}
          />
          <button type="button" class="qty-btn" data-action="increase" data-target="${item.name}" ${item.outOfStock ? 'disabled' : ''}>+</button>
        </div>
        <select data-cut="${item.name}" style="width:100%; font-size:clamp(11px,2.5vw,12px);" ${item.outOfStock ? 'disabled' : ''}>
          <option>去骨</option>
          <option>保留骨頭</option>
        </select>
      </div>
    `;
    mainsBox.appendChild(card);
  });
}

// ====== 生成單點配菜 ======
function generateSideItems() {
  const sidesBox = document.getElementById('sides');
  sidesBox.innerHTML = '';
  
  Object.keys(CONFIG.sideItems).forEach(category => {
    // 分類區塊容器
    const categoryBlock = document.createElement('div');
    categoryBlock.className = 'category-block';
    
    // 分類標題
    const categoryTitle = document.createElement('div');
    categoryTitle.className = 'category-title';
    categoryTitle.innerHTML = `
      <span>${category} <small style="opacity:0.7">(${CONFIG.sideItems[category].length}項)</small></span>
      <span class="toggle-icon">▼</span>
    `;
    categoryBlock.appendChild(categoryTitle);
    
    // 分類內容
    const categoryContent = document.createElement('div');
    categoryContent.className = 'category-content';
    
    // 該分類的品項
    CONFIG.sideItems[category].forEach(item => {
      const sideItem = document.createElement('div');
      sideItem.className = 'side-item';
      sideItem.innerHTML = `
        <span class="eye-icon" data-image="${item.img.replace('w=600&h=600', 'w=800&h=800')}" data-name="${item.name}">🔍</span>
        <div class="side-item-name">${item.name}</div>
        <div class="qty-control">
          <button type="button" class="qty-btn" data-action="decrease" data-target="${item.name}">−</button>
          <input 
            type="number" 
            min="0" 
            max="99"
            value="0" 
            data-type="side" 
            data-name="${item.name}" 
            class="qty"
          />
          <button type="button" class="qty-btn" data-action="increase" data-target="${item.name}">+</button>
        </div>
      `;
      categoryContent.appendChild(sideItem);
    });
    
    categoryBlock.appendChild(categoryContent);
    sidesBox.appendChild(categoryBlock);
    
    // 點擊標題切換展開/收合
    categoryTitle.addEventListener('click', () => {
      categoryTitle.classList.toggle('active');
      categoryContent.classList.toggle('active');
    });
  });
}

// ====== 生成口味選項 ======
function generateTasteOptions() {
  const spicySelect = document.getElementById('spicySelect');
  const saltinessSelect = document.getElementById('saltinessSelect');
  const lemonSelect = document.getElementById('lemonSelect');
  const scallionSelect = document.getElementById('scallionSelect');
  
  // 辣度
  CONFIG.tasteOptions.spicy.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    spicySelect.appendChild(opt);
  });
  
  // 鹹度
  CONFIG.tasteOptions.saltiness.forEach((option, index) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    if (option === '正常') opt.selected = true;
    saltinessSelect.appendChild(opt);
  });
  
  // 檸檬
  CONFIG.tasteOptions.lemon.forEach((option, index) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    if (index === 0) opt.selected = true;
    lemonSelect.appendChild(opt);
  });
  
  // 蔥泥
  CONFIG.tasteOptions.scallion.forEach((option, index) => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    if (index === 0) opt.selected = true;
    scallionSelect.appendChild(opt);
  });
}

// ====== 生成取餐方式 ======
function generatePickupMethods() {
  const methodSelect = document.getElementById('pickupMethod');
  methodSelect.innerHTML = '';
  
  CONFIG.pickupMethods.forEach(method => {
    const opt = document.createElement('option');
    opt.value = method;
    opt.textContent = method;
    methodSelect.appendChild(opt);
  });
}

// ====== 生成取餐時間 ======
function generatePickupTime() {
  const hourSelect = document.getElementById('etaHour');
  const minuteSelect = document.getElementById('etaMinute');
  
  // 清空
  hourSelect.innerHTML = '<option value="">時</option>';
  minuteSelect.innerHTML = '<option value="">分</option>';
  
  // 生成小時選項
  for (let h = CONFIG.pickupTime.hourStart; h <= CONFIG.pickupTime.hourEnd; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = `${h} 點`;
    hourSelect.appendChild(opt);
  }
  
  // 生成分鐘選項
  for (let m = 0; m < 60; m += CONFIG.pickupTime.minuteInterval) {
    const opt = document.createElement('option');
    const minuteStr = m.toString().padStart(2, '0');
    opt.value = minuteStr;
    opt.textContent = `${minuteStr} 分`;
    minuteSelect.appendChild(opt);
  }
}

// ====== 初始化事件監聽 ======
function initializeEventListeners() {
  // 取餐時間組合
  const etaHour = document.getElementById('etaHour');
  const etaMinute = document.getElementById('etaMinute');
  const etaCombined = document.getElementById('etaCombined');
  
  function updateEta() {
    const hour = etaHour.value;
    const minute = etaMinute.value;
    if (hour && minute) {
      etaCombined.value = `${hour}:${minute}`;
    } else {
      etaCombined.value = '';
    }
  }
  
  etaHour.addEventListener('change', updateEta);
  etaMinute.addEventListener('change', updateEta);
  
  // 數量增減按鈕
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const targetName = btn.dataset.target;
    const input = document.querySelector(`input[data-name="${targetName}"]`);
    
    if (!input) return;
    
    let currentValue = parseInt(input.value) || 0;
    
    if (action === 'increase' && currentValue < 99) {
      currentValue++;
    } else if (action === 'decrease' && currentValue > 0) {
      currentValue--;
    }
    
    input.value = currentValue;
    input.setAttribute('value', currentValue);
    
    // 觸發計算
    recalc();
  });
  
  // 圖片點擊放大
  const imageModal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  
  // 品牌 Logo 點擊放大
  const brandLogo = document.getElementById('brandLogo');
  brandLogo.addEventListener('click', () => {
    modalImage.src = CONFIG.logoUrl;
    modalImage.alt = CONFIG.brandName;
    imageModal.classList.add('active');
  });
  
  // 商品圖片點擊放大（事件委派）
  document.addEventListener('click', (e) => {
    const menuImageWrap = e.target.closest('.menu-image-wrap');
    const imageWrap = e.target.closest('.product-image-wrap');
    const eyeIcon = e.target.closest('.eye-icon');
    
    if (menuImageWrap) {
      const largeImage = menuImageWrap.dataset.image;
      const name = menuImageWrap.dataset.name;
      modalImage.src = largeImage;
      modalImage.alt = name;
      imageModal.classList.add('active');
    } else if (imageWrap) {
      const largeImage = imageWrap.dataset.image;
      const name = imageWrap.dataset.name;
      modalImage.src = largeImage;
      modalImage.alt = name;
      imageModal.classList.add('active');
    } else if (eyeIcon) {
      const largeImage = eyeIcon.dataset.image;
      const name = eyeIcon.dataset.name;
      modalImage.src = largeImage;
      modalImage.alt = name;
      imageModal.classList.add('active');
    }
  });
  
  // 點擊模態框關閉
  imageModal.addEventListener('click', () => {
    imageModal.classList.remove('active');
  });
  
  // 數量輸入框監聽
  const qtyInputs = document.querySelectorAll('.qty');
  qtyInputs.forEach(input => {
    input.addEventListener('input', recalc);
    input.addEventListener('input', function() {
      this.setAttribute('value', this.value);
    });
  });
  
  // 清空按鈕
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('確定要清空所有選項嗎？')) {
      const form = document.getElementById('orderForm');
      form.reset();
      
      // 重置時間選擇
      etaHour.value = '';
      etaMinute.value = '';
      etaCombined.value = '';
      
      // 重置數量輸入
      const qtyInputs = document.querySelectorAll('.qty');
      qtyInputs.forEach(q => {
        q.value = 0;
        q.setAttribute('value', '0');
      });
      
      recalc();
      document.getElementById('result').innerHTML = '';
    }
  });
  
  // 表單送出
  const form = document.getElementById('orderForm');
  form.addEventListener('submit', handleSubmit);
}

// ====== 即時計算與預覽 ======
function recalc() {
  const qtyInputs = document.querySelectorAll('.qty');
  const previewEl = document.getElementById('preview');
  const totalEl = document.getElementById('totalAmt');
  
  let items = [];
  let total = 0;
  
  qtyInputs.forEach(q => {
    const n = parseInt(q.value || '0', 10);
    if (n > 0) {
      const name = q.dataset.name;
      const kind = q.dataset.type;
      const price = (kind === 'main') ? CONFIG.pricing.main : CONFIG.pricing.side;
      total += n * price;
      items.push({name, qty: n, price, subtotal: n * price});
    }
  });
  
  if (items.length === 0) {
    previewEl.innerHTML = '<div class="preview-empty">尚未選擇商品</div>';
  } else {
    previewEl.innerHTML = items.map(item => `
      <div class="preview-item">
        <strong>${item.name}</strong> × ${item.qty} 
        <span style="float:right;color:var(--primary)">$${item.subtotal}</span>
      </div>
    `).join('');
  }
  
  totalEl.textContent = `$${total}`;
  return {items, total};
}

// ====== 表單送出處理 ======
async function handleSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('orderForm');
  const result = document.getElementById('result');
  const etaCombined = document.getElementById('etaCombined');
  
  const {items, total} = recalc();
  
  // 驗證時間
  if (!etaCombined.value) {
    result.innerHTML = '<div class="message error">⚠️ 請選擇取餐時間</div>';
    return;
  }
  
  if (items.length === 0) {
    result.innerHTML = '<div class="message error">⚠️ 請至少選擇 1 項商品</div>';
    return;
  }
  
  // 檢查 GAS_ENDPOINT 是否已設定
  if (!CONFIG.gasEndpoint || CONFIG.gasEndpoint === 'YOUR_GAS_DEPLOYMENT_URL_HERE') {
    result.innerHTML = '<div class="message error">⚠️ 尚未設定後端 API 網址<br/><small>請在 config.js 中設定 gasEndpoint</small></div>';
    return;
  }
  
  // 收集口味選項
  const tasteOptions = {
    辣度: form.spicy.value,
    鹹度: form.saltiness.value,
    檸檬: form.lemon.value,
    蔥泥: form.scallion.value
  };
  
  // 收集去骨選項
  const cuts = {};
  document.querySelectorAll('select[data-cut]').forEach(s => {
    const qty = document.querySelector(`input[data-name="${s.dataset.cut}"]`).value;
    if (parseInt(qty) > 0) {
      cuts[s.dataset.cut] = s.value;
    }
  });
  
  const itemsDetail = items.map(it => `${it.name} x${it.qty}`).join(' / ');
  
  // 格式化口味和去骨选项为字符串
  const tasteStr = Object.entries(tasteOptions).map(([k, v]) => v).join('、');
  const cutStr = Object.entries(cuts).map(([k, v]) => `${k}:${v}`).join(', ');
  
  // 生成格式化訂單摘要
  const nameParts = form.name.value.trim().split(/[\s\#]/);
  const mainName = nameParts[0] || '';
  const phone = form.phone.value.trim();
  const last3Digits = phone.slice(-3);
  const [hour, minute] = etaCombined.value.split(':');
  const timeStr = `${hour}點${minute}分`;
  
  // 格式化餐點（每行3個）
  const itemLines = [];
  for (let i = 0; i < items.length; i += 3) {
    const lineItems = items.slice(i, i + 3).map(it => `${it.name} x${it.qty}`).join(' / ');
    itemLines.push(lineItems);
  }
  const itemsText = itemLines.join('\n');
  
  // 格式化調味
  const tasteText = Object.entries(tasteOptions).map(([k, v]) => `${k}：${v}`).join('\n');
  
  // 組合訂單摘要
  const orderSummary = `① 姓名.後三碼：${mainName}.${last3Digits}
② 想預訂的時間：${timeStr}
③ 想預訂的餐點：
${itemsText}
④ 想搭配的調味：
${tasteText}
金額：${total}`;
  
  const payload = {
    ts: new Date().toISOString(),
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    method: form.method.value,
    eta: etaCombined.value,
    itemsDetail,
    total,
    taste: tasteStr,
    cut: cutStr,
    note: form.note.value.trim(),
    orderSummary: orderSummary,
    source: 'web'
  };
  
  try {
    result.innerHTML = '<div class="message">⏳ 送出中，請稍候...</div>';
    
    // 使用 FormData 格式
    const formData = new FormData();
    Object.keys(payload).forEach(key => {
      formData.append(key, payload[key]);
    });
    
    const res = await fetch(CONFIG.gasEndpoint, {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    
    if (data.ok) {
      result.innerHTML = `
        <div class="message success">
          ✅ 訂單已送出！<br/>
          <strong>訂單編號：${data.orderNo}</strong><br/>
          <small>請準時於今日 ${etaCombined.value} 取餐</small>
        </div>
        <div style="
          margin-top: 12px;
          padding: 14px;
          background: #f9fafb;
          border: 1.5px solid var(--border);
          border-radius: clamp(8px, 2vw, 10px);
          font-size: clamp(12px, 3vw, 13px);
          line-height: 1.8;
          white-space: pre-line;
          font-family: monospace;
          position: relative;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border);
          ">
            <span style="
              font-weight: 600;
              color: var(--text);
              font-size: clamp(13px, 3.2vw, 14px);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">您此次的訂單如下</span>
            <button 
              type="button"
              onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent); this.textContent='✓ 已複製'; setTimeout(()=>this.textContent='📋 複製訂單', 2000)"
              style="
                padding: 4px 10px;
                background: var(--primary);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: clamp(10px, 2.5vw, 11px);
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                white-space: nowrap;
              "
            >📋 複製訂單</button>
          </div>
          <div>${orderSummary}</div>
        </div>
      `;
      result.scrollIntoView({behavior: 'smooth', block: 'center'});
    } else {
      result.innerHTML = `<div class="message error">❌ 送出失敗：${data.msg || '未知錯誤'}</div>`;
    }
  } catch (err) {
    console.error('詳細錯誤:', err);
    result.innerHTML = `<div class="message error">❌ 連線失敗：${err.message}<br/><small>請檢查網路或聯繫管理員</small></div>`;
  }
}

// ====== 頁面載入時初始化 ======
document.addEventListener('DOMContentLoaded', async () => {
  // 先檢查授權
  const authResult = await checkAuthorization();
  
  // 如果授權無效，顯示鎖定頁面
  if (!authResult.authorized) {
    showLockScreen(authResult);
    return; // 停止初始化
  }
  
  // 如果授權即將到期，顯示警告
  if (authResult.showWarning) {
    showExpiryWarning(authResult);
  }
  
  // 授權有效，正常初始化頁面
  initializePage();
  recalc();
});

