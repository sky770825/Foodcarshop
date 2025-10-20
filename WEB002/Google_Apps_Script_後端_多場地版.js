// ============================================
// 六蒜包·餐車訂購表單 - Google Apps Script 後端
// 💯 多場地完整版本 - 每個場地獨立庫存和訂單
// 🆕 支援修改訂單、統計管理
// ============================================

const SHEET_ID = '1gf21nUj_4HTLK0zVgAb2CsHbRxcphQFdoe2LpJydjGg';
const VENUE_SHEET = '場地清單';
const CONFIG_SHEET = '系統設定';

// 🗺️ 場地代號與工作表 GID 的映射
const VENUE_GID_MAP = {
  'venue_a': { inventory: '1310218309', order: '839188314' },
  'venue_b': { inventory: '1817300773', order: '770659658' },
  'venue_c': { inventory: '927975724', order: '2090345169' },
  'venue_d': { inventory: '1587321409', order: '176378257' },
  'venue_e': { inventory: '1533285254', order: '1391460211' }
};

// ========== 自訂選單 ==========

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('📊 統計管理')
    .addItem('🔄 更新統計資料', 'updateStatistics')
    .addSeparator()
    .addItem('⏰ 設置每日自動更新', 'setupDailyStatistics')
    .addItem('🗑️ 取消自動更新', 'removeDailyStatistics')
    .addSeparator()
    .addItem('📈 重新創建統計報表', 'createStatisticsSheet')
    .addToUi();
  
  ui.createMenu('📦 庫存管理')
    .addItem('🔄 一鍵重置所有場地庫存', 'resetAllVenuesStock')
    .addSeparator()
    .addItem('➕ 補充庫存...', 'addStockPrompt')
    .addItem('➖ 減少庫存...', 'reduceStockPrompt')
    .addSeparator()
    .addItem('🆕 新增價格與優惠欄位', 'addNewColumnsToAllVenues')
    .addItem('🎁 新增組合優惠欄位 (O栏)', 'addComboGroupColumn')
    .addToUi();
  
  ui.createMenu('🏪 場地管理')
    .addItem('🔄 同步場地工作表名稱', 'syncVenueSheetNames')
    .addSeparator()
    .addItem('⚙️ 啟用自動同步', 'enableAutoSync')
    .addItem('🔕 停用自動同步', 'disableAutoSync')
    .addToUi();
}

function removeDailyStatistics() {
  const triggers = ScriptApp.getProjectTriggers();
  let removedCount = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateStatistics') {
      ScriptApp.deleteTrigger(trigger);
      removedCount++;
    }
  });
  
  if (removedCount > 0) {
    SpreadsheetApp.getUi().alert('✅ 已取消自動更新');
  } else {
    SpreadsheetApp.getUi().alert('ℹ️ 沒有自動更新');
  }
}

// ========== 阶梯价格处理 ==========

/**
 * 📊 解析價格規則字串（支援自訂標籤）
 * 格式1: "1:90,2:170,3:250"
 * 格式2: "1颗$90、2颗$170、3颗$250"
 * 格式3: "6入袋裝:100,12入盒裝:200" ← 🆕 自訂標籤
 * @param {string} ruleString - 價格規則字串
 * @return {Array} 價格階梯數組 [{qty: 1, price: 90, label: '1個'}]
 */
function parsePriceRules(ruleString) {
  try {
    if (!ruleString || ruleString.toString().trim() === '') {
      return [];
    }
    
    const str = ruleString.toString().trim();
    const rules = [];
    
    // 分割規則（支持逗號、頓號、中文頓號）
    const parts = str.split(/[,，、]/);
    
    parts.forEach((part, index) => {
      part = part.trim();
      if (!part) return;
      
      // 🆕 格式1：自訂標籤格式（6入袋裝:100）
      const customMatch = part.match(/^(.+?)[:：]\s*(\d+)$/);
      if (customMatch) {
        const label = customMatch[1].trim();
        const price = parseInt(customMatch[2]);
        
        // 如果標籤不是純數字，就是自訂標籤
        if (!/^\d+$/.test(label) && price > 0) {
          // 🔧 自訂標籤的 qty 統一為 1（代表1個銷售單位，例如1袋、1盒）
          // 標籤中的"6入"、"12入"只是說明包裝內容，不是購買數量
          rules.push({ 
            qty: 1,          // 🔧 統一為 1（1個銷售單位）
            price: price,
            label: label,    // 🆕 自訂標籤（例如：6入袋裝、12入盒裝）
            isCustomLabel: true
          });
          return;
        }
      }
      
      // 格式2：數字:價格 或 數字顆/條/份$價格
      const match = part.match(/(\d+)\s*(?:[:：颗條条份个個盒袋入]\s*\$?|[:：]\s*)\s*(\d+)/);
      
      if (match) {
        const qty = parseInt(match[1]);
        const price = parseInt(match[2]);
        
        if (qty > 0 && price > 0) {
          rules.push({ 
            qty: qty, 
            price: price,
            label: `${qty}個`,  // 預設標籤
            isCustomLabel: false
          });
        }
      }
    });
    
    // 按價格或索引排序
    rules.sort((a, b) => {
      if (a.isCustomLabel && b.isCustomLabel) {
        return a.price - b.price;  // 自訂標籤按價格排序
      }
      return a.qty - b.qty;  // 一般規則按數量排序
    });
    
    return rules;
    
  } catch (err) {
    Logger.log('解析價格規則失敗: ' + err);
    return [];
  }
}

/**
 * 🧮 根據購買數量計算最優價格（動態規劃版本）
 * @param {number} quantity - 購買數量
 * @param {number} basePrice - 基礎單價
 * @param {Array} priceRules - 價格階梯規則
 * @return {number} 最優價格
 */
function calculateOptimalPrice(quantity, basePrice, priceRules) {
  if (quantity <= 0) return 0;
  
  // 如果沒有階梯價格，使用基礎單價
  if (!priceRules || priceRules.length === 0) {
    return quantity * basePrice;
  }
  
  // 🎯 使用動態規劃找最優解
  const dp = new Array(quantity + 1).fill(Infinity);
  dp[0] = 0;
  
  // 對於每個數量，嘗試所有可能的階梯規則
  for (let i = 1; i <= quantity; i++) {
    // 方案1：買單個（用基礎單價）
    dp[i] = dp[i - 1] + basePrice;
    
    // 方案2-N：使用各種階梯規則
    for (const rule of priceRules) {
      if (i >= rule.qty) {
        // 如果當前數量足夠使用這個階梯
        const priceWithRule = dp[i - rule.qty] + rule.price;
        if (priceWithRule < dp[i]) {
          dp[i] = priceWithRule;
        }
      }
    }
  }
  
  return dp[quantity];
}

// ========== 新增欄位功能 ==========

/**
 * 🆕 為所有場地的庫存工作表新增價格與優惠欄位
 */
function addNewColumnsToAllVenues() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const venueSheet = ss.getSheetByName(VENUE_SHEET);
    
    if (!venueSheet) {
      SpreadsheetApp.getUi().alert('❌ 找不到場地清單工作表');
      return;
    }
    
    const venueData = venueSheet.getDataRange().getValues();
    let updateCount = 0;
    const updateLog = [];
    
    // 從第2行開始（跳過標題）
    for (let i = 1; i < venueData.length; i++) {
      const code = venueData[i][0]; // A欄 - 場地代號
      const name = venueData[i][1]; // B欄 - 場地名稱
      
      if (!code || !name) continue;
      
      // 獲取該場地的庫存工作表名稱
      const sheetName = getVenueSheetName(code, 'inventory');
      
      if (!sheetName) continue;
      
      const sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        updateLog.push(`⚠️ 找不到工作表：${sheetName}`);
        continue;
      }
      
      // 檢查第1行（標題行）
      const headerRow = sheet.getRange(1, 1, 1, 14).getValues()[0];
      
      // 新增欄位標題（如果還沒有）
      const newHeaders = {
        7: '圖片網址',    // G 欄（可能已有）
        8: '原價',        // H 欄
        9: '優惠價',      // I 欄
        10: '優惠標籤',   // J 欄
        11: '排序',       // K 欄
        12: '推薦標籤',   // L 欄
        13: '商品描述',   // M 欄
        14: '每日限量'    // N 欄
      };
      
      let updated = false;
      
      // 逐一檢查並添加缺少的標題
      for (const [colIndex, headerText] of Object.entries(newHeaders)) {
        const col = parseInt(colIndex);
        if (!headerRow[col - 1] || headerRow[col - 1].toString().trim() === '') {
          sheet.getRange(1, col).setValue(headerText);
          updated = true;
        }
      }
      
      if (updated) {
        updateCount++;
        updateLog.push(`✅ ${sheetName}`);
      }
    }
    
    if (updateCount > 0) {
      const message = `🎉 已為 ${updateCount} 個場地新增欄位：\n\n${updateLog.join('\n')}\n\n新增的欄位：\nH=原價, I=優惠價, J=優惠標籤, K=排序, L=推薦標籤, M=商品描述, N=每日限量`;
      SpreadsheetApp.getUi().alert(message);
      Logger.log(message);
    } else {
      SpreadsheetApp.getUi().alert('✅ 所有場地的欄位都已存在，無需新增');
    }
    
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ 新增欄位失敗：' + err.message);
    Logger.log('新增欄位失敗: ' + err);
  }
}

// ========== 場地工作表同步 ==========

/**
 * 🔄 同步場地工作表名稱（使用 GID 精準定位）
 * 當場地清單中的場地名稱改變時，自動更新對應的庫存和訂單工作表名稱
 */
function syncVenueSheetNames() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const venueSheet = ss.getSheetByName(VENUE_SHEET);
    
    if (!venueSheet) {
      SpreadsheetApp.getUi().alert('❌ 找不到場地清單工作表');
      return;
    }
    
    const data = venueSheet.getDataRange().getValues();
    let syncCount = 0;
    const syncLog = [];
    
    // 從第2行開始（跳過標題）
    for (let i = 1; i < data.length; i++) {
      const rowIndex = i + 1; // 實際行號（因為陣列從0開始）
      const code = data[i][0]; // A欄 - 場地代號
      const name = data[i][1]; // B欄 - 場地名稱
      
      if (!code || !name) continue;
      
      // 檢查場地代號是否在映射表中
      if (!VENUE_GID_MAP[code]) {
        Logger.log(`⚠️ 未知的場地代號：${code}`);
        continue;
      }
      
      const gids = VENUE_GID_MAP[code];
      
      // 預期的工作表名稱
      const expectedInventoryName = `${name}_庫存管理`;
      const expectedOrderName = `${name}_訂單記錄`;
      
      // 使用 GID 精準定位並更新庫存工作表
      const inventoryUpdated = updateSheetNameByGID(ss, gids.inventory, expectedInventoryName);
      if (inventoryUpdated) {
        syncCount++;
        syncLog.push(`✅ ${inventoryUpdated.old} → ${inventoryUpdated.new}`);
        
        // 更新場地清單中的超連結（D欄）
        updateHyperlinkInVenueSheet(venueSheet, rowIndex, 4, gids.inventory, expectedInventoryName);
      }
      
      // 使用 GID 精準定位並更新訂單工作表
      const orderUpdated = updateSheetNameByGID(ss, gids.order, expectedOrderName);
      if (orderUpdated) {
        syncCount++;
        syncLog.push(`✅ ${orderUpdated.old} → ${orderUpdated.new}`);
        
        // 更新場地清單中的超連結（E欄）
        updateHyperlinkInVenueSheet(venueSheet, rowIndex, 5, gids.order, expectedOrderName);
      }
    }
    
    if (syncCount > 0) {
      const message = `🎉 已同步 ${syncCount} 個工作表名稱：\n\n${syncLog.join('\n')}`;
      SpreadsheetApp.getUi().alert(message);
      Logger.log(message);
    } else {
      SpreadsheetApp.getUi().alert('✅ 所有工作表名稱已是最新，無需同步');
    }
    
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ 同步失敗：' + err.message);
    Logger.log('同步場地工作表名稱失敗: ' + err);
  }
}

/**
 * 🎯 使用 GID 精準定位並更新工作表名稱
 * @param {Spreadsheet} ss - 試算表物件
 * @param {string} gid - 工作表的 GID
 * @param {string} newName - 新的工作表名稱
 * @return {object|null} 如果有更新，返回 {old, new}，否則返回 null
 */
function updateSheetNameByGID(ss, gid, newName) {
  try {
    // 透過 GID 查找工作表
    const sheets = ss.getSheets();
    let targetSheet = null;
    
    for (const sheet of sheets) {
      if (sheet.getSheetId().toString() === gid) {
        targetSheet = sheet;
        break;
      }
    }
    
    if (!targetSheet) {
      Logger.log(`⚠️ 找不到 GID=${gid} 的工作表`);
      return null;
    }
    
    const oldName = targetSheet.getName();
    
    // 如果名稱已經正確，不需要更新
    if (oldName === newName) {
      return null;
    }
    
    // 重命名工作表
    targetSheet.setName(newName);
    Logger.log(`✅ 重命名成功：${oldName} → ${newName}`);
    
    return { old: oldName, new: newName };
    
  } catch (err) {
    Logger.log(`❌ 更新工作表名稱失敗 (GID=${gid}): ${err}`);
    return null;
  }
}

/**
 * 🔗 更新場地清單中的超連結顯示文字
 * @param {Sheet} venueSheet - 場地清單工作表
 * @param {number} row - 行號（從1開始）
 * @param {number} col - 欄號（從1開始）
 * @param {string} gid - 工作表的 GID
 * @param {string} newText - 新的顯示文字
 */
function updateHyperlinkInVenueSheet(venueSheet, row, col, gid, newText) {
  try {
    const cell = venueSheet.getRange(row, col);
    const formula = `=HYPERLINK("#gid=${gid}", "${newText}")`;
    cell.setFormula(formula);
    Logger.log(`✅ 更新超連結：第${row}行第${col}欄 → ${newText}`);
  } catch (err) {
    Logger.log(`❌ 更新超連結失敗 (行=${row}, 欄=${col}): ${err}`);
  }
}

/**
 * ⚙️ 啟用自動同步（當場地清單被編輯時自動執行）
 */
function enableAutoSync() {
  try {
    // 先移除舊的觸發器
    disableAutoSync();
    
    // 創建新的 onEdit 觸發器
    const ss = SpreadsheetApp.openById(SHEET_ID);
    ScriptApp.newTrigger('onVenueEdit')
      .forSpreadsheet(ss)
      .onEdit()
      .create();
    
    SpreadsheetApp.getUi().alert('✅ 已啟用自動同步\n\n當您編輯「場地清單」工作表時，系統會自動同步工作表名稱');
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ 啟用失敗：' + err.message);
  }
}

/**
 * 🔕 停用自動同步
 */
function disableAutoSync() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removedCount = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onVenueEdit') {
        ScriptApp.deleteTrigger(trigger);
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      SpreadsheetApp.getUi().alert('✅ 已停用自動同步');
    } else {
      SpreadsheetApp.getUi().alert('ℹ️ 自動同步未啟用');
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ 停用失敗：' + err.message);
  }
}

/**
 * 📝 當場地清單被編輯時觸發（僅在啟用自動同步時）
 */
function onVenueEdit(e) {
  try {
    if (!e) return; // 沒有編輯事件
    
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    
    // 只有在編輯「場地清單」工作表的 B 欄（場地名稱）時才同步
    if (sheetName === VENUE_SHEET && e.range) {
      const col = e.range.getColumn();
      
      // B 欄 = 場地名稱
      if (col === 2) {
        Logger.log('檢測到場地名稱變更，準備同步...');
        
        // 延遲 1 秒執行，避免編輯過程中觸發
        Utilities.sleep(1000);
        syncVenueSheetNames();
      }
    }
  } catch (err) {
    Logger.log('自動同步觸發失敗: ' + err);
  }
}

// ========== API 端點 ==========

function doGet(e) {
  const action = e.parameter.action;
  const venue = e.parameter.venue;
  
  if (action === 'getInventory') {
    return getInventory(venue);
  } else if (action === 'getConfig') {
    return getConfig();
  } else if (action === 'getVenues') {
    return getVenues();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    msg: '未知的請求'
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = e.parameter;
    const venue = params.venue;
    
    // 驗證場地
    if (!venue) {
      return jsonResponse({
        ok: false,
        msg: '⚠️ 請選擇取餐場地'
      });
    }
    
    // 🆕 檢查是否為修改訂單
    const note = params.note || '';
    const editMatch = note.match(/\[修改訂單 (\d{4}-[A-Z]+-\d{3})\]/);
    
    if (editMatch) {
      const originalOrderNo = editMatch[1];
      Logger.log('🔄 檢測到修改訂單：' + originalOrderNo);
      
      const updateResult = updateExistingOrder(originalOrderNo, params, venue);
      
      if (updateResult.ok) {
        return jsonResponse({
          ok: true,
          orderNo: originalOrderNo,
          msg: '訂單已更新'
        });
      } else {
        Logger.log('⚠️ 找不到原訂單，當作新訂單處理');
      }
    }
    
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
    lock.waitLock(10000);
    
    try {
      // 檢查該場地的庫存
      const stockCheck = checkStock(items, venue);
      if (!stockCheck.ok) {
        return jsonResponse({
          ok: false,
          msg: stockCheck.msg
        });
      }
      
      // 扣減該場地的庫存
      deductStock(items, venue);
      
      // 儲存訂單到該場地的訂單表
      const orderNo = saveOrder(params, venue);
      
      return jsonResponse({
        ok: true,
        orderNo: orderNo,
        msg: '訂單成功'
      });
      
    } finally {
      lock.releaseLock();
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

function getVenues() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const venueSheet = ss.getSheetByName(VENUE_SHEET);
    
    if (!venueSheet) {
      return jsonResponse({
        ok: true,
        venues: [],
        msg: '未設置場地清單'
      });
    }
    
    const data = venueSheet.getDataRange().getValues();
    const venues = [];
    
    for (let i = 1; i < data.length; i++) {
      const [code, name, status] = data[i];
      if (code && name) {
        venues.push({
          code: code,
          name: name,
          status: status || '營業中'
        });
      }
    }
    
    return jsonResponse({
      ok: true,
      venues: venues
    });
    
  } catch (err) {
    return jsonResponse({
      ok: false,
      msg: '無法取得場地清單: ' + err.message
    });
  }
}

// 取得場地的工作表名稱
function getVenueSheetName(venue, type) {
  if (!venue) {
    return null;
  }
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const venueSheet = ss.getSheetByName(VENUE_SHEET);
  
  if (!venueSheet) {
    return null;
  }
  
  const data = venueSheet.getDataRange().getValues();
  let venueName = '';
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === venue) {
      venueName = data[i][1];
      break;
    }
  }
  
  if (!venueName) {
    return null;
  }
  
  return type === 'inventory' 
    ? `${venueName}_庫存管理` 
    : `${venueName}_訂單記錄`;
}

// ========== 庫存管理 ==========

function getInventory(venue) {
  try {
    if (!venue) {
      return jsonResponse({
        ok: false,
        msg: '請指定場地'
      });
    }
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheetName = getVenueSheetName(venue, 'inventory');
    
    if (!sheetName) {
      return jsonResponse({
        ok: false,
        msg: '無效的場地代碼'
      });
    }
    
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return jsonResponse({
        ok: false,
        msg: `找不到工作表：${sheetName}`
      });
    }
    
    const data = sheet.getDataRange().getValues();
    const inventory = {};
    const categories = {};
    const mainItems = [];
    
    // 從第2行開始（跳過標題）
    // 欄位：A=商品名稱, B=類型, C=當前庫存, D=初始庫存, E=狀態, F=分類, G=圖片網址, H=原價, I=優惠價, J=優惠標籤, K=排序, L=推薦標籤, M=價格描述說明, N=每日限量, O=組合優惠組ID
    for (let i = 1; i < data.length; i++) {
      const [name, type, currentStock, initialStock, status, category, imageUrl, originalPrice, salePrice, saleLabel, sortOrder, recommendTag, priceDescription, dailyLimit, comboGroupId] = data[i];
      
      if (!name) continue;
      
      // 📸 直接使用工作表 G 栏的图片网址
      const finalImageUrl = imageUrl || '';
      
      // 💰 阶梯价格处理（从 I 栏读取价格规则）
      const priceRules = parsePriceRules(salePrice); // I 栏现在用来存价格规则
      const basePrice = originalPrice || 0;  // H 栏为基础单价
      const hasDiscount = priceRules.length > 0;  // 有阶梯价格就算有优惠
      
      inventory[name] = {
        type: type,
        stock: currentStock || 0,
        initialStock: initialStock || 0,
        available: (currentStock || 0) > 0,
        status: status || '正常',
        category: category || '其他',
        imageUrl: finalImageUrl,
        basePrice: basePrice,                  // 🆕 基础单价（H 栏）
        priceRules: priceRules,                // 🆕 阶梯价格规则（I 栏解析后）
        priceRuleText: salePrice || '',        // 🆕 原始价格规则文字（I 栏）
        saleLabel: saleLabel || '',            // 🆕 優惠標籤
        hasDiscount: hasDiscount,              // 🆕 是否有優惠
        sortOrder: sortOrder || 999,           // 🆕 排序順序（預設最後）
        recommendTag: recommendTag || '',      // 🆕 推薦標籤
        priceDescription: priceDescription || '',  // 🆕 價格描述說明（M 栏）
        dailyLimit: dailyLimit || 0,           // 🆕 每日限量
        comboGroupId: comboGroupId || ''       // 🆕 組合優惠組ID（O 栏）
      };
      
      // 配菜分類
      if (type === 'side') {
        const cat = category || '其他';
        if (!categories[cat]) {
          categories[cat] = [];
        }
        categories[cat].push({
          name: name,
          stock: currentStock || 0,
          available: (currentStock || 0) > 0,
          basePrice: basePrice,
          priceRules: priceRules,
          priceRuleText: salePrice || '',
          hasDiscount: hasDiscount
        });
      }
      
      // 主餐列表
      if (type === 'main') {
        mainItems.push({
          name: name,
          stock: currentStock || 0,
          available: (currentStock || 0) > 0,
          imageUrl: finalImageUrl || 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop&q=80',
          basePrice: basePrice,                  // 基础单价
          priceRules: priceRules,                // 阶梯价格规则
          priceRuleText: salePrice || '',        // 价格规则文字
          saleLabel: saleLabel || '',
          hasDiscount: hasDiscount,
          sortOrder: sortOrder || 999,           // 🆕 排序順序
          recommendTag: recommendTag || '',      // 🆕 推薦標籤
          priceDescription: priceDescription || '',  // 🆕 價格描述說明（M 栏）
          dailyLimit: dailyLimit || 0,           // 🆕 每日限量
          comboGroupId: comboGroupId || ''       // 🆕 組合優惠組ID（O 栏）
        });
      }
    }
    
    // 🆕 生成 products 列表（包含價格和優惠資訊）
    const products = mainItems
      .map(item => ({
        name: item.name,
        img: item.imageUrl,
        imageUrl: item.imageUrl,
        basePrice: item.basePrice,               // 基础单价
        priceRules: item.priceRules,             // 阶梯价格规则 [{qty: 1, price: 90}]
        priceRuleText: item.priceRuleText,       // 价格规则文字（显示用）
        saleLabel: item.saleLabel,               // 優惠標籤
        hasDiscount: item.hasDiscount,           // 是否有優惠
        sortOrder: item.sortOrder,               // 🆕 排序順序
        recommendTag: item.recommendTag,         // 🆕 推薦標籤
        priceDescription: item.priceDescription, // 🆕 價格描述說明（M 栏）
        dailyLimit: item.dailyLimit,             // 🆕 每日限量
        comboGroupId: item.comboGroupId,         // 🆕 組合優惠組ID（O 栏）
        stock: item.stock,
        available: item.available
      }))
      .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999)); // 🆕 按排序順序排列
    
    return jsonResponse({
      ok: true,
      inventory: inventory,
      categories: categories,
      mainItems: mainItems,
      products: products, // 🆕 添加 products 字段供前端使用
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    return jsonResponse({
      ok: false,
      msg: '無法取得庫存: ' + err.message
    });
  }
}

function checkStock(items, venue) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = getVenueSheetName(venue, 'inventory');
  
  if (!sheetName) {
    return {
      ok: false,
      msg: '無效的場地代碼'
    };
  }
  
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return {
      ok: false,
      msg: `找不到庫存工作表：${sheetName}`
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

function deductStock(items, venue) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = getVenueSheetName(venue, 'inventory');
  
  if (!sheetName) {
    Logger.log(`❌ 無效的場地代碼：${venue}`);
    return;
  }
  
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`❌ 找不到庫存工作表：${sheetName}`);
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const inventory = {};
  
  for (let i = 1; i < data.length; i++) {
    inventory[data[i][0]] = {
      row: i + 1,
      stock: data[i][2] || 0
    };
  }
  
  for (const item of items) {
    const inv = inventory[item.name];
    if (!inv) continue;
    
    const newStock = inv.stock - item.qty;
    sheet.getRange(inv.row, 3).setValue(newStock);
    Logger.log(`✅ ${item.name}: ${inv.stock} → ${newStock}`);
  }
}

// ========== 訂單管理 ==========

function saveOrder(params, venue) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = getVenueSheetName(venue, 'order');
  
  if (!sheetName) {
    throw new Error('無效的場地代碼');
  }
  
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`找不到訂單工作表：${sheetName}`);
  }
  
  const orderNo = generateOrderNo(venue);
  
  // 取得場地名稱
  let venueName = '';
  const venueSheet = ss.getSheetByName(VENUE_SHEET);
  if (venueSheet) {
    const venueData = venueSheet.getDataRange().getValues();
    for (let i = 1; i < venueData.length; i++) {
      if (venueData[i][0] === venue) {
        venueName = venueData[i][1];
        break;
      }
    }
  }
  
  // 訂單記錄（16欄）
  // A=訂單時間, B=訂單編號, C=姓名&群組ID, D=手機號碼, E=取餐方式, F=取餐時間,
  // G=商品詳情, H=總額, I=口味選項, J=去骨選項, K=備註, L=商品交接進度,
  // M=訂單狀況, N=來源, O=訂單摘要, P=場地名稱
  sheet.appendRow([
    new Date(),                        // A: 訂單時間
    orderNo,                           // B: 訂單編號
    params.name,                       // C: 姓名&群組ID
    params.phone,                      // D: 手機號碼
    params.method,                     // E: 取餐方式
    params.eta,                        // F: 取餐時間
    params.itemsDetail,                // G: 商品詳情
    params.total,                      // H: 總額
    params.taste || '',                // I: 口味選項
    params.cut || '',                  // J: 去骨選項
    params.note || '',                 // K: 備註
    '',                                // L: 商品交接進度
    '待處理',                          // M: 訂單狀況
    params.source || 'web',            // N: 來源
    params.orderSummary || '',         // O: 訂單摘要
    venueName                          // P: 場地名稱
  ]);
  
  // 🎨 美化訂單格式（設置顏色和樣式）
  const lastRow = sheet.getLastRow();
  
  // B 栏：訂單編號（粗體、深藍色）
  sheet.getRange(lastRow, 2)
    .setFontWeight('bold')
    .setFontColor('#1e40af')
    .setFontSize(11);
  
  // C 栏：姓名（粗體）
  sheet.getRange(lastRow, 3)
    .setFontWeight('bold')
    .setFontSize(10);
  
  // G 栏：商品詳情（啟用文字換行、淡藍色背景）
  sheet.getRange(lastRow, 7)
    .setWrap(true)
    .setVerticalAlignment('top')
    .setFontSize(10)
    .setBackground('#eff6ff');
  
  // H 栏：總額（粗體、橙色、大字、黃色背景）
  sheet.getRange(lastRow, 8)
    .setFontWeight('bold')
    .setFontColor('#d97706')
    .setFontSize(13)
    .setBackground('#fffbeb')
    .setHorizontalAlignment('center');
  
  // M 栏：訂單狀況（粗體、黃色背景）
  sheet.getRange(lastRow, 13)
    .setFontWeight('bold')
    .setBackground('#fef3c7')
    .setFontColor('#92400e')
    .setHorizontalAlignment('center');
  
  // O 栏：訂單摘要（使用富文本格式，突出金額）
  try {
    const summaryText = params.orderSummary || '';
    const summaryCell = sheet.getRange(lastRow, 15);
    
    // 🎨 創建富文本，將金額部分標記為橙色粗體
    const richTextBuilder = SpreadsheetApp.newRichTextValue().setText(summaryText);
    
    // 查找所有金額（例如：1580元、$1580、金額：1580）
    const amountMatches = [...summaryText.matchAll(/(\d+)元|金額[：:]\s*(\d+)/g)];
    
    amountMatches.forEach(match => {
      const startIndex = match.index;
      const matchText = match[0];
      const numberMatch = matchText.match(/\d+/);
      
      if (numberMatch) {
        const numberStart = startIndex + matchText.indexOf(numberMatch[0]);
        const numberEnd = numberStart + numberMatch[0].length;
        
        // 設置金額數字為橙色粗體
        richTextBuilder.setTextStyle(
          numberStart,
          numberEnd,
          SpreadsheetApp.newTextStyle()
            .setFontSize(11)
            .setForegroundColor('#d97706')
            .setBold(true)
            .build()
        );
      }
    });
    
    summaryCell
      .setRichTextValue(richTextBuilder.build())
      .setWrap(true)
      .setVerticalAlignment('top')
      .setBackground('#f9fafb');
      
  } catch (err) {
    // 如果富文本設置失敗，使用普通格式
    Logger.log('⚠️ 富文本設置失敗，使用普通格式:', err);
    sheet.getRange(lastRow, 15)
      .setWrap(true)
      .setVerticalAlignment('top')
      .setBackground('#f9fafb')
      .setFontSize(9);
  }
  
  Logger.log(`✅ 訂單已儲存：${orderNo} → ${sheetName}`);
  
  return orderNo;
}

function generateOrderNo(venue) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = getVenueSheetName(venue, 'order');
  
  if (!sheetName) {
    const now = new Date();
    const datePrefix = Utilities.formatDate(now, 'Asia/Taipei', 'MMdd');
    return `${datePrefix}-001`;
  }
  
  const sheet = ss.getSheetByName(sheetName);
  const now = new Date();
  const datePrefix = Utilities.formatDate(now, 'Asia/Taipei', 'MMdd');
  
  // 取得場地代碼（例如：venue_A → A）
  let venueCode = '';
  if (venue) {
    venueCode = venue.replace('venue_', '').toUpperCase();
  }
  
  let todayCount = 0;
  
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const orderNo = data[i][1];
      if (orderNo && orderNo.toString().startsWith(datePrefix)) {
        todayCount++;
      }
    }
  }
  
  const sequence = (todayCount + 1).toString().padStart(3, '0');
  
  // 訂單編號格式：MMdd-場地代碼-序號
  // 例如：1019-A-001, 1019-B-002
  if (venueCode) {
    return `${datePrefix}-${venueCode}-${sequence}`;
  } else {
    return `${datePrefix}-${sequence}`;
  }
}

// 🆕 修改訂單功能
function updateExistingOrder(orderNo, params, venue) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheetName = getVenueSheetName(venue, 'order');
    
    if (!sheetName) {
      return { ok: false, msg: '無效的場地代碼' };
    }
    
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return { ok: false, msg: '找不到訂單工作表' };
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === orderNo) {
        const row = i + 1;
        Logger.log('✅ 找到訂單：第 ' + row + ' 行');
        
        // 取得場地名稱
        let venueName = '';
        const venueSheet = ss.getSheetByName(VENUE_SHEET);
        if (venueSheet) {
          const venueData = venueSheet.getDataRange().getValues();
          for (let j = 1; j < venueData.length; j++) {
            if (venueData[j][0] === venue) {
              venueName = venueData[j][1];
              break;
            }
          }
        }
        
        // 移除備註中的修改標記
        const cleanNote = (params.note || '').replace(/\[修改訂單 \d{4}-[A-Z]+-\d{3}\]\s*/, '');
        
        const updatedRow = [
          new Date(),                    // A: 訂單時間
          orderNo,                       // B: 訂單編號（保持不變）
          params.name,                   // C: 姓名&群組ID
          params.phone,                  // D: 手機號碼
          params.method,                 // E: 取餐方式
          params.eta,                    // F: 取餐時間
          params.itemsDetail,            // G: 商品詳情
          params.total,                  // H: 總額
          params.taste || '',            // I: 口味選項
          params.cut || '',              // J: 去骨選項
          cleanNote,                     // K: 備註
          data[i][11] || '',             // L: 商品交接進度（保持原狀）
          '已修改',                      // M: 訂單狀況
          params.source || 'web',        // N: 來源
          params.orderSummary || '',     // O: 訂單摘要
          venueName                      // P: 場地名稱
        ];
        
        sheet.getRange(row, 1, 1, updatedRow.length).setValues([updatedRow]);
        
        // 🎨 美化訂單格式（與新訂單相同）
        // B 栏：訂單編號
        sheet.getRange(row, 2).setFontWeight('bold').setFontColor('#1e40af').setFontSize(11);
        
        // C 栏：姓名
        sheet.getRange(row, 3).setFontWeight('bold').setFontSize(10);
        
        // G 栏：商品詳情
        sheet.getRange(row, 7).setWrap(true).setVerticalAlignment('top').setFontSize(10).setBackground('#eff6ff');
        
        // H 栏：總額
        sheet.getRange(row, 8).setFontWeight('bold').setFontColor('#d97706').setFontSize(13).setBackground('#fffbeb').setHorizontalAlignment('center');
        
        // M 栏：訂單狀況（已修改 - 橙色背景）
        sheet.getRange(row, 13).setFontWeight('bold').setBackground('#fed7aa').setFontColor('#92400e').setHorizontalAlignment('center');
        
        // O 栏：訂單摘要（富文本）
        try {
          const summaryText = params.orderSummary || '';
          const summaryCell = sheet.getRange(row, 15);
          const richTextBuilder = SpreadsheetApp.newRichTextValue().setText(summaryText);
          const amountMatches = [...summaryText.matchAll(/(\d+)元|金額[：:]\s*(\d+)/g)];
          
          amountMatches.forEach(match => {
            const startIndex = match.index;
            const matchText = match[0];
            const numberMatch = matchText.match(/\d+/);
            if (numberMatch) {
              const numberStart = startIndex + matchText.indexOf(numberMatch[0]);
              const numberEnd = numberStart + numberMatch[0].length;
              richTextBuilder.setTextStyle(numberStart, numberEnd,
                SpreadsheetApp.newTextStyle().setFontSize(11).setForegroundColor('#d97706').setBold(true).build()
              );
            }
          });
          
          summaryCell.setRichTextValue(richTextBuilder.build()).setWrap(true).setVerticalAlignment('top').setBackground('#f9fafb');
        } catch (err) {
          sheet.getRange(row, 15).setWrap(true).setVerticalAlignment('top').setBackground('#f9fafb').setFontSize(9);
        }
        
        Logger.log('✅ 訂單已更新：' + orderNo);
        
        return { ok: true, msg: '訂單已更新' };
      }
    }
    
    return { ok: false, msg: '找不到原訂單' };
    
  } catch (err) {
    Logger.log('❌ 錯誤：' + err.message);
    return { ok: false, msg: err.message };
  }
}

// ========== 系統設定 ==========

function checkBusinessStatus() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(CONFIG_SHEET);
    
    if (!sheet) {
      return true;
    }
    
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
    
    if (!sheet) {
      return jsonResponse({
        ok: false,
        msg: '找不到系統設定'
      });
    }
    
    const data = sheet.getDataRange().getValues();
    const config = {};
    
    for (let i = 1; i < data.length; i++) {
      config[data[i][0]] = data[i][1];
    }
    
    // 時間選項
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
    
    // 取餐方式
    const methodOptions = (config['取餐方式'] || '現場自取,託人代取').split(',').map(s => s.trim());
    
    // 🆕 最低消費金額
    const minOrderAmount = parseInt(config['最低消費金額']) || 0;
    
    // 場地選項
    const venueSheet = ss.getSheetByName(VENUE_SHEET);
    let venueOptions = [];
    
    if (venueSheet) {
      const venueData = venueSheet.getDataRange().getValues();
      for (let i = 1; i < venueData.length; i++) {
        const [code, name, status] = venueData[i];
        if (code && name) {
          venueOptions.push({
            code: code,
            name: name,
            status: status || '營業中'
          });
        }
      }
    }
    
    return jsonResponse({
      ok: true,
      config: config,
      timeOptions: {
        hours: hourOptions,
        minutes: minuteOptions
      },
      methodOptions: methodOptions,
      venueOptions: venueOptions,
      minOrderAmount: minOrderAmount  // 🆕 最低消費金額
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

function parseItems(itemsDetail) {
  const items = [];
  // 🔧 支援換行符或斜線分隔（兼容新舊版本）
  const parts = itemsDetail.split(/[\n\/]/).map(p => p.trim()).filter(p => p);
  
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

// ========== 庫存管理工具 ==========

function resetAllVenuesStock() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ui = SpreadsheetApp.getUi();
    
    const response = ui.alert(
      '⚠️ 確認重置庫存',
      '即將重置所有場地的庫存。\n\n確定要繼續嗎？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
    
    let processedSheets = 0;
    let processedItems = 0;
    
    const venueSheet = ss.getSheetByName(VENUE_SHEET);
    
    if (venueSheet) {
      const venueData = venueSheet.getDataRange().getValues();
      
      for (let i = 1; i < venueData.length; i++) {
        const [code, name, status] = venueData[i];
        if (!name) continue;
        
        const inventorySheetName = `${name}_庫存管理`;
        const inventorySheet = ss.getSheetByName(inventorySheetName);
        
        if (inventorySheet) {
          const data = inventorySheet.getDataRange().getValues();
          
          for (let j = 1; j < data.length; j++) {
            const initialStock = data[j][3]; // D欄：初始庫存
            if (initialStock !== undefined && initialStock !== '') {
              inventorySheet.getRange(j + 1, 3).setValue(initialStock); // C欄：當前庫存
              processedItems++;
            }
          }
          
          processedSheets++;
        }
      }
    }
    
    ui.alert(
      '✅ 庫存重置完成！',
      `已重置 ${processedSheets} 個場地，共 ${processedItems} 個商品。`,
      ui.ButtonSet.OK
    );
    
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ 重置失敗：' + err.message);
  }
}

function addStockPrompt() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('ℹ️ 補充庫存', '請直接在庫存管理工作表中修改 C 欄（當前庫存）。', ui.ButtonSet.OK);
}

function reduceStockPrompt() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('ℹ️ 減少庫存', '請直接在庫存管理工作表中修改 C 欄（當前庫存）。', ui.ButtonSet.OK);
}

// ========== 統計功能（預留） ==========

function updateStatistics() {
  SpreadsheetApp.getUi().alert('ℹ️ 統計功能', '統計功能開發中...', SpreadsheetApp.getUi().ButtonSet.OK);
}

function setupDailyStatistics() {
  SpreadsheetApp.getUi().alert('ℹ️ 自動更新', '自動更新功能開發中...', SpreadsheetApp.getUi().ButtonSet.OK);
}

function createStatisticsSheet() {
  SpreadsheetApp.getUi().alert('ℹ️ 統計報表', '統計報表功能開發中...', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ════════════════════════════════════════
// 📝 使用說明
// ════════════════════════════════════════
/*

💯 多場地完整版本！

工作表結構：
1. 場地清單（必須）
   - A欄：場地代碼（例如：venue_A）
   - B欄：場地名稱（例如：中山店）
   - C欄：狀態（營業中/暫停）

2. 各場地的庫存管理（動態建立）
   - 工作表名稱：{場地名稱}_庫存管理
   - 例如：中山店_庫存管理
   - 欄位：A=商品名稱, B=類型(main/side), C=當前庫存, 
          D=初始庫存, E=狀態, F=分類, G=圖片網址

3. 各場地的訂單記錄（動態建立）
   - 工作表名稱：{場地名稱}_訂單記錄
   - 例如：中山店_訂單記錄
   - 16個欄位（見上方 saveOrder 函數）

4. 系統設定
   - 取餐時間_開始：14
   - 取餐時間_結束：20
   - 取餐時間_間隔：5
   - 取餐方式：現場自取,託人代取
   - 暫停接單：否

功能特色：
✅ 每個場地獨立庫存
✅ 每個場地獨立訂單記錄
✅ 支援修改訂單（保留原編號）
✅ 一鍵重置所有場地庫存
✅ 自動場地代碼識別
✅ 訂單編號格式：MMdd-場地代碼-序號
✅ 組合優惠支援（O栏组合组ID）

*/

// ========== 🎁 自動新增組合優惠欄位 ==========

/**
 * 🎁 一鍵為所有場地庫存工作表新增 O 欄（組合優惠組ID）
 */
function addComboGroupColumn() {
  const ui = SpreadsheetApp.getUi();
  
  // 確認對話框
  const response = ui.alert(
    '🎁 新增組合優惠欄位',
    '將為所有場地的庫存工作表新增 O 欄（組合優惠組ID）\n\n' +
    '這個欄位用於設置可互相搭配的商品組合，例如：\n' +
    '• 六蒜包和丹麥手撕包可以合併計算優惠\n\n' +
    '是否繼續？',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    ui.alert('已取消操作');
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const venueSheet = ss.getSheetByName(VENUE_SHEET);
    
    if (!venueSheet) {
      ui.alert('❌ 找不到場地清單工作表');
      return;
    }
    
    const venueData = venueSheet.getDataRange().getValues();
    let successCount = 0;
    let skipCount = 0;
    const results = [];
    
    // 從第2行開始（跳過表頭）
    for (let i = 1; i < venueData.length; i++) {
      const venueCode = venueData[i][0];
      const venueName = venueData[i][1];
      
      if (!venueCode || !venueName) continue;
      
      const sheetName = `${venueName}_庫存管理`;
      const sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        results.push(`⏭️ 跳過：${sheetName}（工作表不存在）`);
        skipCount++;
        continue;
      }
      
      // 檢查 O 欄是否已有內容
      const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      if (headerRow.length >= 15 && headerRow[14]) {
        // O 欄（第15欄）已有表頭
        results.push(`⏭️ 跳過：${sheetName}（O 欄已存在：${headerRow[14]}）`);
        skipCount++;
        continue;
      }
      
      // 設置 O 欄表頭（第15欄，索引14）
      sheet.getRange(1, 15)
        .setValue('組合優惠組ID')
        .setFontWeight('bold')
        .setBackground('#fef3c7')
        .setFontColor('#92400e')
        .setHorizontalAlignment('center');
      
      // 調整欄寬
      sheet.setColumnWidth(15, 120);
      
      results.push(`✅ 成功：${sheetName}`);
      successCount++;
    }
    
    // 顯示結果
    const resultMessage = `
🎁 組合優惠欄位新增完成！

✅ 成功：${successCount} 個工作表
⏭️ 跳過：${skipCount} 個工作表

詳細結果：
${results.join('\n')}

下一步：
1. 在 O 欄填寫組合組ID（例如：GROUP_BREAD）
2. 相同組ID的商品可以合併計算優惠
3. 重新部署 Google Apps Script
4. 測試功能
    `;
    
    ui.alert(resultMessage);
    
  } catch (err) {
    ui.alert('❌ 錯誤：' + err.message);
  }
}

