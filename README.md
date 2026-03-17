# CampSync 輕量化露營協作平台 🏕️

CampSync 是一個讓露營團隊可以即時協作、分配裝備、規劃伙食、並自動結算費用的輕量化網頁應用程式。

## ✨ 核心特色
- **無需後端資料庫**：完全利用 Google Sheets 作為免費的資料庫。
- **即時同步**：公共裝備、伙食計畫多人即時同步更新。
- **私密行李清單**：個人的行前準備清單儲存於瀏覽器本地（`localStorage`），保護隱私。
- **密碼保護房間**：支援建立專屬房間並設定密碼，讓同行者安全加入。
- **零成本部署**：前端為純靜態 HTML/JS/CSS，後端部署在 Google Apps Script (GAS) 上，完全免費。

## 🚀 專案架構
- `index.html`: 主進入點載入所有所需套件（React, Tailwind CSS）。
- `app-core.js`: 核心共用資料、工具函式（如圖示 SVG）。
- `app-components.js`: 共用 React 元件。
- `app-modals.js`: 彈出視窗元件（編輯項目、匯入、結算確認等）。
- `app-main.js`: 核心狀態管理與主要畫面渲染（包含與後端同步邏輯）。
- `Code.gs`: Google Apps Script 後端程式碼。
- `config.example.js` / `config.js`: 設定檔，放置 GAS Web App 的網址。

## 🛠️ 如何部署與安裝

### 步驟 1: 部署 Google Apps Script 後端
1. 到 [Google Apps Script 儀表板](https://script.google.com/) 點擊「新專案」。
2. 將此專案中的 `Code.gs` 內容完整複製並覆蓋到 GAS 編輯器中。
3. 點擊右上方的 **「部署」** > **「新增部署」**。
4. 選擇類型為 **「網頁應用程式 (Web App)」**。
   - 描述：輸入任意名稱（如 CampSync-v1）
   - 執行身份：**我**
   - 誰可以存取：**所有人 (Anyone)**
5. 點擊 **「部署」**，並在需要時授權權限給 Google 帳號。
6. 部署成功後，你會獲得一串 **「網頁應用程式網址 (Web App URL)」**，請將它複製下來。

### 步驟 2: 設定前端
1. 在專案資料夾中，將 `config.example.js` 重新命名或複製為 `config.js`。
2. 開啟 `config.js`，將剛剛獲得的 **Web App URL** 填入：
   ```javascript
   const GAS_URL = "你的_WEBAPP_URL_貼在這裡";
   ```
3. `config.js` 已被加入 `.gitignore` 中，因此你的專屬連結不會被上傳到 GitHub。

### 步驟 3: 啟動前端
因為這是純前端的靜態專案，你可以直接透過任何本機伺服器開啟 `index.html`：
- 使用 VSCode 的 Live Server 擴充功能
- 或使用 Python 內建伺服器：`python -m http.server 8080`
- 或將整個專案部署到免費靜態網頁託管服務，如 GitHub Pages 或 Vercel。

## 📝 授權條款
MIT License
