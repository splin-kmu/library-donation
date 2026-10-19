
const CONFIG = window.APP_CONFIG || {};
const API = CONFIG.PUBLIC_BOOKS_URL || "";
const $ = id => document.getElementById(id);

let allBooks = [];
let currentLanguage = "zh";

const text = {
  zh: {
    pageTitle: "註銷圖書轉贈清冊",
    description: "瀏覽可索取書目，索取狀態定時更新。",
    languageLabel: "介面語言",
    search: "搜尋書名、作者、條碼或圖書位置…",
    searchAria: "搜尋書目",
    statusFilter: "篩選索取情況",
    allStatus: "全部狀態",
    available: "尚可索取",
    claimed: "已被索取",
    languageFilter: "篩選書籍語言",
    allLanguages: "全部語言",
    chinese: "中文",
    english: "英文",
    classificationFilter: "篩選分類法或分類號",
    allClassifications: "全部分類",
    refresh: "立即更新",
    title: "書名",
    author: "作者",
    barcode: "條碼號",
    language: "語言別",
    classification: "分類法／分類號",
    location: "圖書位置",
    status: "索取情況",
    loading: "正在載入書目…",
    updating: "正在更新…",
    notConfigured: "請檢查 config.js 的 PUBLIC_BOOKS_URL 設定。",
    notConfiguredRow: "尚未完成設定",
    loadFailed: "書目載入失敗，請稍後重試。",
    updateTime: "更新時間：",
    total: "共",
    records: "筆書目",
    availableCount: "尚可索取",
    claimedCount: "已被索取",
    recordUnit: "筆",
    noTitle: "（未填書名）",
    noData: "—",
    noResults: "沒有符合條件的書目。",
    fetchFailed: "載入失敗：",
    footnote: "索取狀態會自動更新；若剛完成登記，請稍候或按「立即更新」。本清冊不顯示讀者個人資料。",
    footer: "圖書館｜註銷圖書轉贈活動"
  },
  en: {
    pageTitle: "Library Book Redistribution Catalog",
    description: "Browse available books. Claim statuses refresh automatically.",
    languageLabel: "Interface language",
    search: "Search title, author, barcode, or location…",
    searchAria: "Search catalog",
    statusFilter: "Claim status",
    allStatus: "All statuses",
    available: "Available",
    claimed: "Claimed",
    languageFilter: "Book language",
    allLanguages: "All languages",
    chinese: "Chinese",
    english: "English",
    classificationFilter: "Classification",
    allClassifications: "All classifications",
    refresh: "Refresh now",
    title: "Title",
    author: "Author",
    barcode: "Barcode",
    language: "Language",
    classification: "Classification",
    location: "Location",
    status: "Claim status",
    loading: "Loading catalog…",
    updating: "Updating…",
    notConfigured: "Please check PUBLIC_BOOKS_URL in config.js.",
    notConfiguredRow: "Configuration incomplete",
    loadFailed: "Could not load the catalog. Please try again later.",
    updateTime: "Last updated: ",
    total: "Total:",
    records: "books",
    availableCount: "Available:",
    claimedCount: "Claimed:",
    recordUnit: "",
    noTitle: "(Untitled)",
    noData: "—",
    noResults: "No matching books found.",
    fetchFailed: "Loading failed: ",
    footnote: "Claim statuses refresh automatically. After submitting a claim, wait a moment or select Refresh now. No reader personal information is displayed.",
    footer: "Library | Book Redistribution"
  }
};

function tr(key) {
  return text[currentLanguage][key] ?? key;
}

// 支援可能的欄位名稱，方便配合現有資料結構。
function field(book, names) {
  for (const name of names) {
    const value = book?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function bookLanguage(book) {
  return field(book, ["language", "book_language", "language_name", "lang"]);
}

function bookClassification(book) {
  return field(book, [
    "classification",
    "classification_number",
    "classification_no",
    "call_number",
    "classification_code"
  ]);
}

function bookLocation(book) {
  return field(book, [
    "location",
    "book_location",
    "shelf_location",
    "shelf",
    "location_name"
  ]);
}

function normalizeLanguage(value) {
  const v = String(value || "").trim().toLowerCase();

  if (
    ["zh", "zh-tw", "chinese", "中文", "中文書", "國文", "華文",
     "繁體中文", "簡體中文", "mandarin"].includes(v)
  ) return "zh";

  if (
    ["en", "en-us", "english", "英文", "英語", "英語書"].includes(v)
  ) return "en";

  return "other";
}

function setSelectOptions(select, options, selectedValue, firstLabel) {
  select.replaceChildren();

  const first = document.createElement("option");
  first.value = "all";
  first.textContent = firstLabel;
  select.appendChild(first);

  for (const value of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  select.value = options.includes(selectedValue) ? selectedValue : "all";
}

function updateClassificationOptions() {
  const select = $("classificationFilter");
  const previous = select.value;

  const options = [...new Set(
    allBooks.map(bookClassification).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "zh-Hant"));

  setSelectOptions(
    select,
    options,
    previous,
    tr("allClassifications")
  );
}

function applyLanguage() {
  const t = text[currentLanguage];

  document.documentElement.lang = currentLanguage === "zh" ? "zh-Hant" : "en";
  document.title = t.pageTitle;

  $("pageTitle").textContent = t.pageTitle;
  $("pageDescription").textContent = t.description;
  $("interfaceLanguageLabel").textContent = t.languageLabel;
  $("search").placeholder = t.search;
  $("search").setAttribute("aria-label", t.searchAria);
  $("statusFilter").setAttribute("aria-label", t.statusFilter);
  $("languageFilter").setAttribute("aria-label", t.languageFilter);
  $("classificationFilter").setAttribute("aria-label", t.classificationFilter);
  $("refreshBtn").textContent = t.refresh;
  $("footnote").textContent = t.footnote;
  $("footerText").textContent = t.footer;

  const status = $("statusFilter");
  const oldStatus = status.value;
  setSelectOptions(status, [], oldStatus, t.allStatus);

  for (const item of [
    { value: "available", label: t.available },
    { value: "claimed", label: t.claimed }
  ]) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    status.appendChild(option);
  }
  status.value = ["all", "available", "claimed"].includes(oldStatus)
    ? oldStatus : "all";

  const languageFilter = $("languageFilter");
  const oldLanguage = languageFilter.value;
  setSelectOptions(languageFilter, [], oldLanguage, t.allLanguages);

  for (const item of [
    { value: "zh", label: t.chinese },
    { value: "en", label: t.english }
  ]) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    languageFilter.appendChild(option);
  }
  languageFilter.value = ["all", "zh", "en"].includes(oldLanguage)
    ? oldLanguage : "all";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });

  updateClassificationOptions();
  render();
}

async function loadBooks() {
  const message = $("message");
  const books = $("books");

  if (!API || API.includes("你的專案代碼")) {
    message.textContent = tr("notConfigured");
    message.className = "message error";
    books.innerHTML =
      `<tr><td colspan="7">${esc(tr("notConfiguredRow"))}</td></tr>`;
    return;
  }

  message.textContent = tr("updating");
  message.className = "message";

  try {
    const response = await fetch(API, { method: "GET" });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || result.message || "API error");
    }

    allBooks = Array.isArray(result.books) ? result.books : [];

    updateClassificationOptions();
    render();

    message.textContent =
      tr("updateTime") + new Date().toLocaleTimeString(
        currentLanguage === "zh" ? "zh-TW" : "en-US"
      );
    message.className = "message";
  } catch (e) {
    message.textContent = tr("fetchFailed") + e.message;
    message.className = "message error";
    books.innerHTML =
      `<tr><td colspan="7">${esc(tr("loadFailed"))}</td></tr>`;
  }
}

function render() {
  const q = $("search").value.trim().toLocaleLowerCase();
  const statusFilter = $("statusFilter").value;
  const languageFilter = $("languageFilter").value;
  const classificationFilter = $("classificationFilter").value;

  const filtered = allBooks.filter(book => {
    const haystack = [
      field(book, ["title"]),
      field(book, ["author"]),
      field(book, ["barcode"]),
      bookLanguage(book),
      bookClassification(book),
      bookLocation(book)
    ].join(" ").toLocaleLowerCase();

    const language = normalizeLanguage(bookLanguage(book));

    return haystack.includes(q) &&
      (statusFilter === "all" || book.status === statusFilter) &&
      (languageFilter === "all" || language === languageFilter) &&
      (classificationFilter === "all" ||
        bookClassification(book) === classificationFilter);
  });

  const available = allBooks.filter(book => book.status === "available").length;
  const claimed = allBooks.filter(book => book.status === "claimed").length;

  $("summary").textContent =
    `${tr("total")} ${allBooks.length} ${tr("records")}｜` +
    `${tr("availableCount")} ${available} ${tr("recordUnit")}｜` +
    `${tr("claimedCount")} ${claimed} ${tr("recordUnit")}`;

  const tbody = $("books");

  if (filtered.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="7">${esc(tr("noResults"))}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(book => {
    const status = book.status === "claimed" ? "claimed" : "available";
    const statusLabel = status === "claimed" ? tr("claimed") : tr("available");

    return `
      <tr>
        <td>${esc(field(book, ["title"]) || tr("noTitle"))}</td>
        <td>${esc(field(book, ["author"]) || tr("noData"))}</td>
        <td>${esc(field(book, ["barcode"]) || tr("noData"))}</td>
        <td>${esc(bookLanguage(book) || tr("noData"))}</td>
        <td>${esc(bookClassification(book) || tr("noData"))}</td>
        <td>${esc(bookLocation(book) || tr("noData"))}</td>
        <td>
          <span class="status ${status}">${esc(statusLabel)}</span>
        </td>
      </tr>
    `;
  }).join("");
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

$("interfaceLanguage").addEventListener("change", event => {
  currentLanguage = event.target.value === "en" ? "en" : "zh";
  applyLanguage();
});

$("search").addEventListener("input", render);
$("statusFilter").addEventListener("change", render);
$("languageFilter").addEventListener("change", render);
$("classificationFilter").addEventListener("change", render);
$("refreshBtn").addEventListener("click", loadBooks);

applyLanguage();
loadBooks();
setInterval(loadBooks, 30000);
