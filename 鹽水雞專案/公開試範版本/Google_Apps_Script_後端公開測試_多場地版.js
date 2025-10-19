// ============================================
// 極品鹽水雞 - Google Apps Script 後端（多場地版）
// 公開測試版 - 支援多場地管理
// ============================================

const SHEET_ID = '1zY-y7flT2zL3SrVFL3kr4x8whwsQz_Ai5QwGXqlNVXM'; // 公開測試版 Google Sheets ID
const VENUE_LIST_SHEET = '場地清單'; // 場地列表工作表
const CONFIG_SHEET = '系統設定';

// ========== API 端點 ==========

function doGet(e) {
  const action = e.parameter.action;
  const venue = e.parameter.venue; // 場地參數
  
  if (action === 'getInventory') {
    return getInventory(venue);
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
    const venue = params.venue; // 場地代碼
    
    // 檢查營業狀態
    if (!checkBusinessStatus()) {
      return jsonResponse({
        ok: false,
        msg: '目前暫停接單，請稍後再試'
      });
    }
    
    // 驗證場地
    if (!venue) {
      return jsonResponse({
        ok: false,
        msg: '請選擇取餐場地'
      });
    }
    
    // 解析訂購項目
    const items = parseItems(params.itemsDetail);
    
    // 鎖定庫存檢查與扣減（原子操作）
    const lock = LockService.getScriptLock();
    lock.waitLock(10000); // 等待最多 10 秒
    
    try {
      // 檢查庫存是否足夠（根據場地）
      const stockCheck = checkStock(items, venue);
      if (!stockCheck.ok) {
        return jsonResponse({
          ok: false,
          msg: stockCheck.msg
        });
      }
      
      // 扣減庫存（根據場地）
      deductStock(items, venue);
      
      // 儲存訂單（根據場地）
      const orderNo = saveOrder(params, venue);
      
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

// ========== 場地管理 ==========

// 取得場地列表
function getVenueList() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(VENUE_LIST_SHEET);
    const data = sheet.getDataRange().getValues();
    
    const venues = [];
    
    // 從第2行開始（跳過標題）
    for (let i = 1; i < data.length; i++) {
      const [code, name, status, inventorySheet, orderSheet] = data[i];
      if (code && name) {
        venues.push({
          code: code,
          name: name,
          status: status || '營業中',
          inventorySheet: inventorySheet,
          orderSheet: orderSheet
        });
      }
    }
    
    return venues;
  } catch (err) {
    Logger.log('取得場地列表失敗: ' + err.message);
    return [];
  }
}

// 根據場地代碼取得場地資訊
function getVenueInfo(venueCode) {
  const venues = getVenueList();
  return venues.find(v => v.code === venueCode);
}

// ========== 庫存相關功能 ==========

// 取得庫存狀態（支援場地參數）
function getInventory(venueCode) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // 如果有場地參數，讀取該場地的庫存
    let inventorySheetName = '庫存管理'; // 預設工作表
    
    if (venueCode) {
      const venueInfo = getVenueInfo(venueCode);
      if (venueInfo && venueInfo.inventorySheet) {
        inventorySheetName = venueInfo.inventorySheet;
      }
    }
    
    const sheet = ss.getSheetByName(inventorySheetName);
    if (!sheet) {
      return jsonResponse({
        ok: false,
        msg: '找不到庫存工作表: ' + inventorySheetName
      });
    }
    
    const data = sheet.getDataRange().getValues();
    const inventory = {};
    const categories = {}; // 配菜分類
    const mainItems = []; // 主餐列表
    
    // 從第2行開始（跳過標題）
    for (let i = 1; i < data.length; i++) {
      const [name, type, currentStock, initialStock, status, category, imageUrl] = data[i];
      
      if (!name) continue;
      
      inventory[name] = {
        type: type,
        stock: currentStock || 0,
        initialStock: initialStock || 0,
        available: (currentStock || 0) > 0 && status !== '缺貨',
        status: status
      };
      
      // 收集主餐
      if (type === '主餐' || type === 'main') {
        mainItems.push({
          name: name,
          imageUrl: imageUrl || ''
        });
      }
      
      // 收集配菜分類
      if ((type === '配菜' || type === 'side') && category) {
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push({
          name: name,
          imageUrl: imageUrl || ''
        });
      }
    }
    
    return jsonResponse({
      ok: true,
      inventory: inventory,
      categories: categories,
      mainItems: mainItems,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    Logger.log('取得庫存失敗: ' + err.message);
    return jsonResponse({
      ok: false,
      msg: '無法取得庫存: ' + err.message
    });
  }
}

// 檢查庫存是否足夠（支援場地）
function checkStock(items, venueCode) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // 取得場地對應的庫存工作表
  let inventorySheetName = '庫存管理';
  if (venueCode) {
    const venueInfo = getVenueInfo(venueCode);
    if (venueInfo && venueInfo.inventorySheet) {
      inventorySheetName = venueInfo.inventorySheet;
    }
  }
  
  const sheet = ss.getSheetByName(inventorySheetName);
  if (!sheet) {
    return {
      ok: false,
      msg: '找不到庫存工作表'
    };
  }
  
  const data = sheet.getDataRange().getValues();
  const inventory = {};
  
  for (let i = 1; i < data.length; i++) {
    inventory[data[i][0]] = {
      row: i + 1,
      stock: data[i][2] || 0
    };
  }
  
  // 檢查每個訂購項目
  for (const item of items) {
    const inv = inventory[item.name];
    if (!inv) continue;
    
    if (inv.stock < item.qty) {
      return {
        ok: false,
        msg: `【${item.name}】庫存不足（剩餘 ${inv.stock} 份，您訂購 ${item.qty} 份）`
      };
    }
  }
  
  return { ok: true };
}

// 扣減庫存（支援場地）
function deductStock(items, venueCode) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // 取得場地對應的庫存工作表
  let inventorySheetName = '庫存管理';
  if (venueCode) {
    const venueInfo = getVenueInfo(venueCode);
    if (venueInfo && venueInfo.inventorySheet) {
      inventorySheetName = venueInfo.inventorySheet;
    }
  }
  
  const sheet = ss.getSheetByName(inventorySheetName);
  const data = sheet.getDataRange().getValues();
  const inventory = {};
  
  for (let i = 1; i < data.length; i++) {
    inventory[data[i][0]] = {
      row: i + 1,
      stock: data[i][2] || 0
    };
  }
  
  // 扣減每個項目的庫存
  for (const item of items) {
    const inv = inventory[item.name];
    if (!inv) continue;
    
    const newStock = inv.stock - item.qty;
    sheet.getRange(inv.row, 3).setValue(newStock); // 更新當前庫存（C欄）
  }
}

// ========== 訂單相關功能 ==========

function saveOrder(params, venueCode) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // 取得場地對應的訂單工作表
  let orderSheetName = '訂單記錄';
  let venueName = '';
  
  if (venueCode) {
    const venueInfo = getVenueInfo(venueCode);
    if (venueInfo) {
      if (venueInfo.orderSheet) {
        orderSheetName = venueInfo.orderSheet;
      }
      venueName = venueInfo.name;
    }
  }
  
  const sheet = ss.getSheetByName(orderSheetName);
  if (!sheet) {
    throw new Error('找不到訂單工作表: ' + orderSheetName);
  }
  
  // 生成訂單編號
  const orderNo = generateOrderNo(sheet);
  
  // 新增訂單到工作表
  sheet.appendRow([
    new Date(),           // 訂單時間
    orderNo,              // 訂單編號
    params.name,          // 姓名
    params.phone,         // 電話
    venueCode,            // 場地代碼
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
function generateOrderNo(sheet) {
  const now = new Date();
  const datePrefix = Utilities.formatDate(now, 'Asia/Taipei', 'MMdd');
  
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
    return true;
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
    
    // 取餐方式選項
    const methodOptions = (config['取餐方式'] || '現場自取,託人代取').split(',').map(s => s.trim());
    
    // 場地選項
    const venues = getVenueList();
    
    return jsonResponse({
      ok: true,
      config: config,
      timeOptions: {
        hours: hourOptions,
        minutes: minuteOptions
      },
      methodOptions: methodOptions,
      venueOptions: venues // 新增：場地列表
    });
  } catch (err) {
    Logger.log('取得設定失敗: ' + err.message);
    return jsonResponse({
      ok: false,
      msg: '無法取得設定: ' + err.message
    });
  }
}

// ========== 工具函數 ==========

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

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

// ========== 管理功能 ==========

// 重置特定場地的庫存
function resetVenueStock(venueCode) {
  const venueInfo = getVenueInfo(venueCode);
  if (!venueInfo) {
    Logger.log('找不到場地: ' + venueCode);
    return;
  }
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(venueInfo.inventorySheet);
  if (!sheet) {
    Logger.log('找不到庫存工作表: ' + venueInfo.inventorySheet);
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const initialStock = data[i][3]; // D欄：初始庫存
    sheet.getRange(i + 1, 3).setValue(initialStock); // C欄：當前庫存
  }
  
  Logger.log(`${venueInfo.name} 庫存已重置`);
}

// 重置所有場地的庫存
function resetAllVenuesStock() {
  const venues = getVenueList();
  for (const venue of venues) {
    resetVenueStock(venue.code);
  }
  Logger.log('所有場地庫存已重置');
}

