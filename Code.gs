/**
 * Google Apps Script backend for GitHub Pages + Google Sheets.
 * Spreadsheet tabs:
 * Books: barcode | title | author | status
 * Requests: timestamp | reader_id | barcode
 *
 * Set Script Properties:
 * SPREADSHEET_ID = the ID from the Google Sheet URL
 * ADMIN_PIN = a strong, unique staff PIN
 */
const BOOKS_SHEET = "Books";
const REQUESTS_SHEET = "Requests";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "books";
  let result;
  try {
    if (action !== "books") throw new Error("Unknown action");
    result = { ok: true, books: getBooks_() };
  } catch (err) {
    result = { ok: false, error: err.message || "Server error", books: [] };
  }
  const callback = e && e.parameter && e.parameter.callback;
  const json = JSON.stringify(result);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action !== "claim") throw new Error("無效的操作。");
    const expectedPin = PropertiesService.getScriptProperties().getProperty("ADMIN_PIN");
    if (!expectedPin || !constantTimeEqual_(String(p.adminPin || ""), expectedPin)) {
      throw new Error("驗證碼錯誤。");
    }
    const readerId = String(p.readerId || "").trim();
    const barcode = String(p.barcode || "").trim();
    if (!readerId || !barcode) throw new Error("讀者證號及條碼均為必填。");
    if (readerId.length > 80 || barcode.length > 100) throw new Error("欄位長度超出限制。");

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const ss = spreadsheet_();
      const sheet = ss.getSheetByName(BOOKS_SHEET);
      if (!sheet) throw new Error("找不到 Books 工作表。");
      const values = sheet.getDataRange().getDisplayValues();
      if (values.length < 2) throw new Error("目前沒有可登記書目。");
      const headers = values[0].map(v => String(v).trim().toLowerCase());
      const barcodeCol = headers.indexOf("barcode");
      const statusCol = headers.indexOf("status");
      if (barcodeCol < 0 || statusCol < 0) throw new Error("Books 表頭需包含 barcode、status。");
      let row = -1;
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][barcodeCol]).trim() === barcode) { row = i + 1; break; }
      }
      if (row < 0) throw new Error("找不到此條碼，請確認書目資料。");
      const status = String(sheet.getRange(row, statusCol + 1).getDisplayValue()).trim().toLowerCase();
      if (status === "claimed" || status === "已被索取") throw new Error("此書目已被索取，不可重複登記。");

      sheet.getRange(row, statusCol + 1).setValue("claimed");
      let req = ss.getSheetByName(REQUESTS_SHEET);
      if (!req) {
        req = ss.insertSheet(REQUESTS_SHEET);
        req.appendRow(["timestamp", "reader_id", "barcode"]);
      }
      req.appendRow([new Date(), readerId, barcode]);
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // The browser's no-cors POST cannot read this response. The message is still useful
    // in Apps Script execution logs; the admin page verifies the resulting book status.
    console.error(err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message || "Server error" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getBooks_() {
  const sheet = spreadsheet_().getSheetByName(BOOKS_SHEET);
  if (!sheet) throw new Error("找不到 Books 工作表。");
  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return [];
  const headers = values[0].map(v => String(v).trim().toLowerCase());
  const col = name => headers.indexOf(name);
  ["barcode", "title", "author", "status"].forEach(name => {
    if (col(name) < 0) throw new Error("Books 表頭需包含 barcode、title、author、status。");
  });
  return values.slice(1).filter(r => r[col("barcode")]).map(r => {
    const raw = String(r[col("status")] || "").trim().toLowerCase();
    const status = ["claimed", "已被索取", "taken"].includes(raw) ? "claimed" : "available";
    return {
      barcode: String(r[col("barcode")]).trim(),
      title: String(r[col("title")] || "").trim(),
      author: String(r[col("author")] || "").trim(),
      status
    };
  });
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("尚未設定 SPREADSHEET_ID。");
  return SpreadsheetApp.openById(id);
}

function constantTimeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Run once from the Apps Script editor to create the Requests tab if needed. */
function setupSheets() {
  const ss = spreadsheet_();
  if (!ss.getSheetByName(REQUESTS_SHEET)) {
    const s = ss.insertSheet(REQUESTS_SHEET);
    s.appendRow(["timestamp", "reader_id", "barcode"]);
  }
}