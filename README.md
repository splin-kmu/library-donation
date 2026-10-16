# 註銷圖書轉贈：GitHub Pages + Google 試算表

本專案包含公開書目清冊（`index.html`）、館員登記後台（`admin.html`）及 Google Apps Script API（`Code.gs`）。

## 1. 建立 Google 試算表

建立 Google 試算表，建立工作表 `Books`，第一列欄位名稱請完全使用：

| barcode | title | author | status |
|---|---|---|---|
| 000123456789 | 範例書名 | 範例作者 | available |
| 000123456790 | 範例書名二 | 範例作者二 | claimed |

- `barcode`：每本書唯一條碼，建議將整欄設為「純文字」，避免前導 0 消失。
- `title`、`author`：書名、作者。
- `status`：未被索取填 `available`；已被索取填 `claimed`。
- 不要在公開書目表放讀者證號或其他個資。
- `Requests` 工作表可由程式自動建立，保存時間、讀者證號、條碼。

## 2. 設定 Apps Script

1. 在試算表選「擴充功能 → Apps Script」。
2. 將本專案 `Code.gs` 全部貼到編輯器，儲存。
3. Apps Script 左側「專案設定 → 指令碼屬性」新增：
   - `SPREADSHEET_ID`：試算表網址 `/d/` 與 `/edit` 之間的字串。
   - `ADMIN_PIN`：設定一組強且不重複使用的後台驗證碼。
4. 可在編輯器執行 `setupSheets` 一次，完成授權並建立 Requests 工作表。
5. 選「部署 → 新增部署 → 網頁應用程式」：
   - 執行身分：**我**
   - 存取權：**所有人**（公開前台需要讀取書目；這也代表 API 可被外部呼叫，因此必須設定強 PIN 並妥善保護）
6. 部署並授權，複製以 `/exec` 結尾的網頁應用程式網址。

> 不同 Google Workspace 組織可能限制「所有人」存取；若無法選取，請洽管理員。若政策不允許公開 Apps Script API，需改採有登入驗證的架構。

## 3. 設定前端並部署 GitHub Pages

1. 將 `config.js` 的 `API_URL` 換成 Apps Script `/exec` 網址。
2. 將 `index.html`、`admin.html`、`style.css`、`app.js`、`admin.js`、`config.js` 上傳到 GitHub repository 根目錄。
3. Repository → **Settings → Pages**，選擇從 `main` 分支的 `/ (root)` 部署。
4. 等待 GitHub Pages 網址啟用後測試：
   - 公開頁：`https://你的帳號.github.io/專案名稱/`
   - 後台：`https://你的帳號.github.io/專案名稱/admin.html`

## 4. 使用方式

- 前台會顯示書名、作者、條碼、索取狀態，約每 30 秒更新，也可手動更新。
- 後台輸入讀者證號、書目條碼及 PIN。
- 送出後 API 會鎖定登記流程，檢查條碼及狀態，更新 Books 狀態並寫入 Requests。
- 如果同一本書同時被兩位館員登記，後端鎖定與狀態檢查會避免重複成功。

## 5. 重要安全與上線前檢查

- `admin.html` 網址本身不是存取控制；不要將它當成安全邊界。
- PIN 是基本防護，不等同完整的員工登入、權限控管、稽核及防暴力猜測機制。正式處理讀者證號前，建議使用館方核准的登入系統／受控內網，並確認個資蒐集告知、保存期限、存取權限與刪除流程。
- 本版本的瀏覽器跨網域 POST 使用 `no-cors`，前端無法讀取 POST 回應；它會再讀取書目狀態確認是否成功。若網路延遲，請先查試算表再決定是否重送，避免誤判。
- 測試時請先使用虛構讀者證號與少量測試書目。正式啟用前請測試錯誤 PIN、無效條碼、重複索取、前導零條碼及手機版畫面。
