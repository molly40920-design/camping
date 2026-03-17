/**
 * CampSync - Google Apps Script Backend
 * 請將此檔案內容完整覆蓋到你的 Google Apps Script 專案中
 * 然後：部署 > 管理部署 > 版本選「新版本」> 部署
 */

// ===== 設定區 =====
const ROOM_INDEX_SHEET = '_RoomIndex';

// ===== 工具函式 =====
function hashPassword(pwd) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pwd);
  return raw.map(function(b) { return ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2); }).join('');
}

function getSS() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateRoomIndex() {
  const ss = getSS();
  var sheet = ss.getSheetByName(ROOM_INDEX_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ROOM_INDEX_SHEET);
    sheet.appendRow(['roomId', 'passwordHash', 'status', 'tabName', 'createdAt', 'deletedAt']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    SpreadsheetApp.flush();
  }
  return sheet;
}

function findActiveRoom(roomId) {
  var sheet = getOrCreateRoomIndex();
  var data = sheet.getDataRange().getValues();
  var targetId = String(roomId).trim().toUpperCase();

  for (var i = 1; i < data.length; i++) {
    var cellRoomId = String(data[i][0]).trim().toUpperCase();
    var cellStatus = String(data[i][2]).trim().toLowerCase();

    if (cellRoomId === targetId && cellStatus === 'active') {
      return {
        row: i + 1,
        roomId: String(data[i][0]).trim(),
        passwordHash: String(data[i][1]).trim(),
        status: String(data[i][2]).trim(),
        tabName: String(data[i][3]).trim(),
        createdAt: data[i][4],
        deletedAt: data[i][5]
      };
    }
  }
  return null;
}

// ===== GET 請求 (讀取房間資料) =====
function doGet(e) {
  try {
    var roomId = String(e.parameter.roomId || '').trim().toUpperCase();
    if (!roomId) return jsonResp({ success: false, error: 'MISSING_ROOM_ID' });

    var room = findActiveRoom(roomId);
    if (!room) {
      // 回傳 debug 資訊幫助排查
      var indexSheet = getOrCreateRoomIndex();
      var allData = indexSheet.getDataRange().getValues();
      var debugRows = [];
      for (var d = 1; d < allData.length; d++) {
        debugRows.push({
          roomId: String(allData[d][0]),
          status: String(allData[d][2]),
          tabName: String(allData[d][3])
        });
      }
      return jsonResp({ success: true, roomDeleted: true, debug: { searchedFor: roomId, totalRows: allData.length, rows: debugRows } });
    }

    var ss = getSS();
    var sheet = ss.getSheetByName(room.tabName);
    if (!sheet) {
      return jsonResp({ success: true, roomDeleted: true, debug: { reason: 'TAB_NOT_FOUND', tabName: room.tabName } });
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var items = [];
    var membersSet = {};

    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var h = 0; h < headers.length; h++) {
        row[String(headers[h]).trim()] = data[i][h];
      }
      if (String(row.type).trim() === '_member') {
        membersSet[String(row.name).trim()] = true;
      } else {
        if (row.splitAmong && typeof row.splitAmong === 'string') {
          try { row.splitAmong = JSON.parse(row.splitAmong); } catch(err) { row.splitAmong = []; }
        }
        row.isPacked = (row.isPacked === true || String(row.isPacked).toLowerCase() === 'true');
        row.price = Number(row.price) || 0;
        row.day = Number(row.day) || 1;
        items.push(row);
      }
    }

    return jsonResp({ success: true, items: items, members: Object.keys(membersSet) });
  } catch (err) {
    return jsonResp({ success: false, error: 'GET_ERROR: ' + err.toString() });
  }
}

// ===== POST 請求 (寫入/操作) =====
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var roomId = String(body.roomId || '').trim().toUpperCase();
    var data = body.data || {};

    switch (action) {
      case 'create_room': return handleCreateRoom(roomId, data);
      case 'join': return handleJoin(roomId, data);
      case 'upsert': return handleUpsert(roomId, data);
      case 'delete': return handleDelete(roomId, data);
      case 'delete_sheet': return handleDeleteSheet(roomId);
      default: return jsonResp({ success: false, error: 'UNKNOWN_ACTION' });
    }
  } catch (err) {
    return jsonResp({ success: false, error: err.toString() });
  }
}

// ===== 建立房間 =====
function handleCreateRoom(roomId, data) {
  if (!roomId || !data.password) {
    return jsonResp({ success: false, error: 'MISSING_FIELDS' });
  }

  var existing = findActiveRoom(roomId);
  if (existing) {
    return jsonResp({ success: false, error: 'ROOM_EXISTS' });
  }

  var ss = getSS();
  var pwdHash = hashPassword(data.password);
  var now = new Date().toISOString();
  var tabName = roomId + '_' + Date.now();

  // 建立 sheet tab
  var sheet = ss.insertSheet(tabName);
  sheet.appendRow(['id', 'type', 'name', 'assignee', 'isPacked', 'day', 'mealType', 'price', 'payer', 'splitAmong', 'updatedAt']);
  sheet.getRange(1, 1, 1, 11).setFontWeight('bold');

  // 加入建立者為成員
  if (data.userName) {
    sheet.appendRow([roomId + '_member_' + data.userName, '_member', data.userName, '', '', '', '', '', '', '', now]);
  }

  // 寫入 _RoomIndex
  var indexSheet = getOrCreateRoomIndex();
  indexSheet.appendRow([roomId, pwdHash, 'active', tabName, now, '']);

  // 強制寫入
  SpreadsheetApp.flush();

  return jsonResp({ success: true, message: 'ROOM_CREATED' });
}

// ===== 加入房間 =====
function handleJoin(roomId, data) {
  if (!roomId) return jsonResp({ success: false, error: 'MISSING_ROOM_ID' });

  var room = findActiveRoom(roomId);
  if (!room) {
    return jsonResp({ success: false, error: 'ROOM_NOT_FOUND' });
  }

  if (!data.password) {
    return jsonResp({ success: false, error: 'MISSING_PASSWORD' });
  }

  var inputHash = hashPassword(data.password);
  if (inputHash !== room.passwordHash) {
    return jsonResp({ success: false, error: 'WRONG_PASSWORD' });
  }

  var ss = getSS();
  var sheet = ss.getSheetByName(room.tabName);
  if (!sheet) return jsonResp({ success: false, error: 'ROOM_NOT_FOUND' });

  var userName = String(data.userName || 'Anonymous').trim();
  var allData = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][1]).trim() === '_member' && String(allData[i][2]).trim() === userName) {
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([roomId + '_member_' + userName, '_member', userName, '', '', '', '', '', '', '', new Date().toISOString()]);
    SpreadsheetApp.flush();
  }

  return jsonResp({ success: true });
}

// ===== Upsert 項目 =====
function handleUpsert(roomId, data) {
  var room = findActiveRoom(roomId);
  if (!room) return jsonResp({ success: false, error: 'ROOM_CLOSED' });

  var ss = getSS();
  var sheet = ss.getSheetByName(room.tabName);
  if (!sheet) return jsonResp({ success: false, error: 'ROOM_CLOSED' });

  var items = Array.isArray(data) ? data : [data];

  items.forEach(function(item) {
    var allData = sheet.getDataRange().getValues();
    var rowIdx = -1;
    for (var i = 1; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === String(item.id).trim()) { rowIdx = i + 1; break; }
    }
    var splitStr = item.splitAmong ? JSON.stringify(item.splitAmong) : '[]';
    var row = [
      item.id || '', item.type || '', item.name || '', item.assignee || '',
      item.isPacked || false, item.day || 1, item.mealType || '',
      item.price || 0, item.payer || '', splitStr, item.updatedAt || new Date().toISOString()
    ];
    if (rowIdx > 0) {
      sheet.getRange(rowIdx, 1, 1, 11).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });

  SpreadsheetApp.flush();
  return jsonResp({ success: true });
}

// ===== 刪除項目 =====
function handleDelete(roomId, data) {
  var room = findActiveRoom(roomId);
  if (!room) return jsonResp({ success: false, error: 'ROOM_CLOSED' });

  var ss = getSS();
  var sheet = ss.getSheetByName(room.tabName);
  if (!sheet) return jsonResp({ success: false, error: 'ROOM_CLOSED' });

  var allData = sheet.getDataRange().getValues();
  for (var i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][0]).trim() === String(data.id).trim()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  SpreadsheetApp.flush();
  return jsonResp({ success: true });
}

// ===== 刪除/封存房間 =====
function handleDeleteSheet(roomId) {
  var indexSheet = getOrCreateRoomIndex();
  var data = indexSheet.getDataRange().getValues();
  var now = new Date().toISOString();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === String(roomId).trim().toUpperCase() && String(data[i][2]).trim().toLowerCase() === 'active') {
      indexSheet.getRange(i + 1, 3).setValue('deleted');
      indexSheet.getRange(i + 1, 6).setValue(now);

      var ss = getSS();
      var tabName = String(data[i][3]).trim();
      var sheet = ss.getSheetByName(tabName);
      if (sheet) {
        ss.deleteSheet(sheet);
      }
      break;
    }
  }

  SpreadsheetApp.flush();
  return jsonResp({ success: true });
}

// ===== JSON 回應 =====
function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
