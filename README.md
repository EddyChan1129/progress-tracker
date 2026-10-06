# 學習進度追蹤

私人學習手記：Google 登入、分類、Markdown／程式碼筆記、Cloudinary 圖片、大目標與細目標、計量進度歷史、學習總覽及連續學習日數。

## 本機啟動

需要 Node.js 24，以及執行 Firebase Emulator 測試時用嘅 Java 21+。

```sh
npm ci
cp .env.example .env.local
# 填好 .env.local 內嘅 Firebase／Cloudinary 設定
npm run dev
```

打開 `http://localhost:3000`。同一瀏覽器、同一網址會保存登入；首頁同 `/login` 會等待 Firebase 恢復身份，然後自動前往總覽。自行登出、清除網站資料或使用不保存資料嘅私人瀏覽模式後，需要重新登入。

環境變數名稱見 [.env.example](.env.example)。`NEXT_PUBLIC_FIREBASE_*` 係前端 Web App 設定；`FIREBASE_ADMIN_*` 同 `CLOUDINARY_*` 只用於 server。`.env.local`、service account key 同 `.vercel/` 唔會提交。

## 畫面同資料流程

- 手機用頂部四格導覽，桌面用側邊欄；記錄、目標、細目標、進度歷史同編輯細目標有獨立捲動區。長筆記／程式碼亦會喺區域內捲動。區域支援 Tab focus 同鍵盤捲動。
- `src/app/` 定義頁面；`src/features/` 按 auth、categories、learning、goals、dashboard 分工；`src/components/` 放共用版面同基本 UI。
- 表單用 React Hook Form 收集輸入，Zod 驗證，service 負責資料操作。一般讀取同目標操作使用 Firebase Web SDK，由 Firestore Rules 限制本人路徑同合法資料。
- 學習記錄新增、編輯及刪除統一經 `/api/learning-entries`。Server 驗證 Firebase ID token、本人分類／關聯目標、資料版本同圖片所有權，再 transaction 儲存。重試沿用同一次操作 ID。
- Cloudinary 存圖片，Firestore 存 `publicId`／URL。先更新記錄及清理待辦，再刪除無引用圖片；部分失敗可重試。取消編輯唔會刪原本圖片。
- 大目標狀態由使用者決定：未開始 → 進行中 → 暫停／完成，暫停可恢復。細目標完成唔會自動完成大目標。計量進度 transaction 同時更新總數及不可修改嘅歷史。
- 記錄可選擇、改變或移除關聯大目標，唔自動增加細目標進度。刪除大目標時會一併刪除旗下細目標同進度歷史，並解除學習記錄嘅目標關聯；筆記及圖片保留。細目標可以獨立刪除，連同其進度歷史清除。
- 分類列表提供刪除。仍有記錄／目標使用嘅分類需要先轉分類，server 會拒絕刪除並提示原因；唔會連帶刪除學習資料。
- 目標刪除先喺 transaction 設定 server-only `deleting` 標記，Rules 同記錄 API 阻止新增／修改相關資料。原生 Firestore `recursiveDelete` 清理後代，學習記錄分頁解除關聯，完成先刪 parent；中途失敗可以重試，唔受單次 500 筆 batch 限制。Client 直接刪除目標／細目標／分類仍然禁止。
- 品牌標記採用筆記頁角同向上階梯，代表將學習累積成進步；向量原檔 `public/brand/logo.svg` 用於登入頁、導覽同 favicon，另有 Apple touch icon。
- Dashboard 用完整學習日期計 streak：同日去重、忽略未來日期；今日未有記錄時可以由昨日開始。日期按使用者裝置本地時區計算。待完成目標只包括未開始同進行中。

Firestore 路徑：

```text
users/{uid}/categories/{id}
users/{uid}/learningEntries/{id}
users/{uid}/goals/{id}
users/{uid}/goals/{id}/subGoals/{id}
users/{uid}/goals/{id}/subGoals/{id}/updates/{operationId}
users/{uid}/imageAssets/{id}       # server 管理
users/{uid}/mediaOperations/{id}   # server 管理
```

Client page 嘅登入檢查改善導航體驗；真正資料隔離由 Rules／server token 驗證負責。登出時移除私人頁面；換帳戶時重新建立資料元件，避免保留上一個帳戶畫面。

## 驗證

```sh
npm run lint
npm run typecheck
npm run build
npm run test:all
TZ=America/New_York npm run test:dashboard
```

`test:all` 自動啟動 `demo-progress-tracker` Firestore Emulator，跑 schema、Rules、並行 transaction、目標關聯及圖片流程。Cloudinary 同身份驗證使用 mock，唔接觸正式資料。預期權限拒絕會喺測試輸出出現 `PERMISSION_DENIED`；以最後 pass／fail 為準。

瀏覽器驗收需要可用嘅 Playwright 同 Chromium。可以喺本機額外安裝（無需加入 application dependencies）：

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run test:ui
```

已有其他 Playwright runtime 時，可以設定 `PLAYWRIGHT_MODULE` 為其 module 絕對路徑；使用已安裝嘅 Chrome 時，可設定 `PLAYWRIGHT_EXECUTABLE_PATH` 為瀏覽器 executable 絕對路徑。`test:ui` 自動使用本機 Auth／Firestore Emulator，建立兩個測試帳戶同長列表，啟動獨立 `localhost:3100`，驗證 320／375／768／1440 px、鍵盤捲動、狀態切換、關聯儲存／取消、關閉瀏覽器後登入保留、首頁跳轉、登出及帳戶隔離。亦會壓力測試 125 個目標、111 個細步驟、60 個分類、長文字、逾期／無期限、篩選、進度歷史、手機確認 sheet、200% 文字及失效圖片。截圖保存喺 `.next/ui-checks/`；測試唔寫入正式 Firebase。請先完成 browser tests 再跑 build，避免 build 清除 test server 嘅 Next cache。

`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` 只喺 development 有效；必須配合 demo project 嘅 Web 設定及本機 emulators。`NEXT_DIST_DIR` 可為測試 server 指定另一個 build 目錄。

## 部署

Vercel 支援直接部署 Next.js project，可由 Git integration 匯入呢個 repository；相關設定見 [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)。

1. 使用已選定嘅 Vercel 帳戶／Team，同 existing project 或新 project。
2. 將 `.env.example` 列出嘅 Firebase／Cloudinary 變數加入所需 Vercel environments。Private key 用原始內容或 `\n` 換行；唔將 secret 放入 `NEXT_PUBLIC_`。環境管理見 [Vercel environment variables](https://vercel.com/docs/environment-variables)。
3. Production 唔設定 emulator 變數。喺 Firebase Authentication 加入正式網址嘅 authorized domain。
   Firebase Admin 14 嘅依賴需要 `require(ESM)` 支援；Vercel 預設關閉此功能。於 Vercel environment variables 新增 Config `NODE_OPTIONS=--experimental-require-module`（Production／Preview），並使用 Node.js 24，參考 [Vercel Node.js 設定](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration)。修改環境變數後需要重新部署。
4. 部署已驗證嘅 Rules 同查詢 index：

   ```sh
   npx firebase deploy --only firestore:rules,firestore:indexes --project process-tracking-87407
   ```

5. 執行 build／部署，再喺正式網址驗證 Google 登入、多圖儲存／編輯／刪除、目標狀態同 refresh 後登入保留。

Task 37 嘅實際部署狀態以 [task.md](task.md) 為準；本機 build 通過唔代表已上線。

## 現有限制

Dashboard 讀完整記錄同待完成目標嘅細目標，適合目前個人用途。捲動限制版面高度，唔會減少資料庫讀取量；資料量有實際效能問題時再加入分頁／統計彙總。

圖片清理冇背景 scheduler：未關聯圖片超過 24 小時後，下次打開列表或執行清理時先處理。舊功能建立前未登記嘅孤立圖片唔會自動發現。
