// ============================================
// 客戶授權管理中心 - Google Apps Script
// ============================================

// 授權清單工作表名稱
const AUTH_SHEET = '授權清單';

// ========== API 端點 ==========

function doGet(e) {
  const action = e.parameter.action;
  const websiteId = e.parameter.websiteId;
  
  if (action === 'checkAuth') {
    return checkAuthorization(websiteId);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    msg: '未知的請求'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ========== 檢查授權 ==========

function checkAuthorization(websiteId) {
  try {
    if (!websiteId) {
      return jsonResponse({
        ok: false,
        authorized: false,
        msg: '缺少網站ID'
      });
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(AUTH_SHEET);
    
    if (!sheet) {
      return jsonResponse({
        ok: false,
        authorized: false,
        msg: '授權清單工作表不存在'
      });
    }
    
    // 讀取所有授權資料
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 找到欄位索引
    const idCol = headers.indexOf('網站ID');
    const nameCol = headers.indexOf('商家名稱');
    const expireCol = headers.indexOf('到期日期');
    const statusCol = headers.indexOf('狀態');
    
    if (idCol === -1) {
      return jsonResponse({
        ok: false,
        authorized: false,
        msg: '授權清單格式錯誤（缺少必要欄位）'
      });
    }
    
    // 找到「訂閱方案」欄位索引
    const planCol = headers.indexOf('訂閱方案');
    
    // 查找該網站ID
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      if (row[idCol] === websiteId) {
        const status = row[statusCol] || '';
        const expireDate = row[expireCol];
        const businessName = row[nameCol] || '';
        const plan = row[planCol] || ''; // 訂閱方案
        
        // 檢查狀態
        if (status !== '啟用') {
          return jsonResponse({
            ok: true,
            authorized: false,
            msg: '授權已停用',
            reason: 'disabled',
            businessName: businessName,
            plan: plan
          });
        }
        
        // 檢查到期日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let expireDateObj;
        if (expireDate instanceof Date) {
          expireDateObj = new Date(expireDate);
        } else {
          expireDateObj = new Date(expireDate);
        }
        expireDateObj.setHours(0, 0, 0, 0);
        
        if (expireDateObj < today) {
          return jsonResponse({
            ok: true,
            authorized: false,
            msg: '授權已到期',
            reason: 'expired',
            expireDate: formatDate(expireDateObj),
            businessName: businessName,
            plan: plan
          });
        }
        
        // 計算剩餘天數
        const daysLeft = Math.ceil((expireDateObj - today) / (1000 * 60 * 60 * 24));
        
        // 判斷警告天數（試用期3天，付費方案7天）
        const warningDays = (plan === '試用期') ? 3 : 7;
        
        // 授權有效
        return jsonResponse({
          ok: true,
          authorized: true,
          msg: '授權有效',
          businessName: businessName,
          plan: plan,
          expireDate: formatDate(expireDateObj),
          daysLeft: daysLeft,
          showWarning: daysLeft <= warningDays, // 試用期3天內、付費7天內顯示警告
          isTrial: plan === '試用期' // 是否為試用期
        });
      }
    }
    
    // 找不到該網站ID
    return jsonResponse({
      ok: true,
      authorized: false,
      msg: '網站ID不存在',
      reason: 'not_found'
    });
    
  } catch (err) {
    return jsonResponse({
      ok: false,
      authorized: false,
      msg: '檢查授權時發生錯誤: ' + err.toString()
    });
  }
}

// ========== 輔助函數 ==========

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ========== 測試函數 ==========

function testAuth() {
  const result = checkAuthorization('WEB001');
  const data = JSON.parse(result.getContent());
  Logger.log(data);
}

// ========== 自動檢查過期客戶（定時執行） ==========

function 自動檢查過期客戶() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(AUTH_SHEET);
  
  if (!sheet) {
    Logger.log('❌ 找不到授權清單工作表');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // 找到欄位索引
  const idCol = headers.indexOf('網站ID');
  const nameCol = headers.indexOf('商家名稱');
  const planCol = headers.indexOf('訂閱方案');
  const expireCol = headers.indexOf('到期日期');
  const statusCol = headers.indexOf('狀態');
  
  if (idCol === -1 || expireCol === -1 || statusCol === -1) {
    Logger.log('❌ 欄位格式錯誤');
    return;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let updatedCount = 0;
  let expiredList = [];
  
  // 檢查每個客戶
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const websiteId = row[idCol];
    const businessName = row[nameCol];
    const plan = row[planCol];
    const expireDate = row[expireCol];
    const currentStatus = row[statusCol];
    
    // 跳過空白行
    if (!websiteId) continue;
    
    // 只處理「啟用」狀態的客戶
    if (currentStatus !== '啟用') continue;
    
    // 處理到期日期
    let expireDateObj;
    if (expireDate instanceof Date) {
      expireDateObj = new Date(expireDate);
    } else {
      expireDateObj = new Date(expireDate);
    }
    expireDateObj.setHours(0, 0, 0, 0);
    
    // 檢查是否已過期
    if (expireDateObj < today) {
      // 更新狀態為「停用」
      sheet.getRange(i + 1, statusCol + 1).setValue('停用');
      
      updatedCount++;
      expiredList.push({
        id: websiteId,
        name: businessName,
        plan: plan,
        expireDate: formatDate(expireDateObj)
      });
      
      Logger.log(`✅ 已停用：${websiteId} - ${businessName} (${plan}, 到期: ${formatDate(expireDateObj)})`);
    }
  }
  
  // 記錄結果
  Logger.log('');
  Logger.log('========================================');
  Logger.log('🤖 自動檢查過期客戶完成');
  Logger.log('========================================');
  Logger.log(`⏰ 執行時間: ${new Date().toLocaleString('zh-TW')}`);
  Logger.log(`📊 檢查客戶數: ${data.length - 1}`);
  Logger.log(`🔒 已停用客戶: ${updatedCount}`);
  
  if (updatedCount > 0) {
    Logger.log('');
    Logger.log('過期客戶清單:');
    expiredList.forEach((client, index) => {
      Logger.log(`${index + 1}. ${client.id} - ${client.name}`);
      Logger.log(`   方案: ${client.plan}, 到期: ${client.expireDate}`);
    });
  }
  
  Logger.log('========================================');
  
  return {
    success: true,
    checked: data.length - 1,
    updated: updatedCount,
    expiredList: expiredList
  };
}

// ========== 設定自動執行（執行此函數來設定定時器） ==========

function 設定每日自動檢查() {
  // 刪除現有的定時觸發器（避免重複）
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === '自動檢查過期客戶') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 建立新的定時觸發器：每天凌晨 2 點執行
  ScriptApp.newTrigger('自動檢查過期客戶')
    .timeBased()
    .atHour(2)  // 凌晨 2 點
    .everyDays(1)  // 每天執行
    .create();
  
  Logger.log('✅ 已設定每日自動檢查');
  Logger.log('⏰ 執行時間：每天凌晨 2:00');
  Logger.log('📋 執行函數：自動檢查過期客戶');
  
  SpreadsheetApp.getUi().alert(
    '✅ 設定完成！',
    '已啟用每日自動檢查功能\n\n' +
    '⏰ 執行時間：每天凌晨 2:00\n' +
    '🔍 功能：自動將過期客戶改為「停用」\n\n' +
    '您可以隨時執行「自動檢查過期客戶」函數進行手動檢查。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ========== 取消自動執行 ==========

function 取消每日自動檢查() {
  const triggers = ScriptApp.getProjectTriggers();
  let deletedCount = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === '自動檢查過期客戶') {
      ScriptApp.deleteTrigger(trigger);
      deletedCount++;
    }
  });
  
  if (deletedCount > 0) {
    Logger.log(`✅ 已取消 ${deletedCount} 個定時觸發器`);
    SpreadsheetApp.getUi().alert(
      '✅ 已取消！',
      '每日自動檢查功能已停用。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    Logger.log('⚠️ 沒有找到定時觸發器');
    SpreadsheetApp.getUi().alert(
      '⚠️ 提示',
      '目前沒有啟用自動檢查功能。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// ========== 查看定時器狀態 ==========

function 查看自動檢查狀態() {
  const triggers = ScriptApp.getProjectTriggers();
  let autoCheckTrigger = null;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === '自動檢查過期客戶') {
      autoCheckTrigger = trigger;
    }
  });
  
  if (autoCheckTrigger) {
    const triggerSource = autoCheckTrigger.getTriggerSource();
    const eventType = autoCheckTrigger.getEventType();
    
    Logger.log('========================================');
    Logger.log('✅ 自動檢查功能：已啟用');
    Logger.log('========================================');
    Logger.log('⏰ 執行時間：每天凌晨 2:00');
    Logger.log('📋 執行函數：自動檢查過期客戶');
    Logger.log('🔄 觸發類型：時間驅動');
    Logger.log('========================================');
    
    SpreadsheetApp.getUi().alert(
      '✅ 自動檢查功能：已啟用',
      '⏰ 執行時間：每天凌晨 2:00\n' +
      '📋 執行函數：自動檢查過期客戶\n' +
      '🔄 觸發類型：時間驅動\n\n' +
      '系統會自動將過期客戶改為「停用」狀態。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    Logger.log('⚠️ 自動檢查功能：未啟用');
    
    SpreadsheetApp.getUi().alert(
      '⚠️ 自動檢查功能：未啟用',
      '請執行「設定每日自動檢查」函數來啟用自動化功能。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// ========== 自動建立所有工作表 ==========

function 建立所有工作表() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 建立「授權清單」工作表
  try {
    let sheet = ss.getSheetByName('授權清單');
    if (!sheet) {
      sheet = ss.insertSheet('授權清單');
    } else {
      sheet.clear(); // 清空現有資料
    }
    
    const authData = [
      ['網站ID', '商家名稱', '訂閱方案', '開通日期', '到期日期', '狀態', '月費', '聯絡人', '聯絡電話', '備註'],
      ['WEB001', '極品鹽水雞', '終身授權', '2025-01-01', '2099-12-31', '啟用', 0, '系統測試', '0900000000', '測試客戶'],
      ['WEB002', '範例商家A', '試用期', '2025-10-12', '2025-10-19', '啟用', 0, '王小明', '0912345678', '7天試用中'],
      ['WEB003', '範例商家B', '月繳', '2025-10-01', '2025-10-31', '啟用', 500, '李大華', '0923456789', '正式客戶'],
      ['WEB004', '範例商家C', '季繳', '2025-10-01', '2025-12-31', '啟用', 400, '張三', '0934567890', '3個月1200元'],
      ['WEB005', '範例商家D', '半年繳', '2025-10-01', '2026-03-31', '啟用', 400, '李四', '0945678901', '6個月2400元'],
      ['WEB006', '範例商家E', '年繳', '2025-10-01', '2026-09-30', '啟用', 375, '王五', '0956789012', '12個月4500元'],
      ['WEB007', '範例商家F', '試用期', '2025-10-01', '2025-10-01', '停用', 0, '趙六', '0967890123', '試用期結束未續費']
    ];
    
    sheet.getRange(1, 1, authData.length, authData[0].length).setValues(authData);
    
    // 標題列格式
    sheet.getRange(1, 1, 1, authData[0].length)
      .setBackground('#d97706')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    
    // 自動調整欄寬
    for (let i = 1; i <= authData[0].length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    Logger.log('✅ 授權清單工作表已建立');
  } catch (e) {
    Logger.log('❌ 建立授權清單失敗: ' + e);
  }
  
  // 2. 建立「方案價目表」工作表
  try {
    let sheet = ss.getSheetByName('方案價目表');
    if (!sheet) {
      sheet = ss.insertSheet('方案價目表');
    } else {
      sheet.clear();
    }
    
    const priceData = [
      ['方案名稱', '期限（天）', '原價', '優惠價', '平均月費', '說明'],
      ['試用期', 7, 0, 0, 0, '免費試用7天，功能完整'],
      ['月繳', 30, 500, 500, 500, '按月付費，隨時可停'],
      ['季繳', 90, 1500, 1200, 400, '3個月，省300元（8折）'],
      ['半年繳', 180, 3000, 2400, 400, '6個月，省600元（8折）'],
      ['年繳', 365, 6000, 4500, 375, '12個月，省1500元（75折）'],
      ['終身授權', 36500, 50000, 30000, 83, '一次付費，永久使用']
    ];
    
    sheet.getRange(1, 1, priceData.length, priceData[0].length).setValues(priceData);
    
    // 標題列格式
    sheet.getRange(1, 1, 1, priceData[0].length)
      .setBackground('#059669')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    
    // 金額欄位格式
    sheet.getRange(2, 3, priceData.length - 1, 3).setNumberFormat('NT$#,##0');
    
    // 自動調整欄寬
    for (let i = 1; i <= priceData[0].length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    Logger.log('✅ 方案價目表工作表已建立');
  } catch (e) {
    Logger.log('❌ 建立方案價目表失敗: ' + e);
  }
  
  // 3. 建立「續費記錄」工作表
  try {
    let sheet = ss.getSheetByName('續費記錄');
    if (!sheet) {
      sheet = ss.insertSheet('續費記錄');
    } else {
      sheet.clear();
    }
    
    const renewData = [
      ['續費日期', '網站ID', '商家名稱', '續費方案', '續費前到期日', '續費後到期日', '金額', '付款方式', '經手人', '備註'],
      ['2025-10-12', 'WEB002', '範例商家A', '試用期', '-', '2025-10-19', 0, '-', '系統', '首次開通（試用）'],
      ['2025-10-01', 'WEB003', '範例商家B', '月繳', '-', '2025-10-31', 500, '轉帳', '客服小王', '首次開通'],
      ['2025-10-01', 'WEB004', '範例商家C', '季繳', '-', '2025-12-31', 1200, '信用卡', '客服小王', '首次開通'],
      ['2025-10-01', 'WEB005', '範例商家D', '半年繳', '-', '2026-03-31', 2400, '轉帳', '客服小李', '首次開通'],
      ['2025-10-01', 'WEB006', '範例商家E', '年繳', '-', '2026-09-30', 4500, '信用卡', '客服小李', '首次開通']
    ];
    
    sheet.getRange(1, 1, renewData.length, renewData[0].length).setValues(renewData);
    
    // 標題列格式
    sheet.getRange(1, 1, 1, renewData[0].length)
      .setBackground('#0891b2')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    
    // 金額欄位格式
    sheet.getRange(2, 7, renewData.length - 1, 1).setNumberFormat('NT$#,##0');
    
    // 自動調整欄寬
    for (let i = 1; i <= renewData[0].length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    Logger.log('✅ 續費記錄工作表已建立');
  } catch (e) {
    Logger.log('❌ 建立續費記錄失敗: ' + e);
  }
  
  // 4. 建立「統計報表」工作表
  try {
    let sheet = ss.getSheetByName('統計報表');
    if (!sheet) {
      sheet = ss.insertSheet('統計報表');
    } else {
      sheet.clear();
    }
    
    const statsData = [
      ['統計項目', '數值', '備註'],
      ['總客戶數', '=COUNTA(授權清單!A2:A)-COUNTBLANK(授權清單!A2:A)', '不含標題列'],
      ['啟用客戶數', '=COUNTIF(授權清單!F2:F,"啟用")', '目前營業中'],
      ['停用客戶數', '=COUNTIF(授權清單!F2:F,"停用")', '已停用'],
      ['試用期客戶', '=COUNTIFS(授權清單!C2:C,"試用期",授權清單!F2:F,"啟用")', '試用中'],
      ['正式客戶', '=COUNTIFS(授權清單!F2:F,"啟用")-COUNTIFS(授權清單!C2:C,"試用期",授權清單!F2:F,"啟用")', '付費客戶'],
      ['7天內到期', '=COUNTIFS(授權清單!E2:E,"<="&TODAY()+7,授權清單!E2:E,">="&TODAY(),授權清單!F2:F,"啟用")', '需提醒續費'],
      ['已過期', '=COUNTIFS(授權清單!E2:E,"<"&TODAY(),授權清單!F2:F,"啟用")', '已過期未停用'],
      ['本月收入', '=SUMIFS(續費記錄!G2:G,續費記錄!A2:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),續費記錄!A2:A,"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))', '本月續費總額'],
      ['累計總收入', '=SUM(續費記錄!G2:G)', '所有續費總和'],
      ['月均收入', '=SUMIF(授權清單!F2:F,"啟用",授權清單!G2:G)', '所有啟用客戶月費總和'],
      ['', '', ''],
      ['=== 方案統計 ===', '', ''],
      ['方案名稱', '客戶數', '月收入'],
      ['試用期', '=COUNTIFS(授權清單!C2:C,"試用期",授權清單!F2:F,"啟用")', 0],
      ['月繳', '=COUNTIFS(授權清單!C2:C,"月繳",授權清單!F2:F,"啟用")', '=COUNTIFS(授權清單!C2:C,"月繳",授權清單!F2:F,"啟用")*500'],
      ['季繳', '=COUNTIFS(授權清單!C2:C,"季繳",授權清單!F2:F,"啟用")', '=COUNTIFS(授權清單!C2:C,"季繳",授權清單!F2:F,"啟用")*400'],
      ['半年繳', '=COUNTIFS(授權清單!C2:C,"半年繳",授權清單!F2:F,"啟用")', '=COUNTIFS(授權清單!C2:C,"半年繳",授權清單!F2:F,"啟用")*400'],
      ['年繳', '=COUNTIFS(授權清單!C2:C,"年繳",授權清單!F2:F,"啟用")', '=COUNTIFS(授權清單!C2:C,"年繳",授權清單!F2:F,"啟用")*375'],
      ['終身授權', '=COUNTIFS(授權清單!C2:C,"終身授權",授權清單!F2:F,"啟用")', '=COUNTIFS(授權清單!C2:C,"終身授權",授權清單!F2:F,"啟用")*83']
    ];
    
    sheet.getRange(1, 1, statsData.length, statsData[0].length).setValues(statsData);
    
    // 主標題格式
    sheet.getRange(1, 1, 1, 3)
      .setBackground('#6366f1')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    
    // 方案統計標題格式
    sheet.getRange(14, 1, 1, 3)
      .setBackground('#8b5cf6')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    
    // 金額欄位格式
    sheet.getRange(2, 2, statsData.length - 1, 2).setNumberFormat('#,##0');
    
    // 自動調整欄寬
    for (let i = 1; i <= statsData[0].length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    Logger.log('✅ 統計報表工作表已建立');
  } catch (e) {
    Logger.log('❌ 建立統計報表失敗: ' + e);
  }
  
  // 5. 建立「設定說明」工作表
  try {
    let sheet = ss.getSheetByName('設定說明');
    if (!sheet) {
      sheet = ss.insertSheet('設定說明');
    } else {
      sheet.clear();
    }
    
    const helpData = [
      ['【授權管理中心使用說明】- 訂閱方案版'],
      [''],
      ['=== 📌 重要資訊（請妥善保管） ==='],
      [''],
      ['授權管理中心 Sheets ID:'],
      ['1xHLJEnSv3vXZrlhWZQZou-v4ZnVn1X33vLgISr8qg9E'],
      [''],
      ['授權 API 網址:'],
      ['https://script.google.com/macros/s/AKfycbyQ6GNnO8RRR-_IB25wG2zA3w4Ekqx1asgrvx3YN_25mVvSkNeLtmC9ZIPo-AMFMtxU/exec'],
      [''],
      ['LINE 官方帳號:'],
      ['https://lin.ee/YyXagFg'],
      [''],
      ['⚠️ 以上資訊請勿公開分享！'],
      [''],
      ['=== 訂閱方案說明 ==='],
      [''],
      ['1. 試用期（7天免費）'],
      ['   - 開通後可免費使用7天'],
      ['   - 功能完整不受限'],
      ['   - 到期前3天會顯示紅色警告'],
      ['   - 到期後自動停用'],
      [''],
      ['2. 月繳方案（500元/月）'],
      ['   - 最靈活的付費方式'],
      ['   - 隨時可以停止訂閱'],
      ['   - 適合短期或測試性使用'],
      [''],
      ['3. 季繳方案（1200元/3個月）'],
      ['   - 原價1500元，優惠價1200元'],
      ['   - 平均每月400元，省300元'],
      ['   - 8折優惠'],
      [''],
      ['4. 半年繳方案（2400元/6個月）'],
      ['   - 原價3000元，優惠價2400元'],
      ['   - 平均每月400元，省600元'],
      ['   - 8折優惠'],
      [''],
      ['5. 年繳方案（4500元/12個月）'],
      ['   - 原價6000元，優惠價4500元'],
      ['   - 平均每月375元，省1500元'],
      ['   - 75折優惠'],
      [''],
      ['6. 終身授權（30000元）'],
      ['   - 一次付費，永久使用'],
      ['   - 適合長期穩定的商家'],
      ['   - 平均每月僅83元'],
      [''],
      ['=== 新增客戶流程 ==='],
      [''],
      ['步驟1：在「授權清單」新增一行'],
      ['步驟2：填寫網站ID（WEB001, WEB002...）'],
      ['步驟3：填寫商家名稱、訂閱方案、到期日期'],
      ['步驟4：狀態設為「啟用」'],
      ['步驟5：複製 HTML 檔案給客戶'],
      ['步驟6：修改客戶檔案的 WEBSITE_ID'],
      [''],
      ['=== 客戶續費流程 ==='],
      [''],
      ['步驟1：先收款'],
      ['步驟2：在「授權清單」更新到期日期'],
      ['步驟3：在「續費記錄」新增一筆記錄'],
      ['步驟4：通知客戶續費完成'],
      [''],
      ['=== 停用客戶 ==='],
      [''],
      ['在「授權清單」將「狀態」改為「停用」'],
      ['客戶重新整理網頁後立即被鎖定'],
      [''],
      ['=== ⚠️ 重要規則 ==='],
      [''],
      ['⚠️ 網站ID 必須唯一，不可重複'],
      ['⚠️ 訂閱方案只能填：試用期/月繳/季繳/半年繳/年繳/終身授權'],
      ['⚠️ 狀態只能填：啟用/停用'],
      ['⚠️ 日期格式必須是：YYYY-MM-DD（例如：2025-12-31）'],
      ['⚠️ 修改後客戶需重新整理網頁才會生效'],
      ['⚠️ 不要修改工作表名稱和欄位名稱（會影響公式）'],
      [''],
      ['=== 📅 定期檢查清單 ==='],
      [''],
      ['每週檢查：'],
      ['□ 查看「統計報表」的「7天內到期」客戶'],
      ['□ 主動聯繫即將到期的客戶'],
      ['□ 備份「授權清單」和「續費記錄」'],
      [''],
      ['每月檢查：'],
      ['□ 查看本月收入（統計報表）'],
      ['□ 分析客戶留存率'],
      ['□ 檢查是否有過期未停用的客戶'],
      [''],
      ['客戶到期時：'],
      ['□ 提前7天發送續費提醒'],
      ['□ 到期當天改為「停用」狀態'],
      ['□ 收到款項後立即恢復「啟用」'],
      [''],
      ['=== 🐛 常見問題處理 ==='],
      [''],
      ['Q: 客戶說被誤鎖？'],
      ['A: 檢查「狀態」是否為「啟用」、「到期日期」是否正確'],
      ['   請客戶按 Ctrl+F5 強制重新整理'],
      [''],
      ['Q: 統計數字不對？'],
      ['A: 檢查工作表名稱和欄位名稱是否被改了'],
      ['   如果被改了，重新執行「建立所有工作表」函數'],
      [''],
      ['Q: 修改了 Apps Script 代碼？'],
      ['A: 修改後點「部署 → 管理部署作業 → 編輯 → 新版本 → 部署」'],
      ['   不要建立新部署（會改變 API 網址）'],
      [''],
      ['=== 🔐 安全注意事項 ==='],
      [''],
      ['✅ 定期備份「授權清單」和「續費記錄」（建議每週）'],
      ['✅ 不要公開分享 Sheets 連結'],
      ['✅ 不要公開分享 API 網址'],
      ['✅ 檢查 Sheets 共用權限（只有您能存取）'],
      ['❌ 不要隨意修改工作表名稱'],
      ['❌ 不要隨意修改欄位名稱'],
      ['❌ 不要刪除測試帳號（WEB001）'],
      [''],
      ['=== 📞 技術支援 ==='],
      [''],
      ['技術支援：快閃餐車小幫手'],
      ['LINE: https://lin.ee/YyXagFg'],
      ['系統版本：v2.0（訂閱方案版）'],
      ['更新日期：2025-10-12'],
      [''],
      ['=== 💡 使用技巧 ==='],
      [''],
      ['1. 使用「到期日期計算器」工作表快速計算到期日'],
      ['2. 保留 WEB001 作為永久測試帳號'],
      ['3. 先收款再開通/續費（避免糾紛）'],
      ['4. 在「續費記錄」詳細記錄每筆交易'],
      ['5. 定期查看「統計報表」了解經營狀況']
    ];
    
    sheet.getRange(1, 1, helpData.length, 1).setValues(helpData);
    
    // 標題格式
    sheet.getRange(1, 1)
      .setBackground('#dc2626')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(14)
      .setHorizontalAlignment('center');
    
    // 調整欄寬
    sheet.setColumnWidth(1, 600);
    
    Logger.log('✅ 設定說明工作表已建立');
  } catch (e) {
    Logger.log('❌ 建立設定說明失敗: ' + e);
  }
  
  // 6. 建立「到期日期計算器」工作表
  try {
    let sheet = ss.getSheetByName('到期日期計算器');
    if (!sheet) {
      sheet = ss.insertSheet('到期日期計算器');
    } else {
      sheet.clear();
    }
    
    const calcData = [
      ['方案', '開通日期', '到期日期', '計算公式'],
      ['試用期', new Date('2025-10-12'), '=B2+7', '開通日期+7天'],
      ['月繳', new Date('2025-10-12'), '=B3+30', '開通日期+30天'],
      ['季繳', new Date('2025-10-12'), '=B4+90', '開通日期+90天'],
      ['半年繳', new Date('2025-10-12'), '=B5+180', '開通日期+180天'],
      ['年繳', new Date('2025-10-12'), '=B6+365', '開通日期+365天'],
      ['', '', '', ''],
      ['說明：修改「開通日期」欄位，「到期日期」會自動計算', '', '', '']
    ];
    
    sheet.getRange(1, 1, calcData.length, calcData[0].length).setValues(calcData);
    
    // 標題列格式
    sheet.getRange(1, 1, 1, 4)
      .setBackground('#f59e0b')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    
    // 日期格式
    sheet.getRange(2, 2, 6, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(2, 3, 6, 1).setNumberFormat('yyyy-mm-dd');
    
    // 自動調整欄寬
    for (let i = 1; i <= calcData[0].length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    Logger.log('✅ 到期日期計算器工作表已建立');
  } catch (e) {
    Logger.log('❌ 建立到期日期計算器失敗: ' + e);
  }
  
  // 刪除預設的「工作表1」
  try {
    const defaultSheet = ss.getSheetByName('工作表1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
      Logger.log('✅ 已刪除預設工作表');
    }
  } catch (e) {
    Logger.log('⚠️ 無法刪除預設工作表: ' + e);
  }
  
  // 移動「授權清單」到第一個位置
  try {
    const authSheet = ss.getSheetByName('授權清單');
    if (authSheet) {
      ss.setActiveSheet(authSheet);
      ss.moveActiveSheet(1);
    }
  } catch (e) {
    Logger.log('⚠️ 無法移動工作表: ' + e);
  }
  
  SpreadsheetApp.flush();
  
  Logger.log('');
  Logger.log('========================================');
  Logger.log('🎉 所有工作表建立完成！');
  Logger.log('========================================');
  Logger.log('✅ 授權清單（含7筆測試資料）');
  Logger.log('✅ 方案價目表');
  Logger.log('✅ 續費記錄');
  Logger.log('✅ 統計報表（公式已自動計算）');
  Logger.log('✅ 設定說明');
  Logger.log('✅ 到期日期計算器');
  Logger.log('========================================');
  Logger.log('📋 接下來請：');
  Logger.log('1. 部署為網路應用程式');
  Logger.log('2. 複製 API 網址');
  Logger.log('3. 修改 cheenken.html 的 AUTH_API');
  Logger.log('========================================');
  
  // 顯示提示訊息
  SpreadsheetApp.getUi().alert(
    '🎉 完成！',
    '所有工作表已建立完成！\n\n' +
    '✅ 授權清單（含7筆測試資料）\n' +
    '✅ 方案價目表\n' +
    '✅ 續費記錄\n' +
    '✅ 統計報表\n' +
    '✅ 設定說明\n' +
    '✅ 到期日期計算器\n\n' +
    '📋 接下來請：\n' +
    '1. 部署為網路應用程式\n' +
    '2. 複製 API 網址\n' +
    '3. 修改 cheenken.html 的 AUTH_API',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

