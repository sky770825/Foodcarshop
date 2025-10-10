// ============================================
// 極品鹽水雞 - Google Apps Script 後端
// ============================================

const SHEET_ID = '1zY-y7flT2zL3SrVFL3kr4x8whwsQz_Ai5QwGXqlNVXM'; // 公開測試版 Google Sheets ID
const INVENTORY_SHEET = '庫存管理';
const ORDER_SHEET = '訂單記錄';
const CONFIG_SHEET = '系統設定';

// ========== API 端點 ==========

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getInventory') {
    return getInventory();
  } else if (action === 'getConfig') {
    return getConfig();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    msg: '未知的請求'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // 解析表單資料
    const params = e.parameter;
    
    // 檢查營業狀態
    if (!checkBusinessStatus()) {
      return jsonResponse({
        ok: false,
        msg: '目前暫停接單，請稍後再試'
      });
    }
    
    // 解析訂購項目
    const items = parseItems(params.itemsDetail);
    
    // 鎖定庫存檢查與扣減（原子操作）
    const lock = LockService.getScriptLock();
    lock.waitLock(10000); // 等待最多 10 秒
    
    try {
      // 檢查庫存是否足夠
      const stockCheck = checkStock(items);
      if (!stockCheck.ok) {
        return jsonResponse({
          ok: false,
          msg: stockCheck.msg
        });
      }
      
      // 扣減庫存
      deductStock(items);
      
      // 儲存訂單
      const orderNo = saveOrder(params);
      
      return jsonResponse({
        ok: true,
        orderNo: orderNo,
        msg: '訂單成功'
      });
      
    } finally {
      lock.releaseLock(); // 釋放鎖
    }
    
  } catch (err) {
    Logger.log('錯誤: ' + err.message);
    return jsonResponse({
      ok: false,
      msg: '系統錯誤: ' + err.message
    });
  }
}

// ========== 庫存相關功能 ==========

// 取得庫存狀態（供前端載入時呼叫）
function getInventory() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(INVENTORY_SHEET);
    const data = sheet.getDataRange().getValues();
    
    const inventory = {};
    
    // 從第2行開始（跳過標題）
    for (let i = 1; i < data.length; i++) {
      const [name, type, currentStock, initialStock, status] = data[i];
      inventory[name] = {
        type: type,
        stock: currentStock,
        initialStock: initialStock,
        available: currentStock > 0,
        status: status
      };
    }
    
    return jsonResponse({
      ok: true,
      inventory: inventory,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    return jsonResponse({
      ok: false,
      msg: '無法取得庫存: ' + err.message
    });
  }
}

// 檢查庫存是否足夠
function checkStock(items) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INVENTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const inventory = {};
  for (let i = 1; i < data.length; i++) {
    inventory[data[i][0]] = {
      row: i + 1,
      stock: data[i][2]
    };
  }
  
  // 檢查每個訂購項目
  for (const item of items) {
    const inv = inventory[item.name];
    if (!inv) continue; // 跳過不在庫存表中的項目
    
    if (inv.stock < item.qty) {
      return {
        ok: false,
        msg: `【${item.name}】庫存不足（剩餘 ${inv.stock} 份，您訂購 ${item.qty} 份）`
      };
    }
  }
  
  return { ok: true };
}

// 扣減庫存
function deductStock(items) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INVENTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  
  const inventory = {};
  for (let i = 1; i < data.length; i++) {
    inventory[data[i][0]] = {
      row: i + 1,
      stock: data[i][2]
    };
  }
  
  // 扣減每個項目的庫存
  for (const item of items) {
    const inv = inventory[item.name];
    if (!inv) continue;
    
    const newStock = inv.stock - item.qty;
    sheet.getRange(inv.row, 3).setValue(newStock); // 更新當前庫存（C欄）
    
    // 狀態由 Google Sheets 公式自動管理，不需要手動設置
    // 公式：=IF(C2>0,"正常","缺貨")
  }
}

// ========== 訂單相關功能 ==========

function saveOrder(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDER_SHEET);
  
  // 生成訂單編號
  const orderNo = generateOrderNo();
  
  // 新增訂單到工作表
  sheet.appendRow([
    new Date(),           // 訂單時間
    orderNo,              // 訂單編號
    params.name,          // 姓名
    params.phone,         // 電話
    params.method,        // 取餐方式
    params.eta,           // 預計取餐時間
    params.itemsDetail,   // 訂購項目
    params.total,         // 總金額
    params.taste,         // 口味
    params.cut,           // 去骨選項
    params.note,          // 備註
    '待處理',             // 訂單狀態
    params.source || 'web', // 來源
    params.orderSummary || '' // 訂單摘要（格式化文字）
  ]);
  
  return orderNo;
}

// 生成訂單編號（格式：月日-序號，例如：1010-001）
function generateOrderNo() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDER_SHEET);
  
  const now = new Date();
  const datePrefix = Utilities.formatDate(now, 'Asia/Taipei', 'MMdd'); // 例如：1010
  
  // 取得今日已有的訂單數量
  const data = sheet.getDataRange().getValues();
  let todayCount = 0;
  
  // 從第2行開始（跳過標題）
  for (let i = 1; i < data.length; i++) {
    const orderNo = data[i][1]; // B欄：訂單編號
    if (orderNo && orderNo.toString().startsWith(datePrefix)) {
      todayCount++;
    }
  }
  
  // 序號從 1 開始，補零成 3 位數
  const sequence = (todayCount + 1).toString().padStart(3, '0');
  
  return `${datePrefix}-${sequence}`;
}

// ========== 系統設定 ==========

function checkBusinessStatus() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_SHEET);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === '暫停接單') {
        return data[i][1] !== '是' && data[i][1] !== 'YES' && data[i][1] !== true;
      }
    }
    return true; // 預設允許接單
  } catch (err) {
    return true;
  }
}

function getConfig() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_SHEET);
    const data = sheet.getDataRange().getValues();
    
    const config = {};
    for (let i = 1; i < data.length; i++) {
      config[data[i][0]] = data[i][1];
    }
    
    // 生成取餐時間選項
    const timeStart = parseInt(config['取餐時間_開始']) || 14;
    const timeEnd = parseInt(config['取餐時間_結束']) || 20;
    const timeInterval = parseInt(config['取餐時間_間隔']) || 5;
    
    const hourOptions = [];
    for (let h = timeStart; h <= timeEnd; h++) {
      hourOptions.push(h);
    }
    
    const minuteOptions = [];
    for (let m = 0; m < 60; m += timeInterval) {
      minuteOptions.push(m.toString().padStart(2, '0'));
    }
    
    // 取餐方式選項（逗号分隔）
    const methodOptions = (config['取餐方式'] || '現場自取,託人代取').split(',').map(s => s.trim());
    
    return jsonResponse({
      ok: true,
      config: config,
      timeOptions: {
        hours: hourOptions,
        minutes: minuteOptions
      },
      methodOptions: methodOptions
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      msg: '無法取得設定'
    });
  }
}

// ========== 工具函數 ==========

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 解析訂購項目字串（例如："鹽水半雞 x2 / 花椰菜 x1"）
function parseItems(itemsDetail) {
  const items = [];
  const parts = itemsDetail.split(' / ');
  
  for (const part of parts) {
    const match = part.match(/(.+?)\s*x(\d+)/);
    if (match) {
      items.push({
        name: match[1].trim(),
        qty: parseInt(match[2])
      });
    }
  }
  
  return items;
}

// ========== 管理功能（可選）==========

// 重置所有商品庫存為初始值
function resetAllStock() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INVENTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const initialStock = data[i][3]; // D欄：初始庫存
    sheet.getRange(i + 1, 3).setValue(initialStock); // C欄：當前庫存
    // E欄狀態由公式自動管理：=IF(C2>0,"正常","缺貨")
  }
  
  Logger.log('庫存已重置');
}

// 手動補充特定商品庫存
function addStock(itemName, quantity) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(INVENTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === itemName) {
      const currentStock = data[i][2];
      const newStock = currentStock + quantity;
      sheet.getRange(i + 1, 3).setValue(newStock);
      // E欄狀態由公式自動管理：=IF(C2>0,"正常","缺貨")
      Logger.log(`${itemName} 庫存已補充 ${quantity}，當前庫存：${newStock}`);
      return;
    }
  }
  
  Logger.log('找不到商品：' + itemName);
}

