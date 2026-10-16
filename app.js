
const CONFIG = window.APP_CONFIG || {};
const API = CONFIG.PUBLIC_BOOKS_URL || "";
const $ = id => document.getElementById(id);

let allBooks = [];

async function loadBooks() {
  const message = $("message");
  const books = $("books");

  if (!API || API.includes("你的專案代碼")) {
    message.textContent = "請檢查 config.js 的 PUBLIC_BOOKS_URL 設定。";
    books.innerHTML = '<tr><td colspan="4">尚未完成設定</td></tr>';
    return;
  }

  message.textContent = "正在更新…";
  message.className = "message";

  try {
    const response = await fetch(API, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error("API 回應錯誤，HTTP " + response.status);
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || result.message || "讀取書目失敗");
    }

    allBooks = result.books || [];
    render();

    message.textContent =
      "更新時間：" + new Date().toLocaleTimeString("zh-TW");
  } catch (e) {
    message.textContent = "載入失敗：" + e.message;
    message.className = "message error";
    books.innerHTML = '<tr><td colspan="4">書目載入失敗，請稍後重試。</td></tr>';
  }
}

function render() {
  const q = $("search").value.trim().toLocaleLowerCase();
  const filter = $("statusFilter").value;

  const filtered = allBooks.filter(b => {
    const hay = [b.title, b.author, b.barcode]
      .join(" ")
      .toLocaleLowerCase();

    return hay.includes(q) &&
      (filter === "all" || b.status === filter);
  });

  const available = allBooks.filter(
    b => b.status === "available"
  ).length;

  $("summary").textContent =
    `共 ${allBooks.length} 筆書目｜尚可索取 ${available} 筆｜已被索取 ${allBooks.length - available} 筆`;

  $("books").innerHTML = filtered.length
    ? filtered.map(b => `
      <tr>
        <td>${esc(b.title || "（未填書名）")}</td>
        <td>${esc(b.author || "—")}</td>
        <td>${esc(b.barcode || "")}</td>
        <td>
          <span class="status ${b.status === "claimed" ? "claimed" : "available"}">
            ${b.status === "claimed" ? "已被索取" : "尚可索取"}
          </span>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="4">沒有符合條件的書目。</td></tr>';
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

$("search").addEventListener("input", render);
$("statusFilter").addEventListener("change", render);
$("refreshBtn").addEventListener("click", loadBooks);

loadBooks();
setInterval(loadBooks, 30000);
