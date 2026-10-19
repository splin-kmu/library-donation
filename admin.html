
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
  msg.replaceChildren();

  if (!CLAIM_URL || !ANON_KEY) {
    showMessage(
      "error",
      "請檢查 config.js 是否已設定 CLAIM_BOOK_URL 與 SUPABASE_ANON_KEY。"
    );
    return;
  }

  const readerId = document.getElementById("readerId").value.trim();
  const rawBarcodes = document.getElementById("barcode").value;

  // 支援每行一個條碼，也支援以逗號或分號分隔。
  const barcodes = [
    ...new Set(
      rawBarcodes
        .split(/[\n\r,;，；]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ];

  if (!readerId || barcodes.length === 0) {
    showMessage("error", "請輸入讀者證號及至少一筆書籍條碼。");
    return;
  }

  if (readerId.length > 100 || barcodes.some((code) => code.length > 100)) {
    showMessage("error", "讀者證號或書籍條碼長度超過限制。");
    return;
  }

  btn.disabled = true;
  btn.textContent = "登記中…";

  const results = [];
  let successCount = 0;

  try {
    // 逐本呼叫既有的 claim-book，不需建立新函式。
    for (const barcode of barcodes) {
      try {
        const response = await fetch(CLAIM_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
            "Authorization": `Bearer ${ANON_KEY}`
          },
          body: JSON.stringify({
            barcode,
            reader_card_id: readerId
          })
        });

        let data;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          const detail =
            data?.message ||
            data?.error ||
            `HTTP ${response.status}`;

          results.push(`❌ ${barcode}：${detail}`);
          continue;
        }

        if (data?.ok === true) {
          successCount++;
          results.push(`✅ ${barcode}：登記成功`);
        } else {
          results.push(
            `❌ ${barcode}：${data?.message || "登記未成功"}`
          );
        }
      } catch {
        results.push(
          `⚠️ ${barcode}：連線失敗，請查詢後台資料後再決定是否重試`
        );
      }
    }

    const resultBox = document.createElement("div");
    resultBox.className = "message";
    resultBox.setAttribute("role", "status");

    const summary = document.createElement("p");
    summary.textContent =
      `處理完成：共 ${barcodes.length} 本，` +
      `成功 ${successCount} 本，` +
      `未確認成功 ${barcodes.length - successCount} 本。`;

    const list = document.createElement("ul");

    for (const result of results) {
      const item = document.createElement("li");
      item.textContent = result;
      list.appendChild(item);
    }

    resultBox.append(summary, list);
    msg.replaceChildren(resultBox);

    if (successCount === barcodes.length) {
      document.getElementById("readerId").value = "";
      document.getElementById("barcode").value = "";
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "確認登記";
  }
});
