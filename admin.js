
const CONFIG = window.APP_CONFIG || {};

const CLAIM_URL = CONFIG.CLAIM_BOOK_URL || "";
const ANON_KEY = CONFIG.SUPABASE_ANON_KEY || "";

const form = document.getElementById("requestForm");
const msg = document.getElementById("adminMessage");
const btn = document.getElementById("submitBtn");

function showMessage(type, text) {
  msg.className = `message ${type}`;
  msg.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "message";
  msg.textContent = "";

  if (!CLAIM_URL || !ANON_KEY) {
    showMessage(
      "error",
      "設定不完整：請確認 config.js 有 CLAIM_BOOK_URL 和 SUPABASE_ANON_KEY。"
    );
    return;
  }

  const readerId = document.getElementById("readerId").value.trim();
  const barcodeText = document.getElementById("barcode").value.trim();

  // 支援每行一本，也支援用逗號或分號分隔條碼
  const barcodes = [
    ...new Set(
      barcodeText
        .split(/[\n\r,，;；]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];

  if (!readerId || barcodes.length === 0) {
    showMessage("error", "請填寫讀者證號及至少一筆書籍條碼。");
    return;
  }

  if (readerId.length > 100 || barcodes.some((code) => code.length > 100)) {
    showMessage("error", "讀者證號或書籍條碼長度不可超過 100 個字元。");
    return;
  }

  btn.disabled = true;
  btn.textContent = "登記中…";

  const results = [];

  try {
    for (const barcode of barcodes) {
      try {
        const response = await fetch(CLAIM_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({
            barcode,
            reader_card_id: readerId,
          }),
        });

        const data = await response.json().catch(() => ({}));
        const result = data.result || data;

        if (!response.ok || result.ok !== true) {
          results.push({
            barcode,
            success: false,
            message:
              result.message ||
              data.message ||
              `伺服器回應錯誤（HTTP ${response.status}）`,
          });
        } else {
          results.push({
            barcode,
            success: true,
            message: result.message || "登記成功",
          });
        }
      } catch (err) {
        results.push({
          barcode,
          success: false,
          message: "連線失敗，請檢查網路及 API 設定",
        });
      }

      // 逐本處理，避免同時送出多筆請求
      msg.textContent =
        `處理進度：${results.length}/${barcodes.length}\n` +
        results
          .map(
            (r) =>
              `${r.success ? "✓ 成功" : "✗ 失敗"}｜${r.barcode}｜${r.message}`
          )
          .join("\n");
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    msg.className = `message ${failCount === 0 ? "success" : "error"}`;
    msg.textContent =
      `處理完成：成功 ${successCount} 本，失敗 ${failCount} 本。\n\n` +
      results
        .map(
          (r) =>
            `${r.success ? "✓ 成功" : "✗ 失敗"}｜${r.barcode}｜${r.message}`
        )
        .join("\n");

    // 只有全部成功才清空輸入欄位，失敗時保留方便核對
    if (failCount === 0) {
      document.getElementById("readerId").value = "";
      document.getElementById("barcode").value = "";
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "確認登記";
  }
});
