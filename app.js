
const CONFIG = window.APP_CONFIG || {};
const API = CONFIG.PUBLIC_BOOKS_URL || "";
const $ = id => document.getElementById(id);

let allBooks = [];
let currentLanguage = "zh";

const TEXT = {
  zh: {
    pageTitle: "註銷圖書轉贈清冊",
    pageDescription: "瀏覽可索取書目，索取狀態定時更新。",
    search: "搜尋書名、作者、條碼或其他書目資料…",
    allStatus: "全部索取狀態",
    available: "尚可索取",
    claimed: "已被索取",
    allLanguages: "全部語言",
    chinese: "中文",
    english: "英文",
    allClassifications: "全部分類",
    refresh: "立即更新",
    loading: "正在載入書目…",
    updating: "正在更新…",
    updated: "更新時間：",
    loadFailed: "書目載入失敗，請稍後重試。",
    noResults: "沒有符合條件的書目。",
    notConfigured: "請檢查 config.js 的 PUBLIC_BOOKS_URL 設定。",
    notConfiguredRow: "尚未完成設定",
    title: "書名",
    author: "作者",
    barcode: "條碼號",
    language: "語言別",
    callNumber: "索書號",
    classification: "分類",
    location: "圖書位置",
    status: "索取情況",
    missingTitle: "（未填書名）",
    summary: total => `共 ${total.total} 筆書目｜尚可索取 ${total.available} 筆｜已被索取 ${total.claimed} 筆`,
    footnote: "索取狀態會自動更新；若剛完成登記，請稍候或按「立即更新」。本清冊不顯示讀者個人資料。",
    footer: "圖書館｜註銷圖書轉贈活動",
    errorPrefix: "載入失敗："
  },
  en: {
    pageTitle: "Library Book Redistribution Catalogue",
    pageDescription: "Browse books available to claim. Claim statuses update automatically.",
    search: "Search title, author, barcode, or other book details…",
    allStatus: "All statuses",
    available: "Available",
    claimed: "Claimed",
    allLanguages: "All languages",
    chinese: "Chinese",
    english: "English",
    allClassifications: "All classifications",
    refresh: "Refresh",
    loading: "Loading books…",
    updating: "Updating…",
    updated: "Last updated: ",
    loadFailed: "Unable to load books. Please try again later.",
    noResults: "No books match your filters.",
    notConfigured: "Please check PUBLIC_BOOKS_URL in config.js.",
    notConfiguredRow: "Configuration incomplete",
    title: "Title",
    author: "Author",
    barcode: "Barcode",
    language: "Language",
    callNumber: "Call Number",
    classification: "Classification",
    location: "Location",
    status: "Claim Status",
    missingTitle: "(Untitled)",
    summary: total => `${total.total} books | ${total.available} available | ${total.claimed} claimed`,
    footnote: "Claim statuses update automatically. After submitting a claim, wait briefly or select Refresh. No reader personal information is displayed.",
    footer: "Library | Book Redistribution",
    errorPrefix: "Loading failed: "
  }
};

function t(key) {
  return TEXT[currentLanguage][key];
}

function normalise(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}


function languageCode(value) {
  const v = normalise(value);

  if ([
    "chi", "zh", "zh-tw", "zh-cn",
    "chinese", "中文", "華文", "华文", "國語", "国语"
  ].includes(v)) {
    return "chi";
  }

  if ([
    "eng", "en", "en-us", "en-gb",
    "english", "英文"
  ].includes(v)) {
    return "eng";
  }

  if ([
    "jpn", "ja", "ja-jp",
    "japanese", "日本語", "日文"
  ].includes(v)) {
    return "jpn";
  }

  return "other";
}



function displayLanguage(value) {
  const code = languageCode(value);

  const names = {
    chi: { zh: "中文", en: "Chinese" },
    eng: { zh: "英文", en: "English" },
    jpn: { zh: "日文", en: "Japanese" }
  };

  if (names[code]) {
    return names[code][currentLanguage];
  }

  return value || "—";
}


function displayStatus(status) {
  if (status === "available") return t("available");
  if (status === "claimed") return t("claimed");
  return status || "—";
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

function setLanguage(language) {
  currentLanguage = language;
  document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";

  $("pageTitle").textContent = t("pageTitle");
  $("pageDescription").textContent = t("pageDescription");
  $("search").placeholder = t("search");
  $("search").setAttribute("aria-label", t("search"));
  $("statusFilter").setAttribute("aria-label", t("status"));
  
  $("languageFilter").setAttribute("aria-label", t("language"));
  
  $("classificationFilter").setAttribute("aria-label", t("classification"));
  $("refreshBtn").textContent = t("refresh");
  $("footnote").textContent = t("footnote");
  $("footerText").textContent = t("footer");

  $("zhBtn").setAttribute("aria-pressed", String(language === "zh"));
  $("enBtn").setAttribute("aria-pressed", String(language === "en"));

  $("statusFilter").innerHTML = `
    <option value="all">${esc(t("allStatus"))}</option>
    <option value="available">${esc(t("available"))}</option>
    <option value="claimed">${esc(t("claimed"))}</option>
  `;


  $("languageFilter").innerHTML = `
    <option value="all">${esc(t("allLanguages"))}</option>
    <option value="chi">${esc(t("chinese"))}</option>
    <option value="eng">${esc(t("english"))}</option>
    <option value="jpn">${currentLanguage === "zh" ? "日文" : "Japanese"}</option>
  `;


  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (TEXT[language][key]) element.textContent = TEXT[language][key];
  });

  updateClassificationOptions();
  render();
}

function updateClassificationOptions() {
  const select = $("classificationFilter");
  const previousValue = select.value || "all";

  const values = [...new Set(
    allBooks
      .map(book => String(book.classification ?? "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  select.innerHTML =
    `<option value="all">${esc(t("allClassifications"))}</option>` +
    values.map(value =>
      `<option value="${esc(value)}">${esc(value)}</option>`
    ).join("");

  if (values.includes(previousValue)) {
    select.value = previousValue;
  }
}

async function loadBooks() {
  const message = $("message");
  const books = $("books");

  if (!API || API.includes("你的專案代碼") || API.includes("PASTE_YOUR")) {
    message.textContent = t("notConfigured");
    books.innerHTML = `<tr><td colspan="8">${esc(t("notConfiguredRow"))}</td></tr>`;
    return;
  }

  message.textContent = t("updating");
  message.className = "message";

  try {
    const response = await fetch(API, { method: "GET" });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || result.error || "API error");
    }

    allBooks = Array.isArray(result.books) ? result.books : [];
    updateClassificationOptions();
    render();

    message.textContent =
      t("updated") +
      new Date().toLocaleTimeString(
        currentLanguage === "zh" ? "zh-TW" : "en-US"
      );
  } catch (error) {
    message.textContent = t("errorPrefix") + error.message;
    message.className = "message error";
    books.innerHTML = `<tr><td colspan="8">${esc(t("loadFailed"))}</td></tr>`;
  }
}


function render() {
  const query = normalise($("search").value);
  const statusFilter = $("statusFilter").value;
  const langFilter = $("languageFilter").value;
  const classificationFilter = $("classificationFilter").value;

  const filtered = allBooks.filter(book => {
    const searchable = [
      book.title,
      book.author,
      book.barcode,
      book.language,
      book.call_number,
      book.classification,
      book.location
    ].map(normalise).join(" ");

    const matchesQuery = searchable.includes(query);
    const matchesStatus =
      statusFilter === "all" || book.status === statusFilter;

    const code = languageCode(book.language);
    const matchesLanguage =
      langFilter === "all" || code === langFilter;

    const matchesClassification =
      classificationFilter === "all" ||
      String(book.classification ?? "").trim() === classificationFilter;

    return matchesQuery &&
      matchesStatus &&
      matchesLanguage &&
      matchesClassification;
  });

  const available = allBooks.filter(
    book => book.status === "available"
  ).length;

  const claimed = allBooks.filter(
    book => book.status === "claimed"
  ).length;

  $("summary").textContent = t("summary")({
    total: allBooks.length,
    available,
    claimed
  });

  // 電腦版：保留原本八欄表格
  $("books").innerHTML = filtered.length
    ? filtered.map(book => {
        const statusClass =
          book.status === "claimed" ? "claimed" : "available";

        return `
          <tr>
            <td>${esc(book.title || t("missingTitle"))}</td>
            <td>${esc(book.author || "—")}</td>
            <td>${esc(book.barcode || "—")}</td>
            <td>${esc(displayLanguage(book.language))}</td>
            <td>${esc(book.call_number || "—")}</td>
            <td>${esc(book.classification || "—")}</td>
            <td>${esc(book.location || "—")}</td>
            <td>
              <span class="status ${statusClass}">
                ${esc(displayStatus(book.status))}
              </span>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="8">${esc(t("noResults"))}</td></tr>`;

  // 手機版：卡片顯示相同的篩選結果
  const cards = $("bookCards");

  if (!cards) return;

  cards.innerHTML = filtered.length
    ? filtered.map(book => {
        const statusClass =
          book.status === "claimed" ? "claimed" : "available";

        const fields = [
          ["author", book.author],
          ["barcode", book.barcode],
          ["language", displayLanguage(book.language)],
          ["callNumber", book.call_number],
          ["classification", book.classification],
          ["location", book.location]
        ];

        return `
          <article class="book-card">
            <header class="book-card-header">
              <h2 class="book-card-title">
                ${esc(book.title || t("missingTitle"))}
              </h2>
              <div class="book-card-status">
                <span class="status ${statusClass}">
                  ${esc(displayStatus(book.status))}
                </span>
              </div>
            </header>

            <dl class="book-card-details">
              ${fields.map(([key, value]) => `
                <div class="book-card-field">
                  <dt>${esc(t(key))}</dt>
                  <dd>${esc(value || "—")}</dd>
                </div>
              `).join("")}
            </dl>
          </article>
        `;
      }).join("")
    : `<div class="book-card-empty">${esc(t("noResults"))}</div>`;
}


$("search").addEventListener("input", render);
$("statusFilter").addEventListener("change", render);
$("languageFilter").addEventListener("change", render);
$("classificationFilter").addEventListener("change", render);
$("refreshBtn").addEventListener("click", loadBooks);
$("zhBtn").addEventListener("click", () => setLanguage("zh"));
$("enBtn").addEventListener("click", () => setLanguage("en"));

setLanguage("zh");
loadBooks();
setInterval(loadBooks, 30000);
