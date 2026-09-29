# Personal Learning Progress Tracker — 逐步學習計劃

## 合作方式

- **一次只做一個 Task。** 只實作當次指定嘅 task，唔提前建立其他功能或安裝未用套件。
- 每步開始前，先用廣東話解釋：做乜、點解需要、會改邊啲檔案、資料點樣流動，同有咩簡單替代方案。
- 每步完成後，逐個重要檔案講解：責任、輸入、輸出、邊個呼叫、冇咗會影響乜；再解釋重要 function。
- 每步提供簡單驗收方法；有非簡單邏輯就留低最小可執行檢查。涉及權限同資料一致性必須測試。
- 每步問 1–2 條理解問題；完成一個主要功能時問 3–5 條。
- **完成同驗收後，將該項改成 `[x] Task NN — complete`，加完成日期、實際改動檔案、驗收結果。未驗證唔可以當完成。**
- 標記完成後停低，等你話「明白，下一步」先開始下一個 Task。你問 code 時先講解，唔順便做下一步。
- 如果一個 Task 實際太大，先喺呢份文件拆細，再只做第一小步。
- 做到 Firebase Console、帳戶設定等需要你操作嘅部分，會提供具體步驟；未完成就保留未完成狀態。

## 已確認現況（2026-09-27）

目前目錄只有 `.agents/` 同 `skills-lock.json`；未有 `package.json`、application source 或專案依賴清單。Skills 並唔係 application 已安裝嘅 libraries。

計劃按需要加入：

| 時機 | 工具／套件 |
| --- | --- |
| 基礎 | Next.js 當時最新 stable、React、React DOM、TypeScript、Tailwind CSS、ESLint |
| 第一個 UI 元件 | shadcn/ui 初始化，只加入即將使用嘅元件 |
| Firebase 接駁 | Firebase Web SDK，只用 Authentication 同 Firestore |
| Code 內容顯示 | 支援 fenced code blocks 嘅 Markdown renderer，實作嗰步先選最小合適套件 |
| 圖片功能 | Cloudinary；需要 server 驗證 Firebase 身份時先加入 Firebase Admin SDK |
| 第一個表單 | React Hook Form、Zod、@hookform/resolvers |
| 日期顯示／統計 | date-fns |
| 權限測試 | Firebase CLI／Emulator 及必要嘅 rules 測試工具 |
| 部署 | Vercel；用 Git integration，唔預先安裝部署 SDK |

實作時先查官方文件確認版本、相容性同設定方式，唔喺計劃寫死未核實版本。

## 建議架構（逐步建立，唔預先開空檔案）

```text
src/
  app/
    layout.tsx
    globals.css
    (auth)/login/page.tsx
    (app)/
      layout.tsx
      dashboard/page.tsx
      categories/page.tsx
      learning/page.tsx
      learning/new/page.tsx
      learning/[id]/edit/page.tsx
      goals/page.tsx
      goals/new/page.tsx
      goals/[id]/page.tsx
      goals/[id]/edit/page.tsx
  features/
    auth/
      components/
      services/auth.service.ts
    categories/
      components/
      services/category.service.ts
      schemas/category.schema.ts
      types/category.types.ts
    learning/
      components/
      services/learning.service.ts
      schemas/learning.schema.ts
      types/learning.types.ts
    goals/
      components/
      services/goal.service.ts
      schemas/goal.schema.ts
      types/goal.types.ts
    dashboard/
      components/
      services/dashboard.service.ts
  components/
    ui/
    layout/
  lib/
    firebase/client.ts
    utils.ts                 # 只喺 shadcn 初始化需要時加入
firestore.rules
firestore.indexes.json       # 查詢需要時先加入 index
firebase.json
.env.example
task.md
```

`(app)` 係 route group，唔會出現喺 URL。Page 負責組合畫面；有互動／登入狀態嘅部分先用 Client Component。一般資料 CRUD 採用 Firebase Web SDK。做到 Cloudinary 時先加必要嘅 server Route Handlers、Firebase ID token 驗證同 Admin SDK；唔另外建立 server session 系統。Cloudinary server 設定放 `src/lib/cloudinary/server.ts`，圖片邏輯放 learning feature，API 入口放 `src/app/api/learning-images/`，實作時先逐個建立。

```text
使用者填表
  → React Hook Form 收集輸入
  → feature 內嘅 Zod schema 驗證
  → submit handler 呼叫 feature service
  → service 轉換資料／日期，呼叫 Firebase
  → Firestore Security Rules 驗證權限及資料
  → 寫入成功後 UI 更新；失敗就顯示可理解嘅錯誤
```

Firestore 查詢只放喺 feature service；UI 唔直接 import Firestore 操作。前端 schema 幫助輸入體驗，Security Rules 先係資料庫嘅保護，兩者唔可以互相取代。

## 建議資料模型

先用每個使用者自己嘅路徑，方便理解隔離方式：

```text
users/{uid}/categories/{categoryId}
users/{uid}/learningEntries/{entryId}
users/{uid}/goals/{goalId}
users/{uid}/goals/{goalId}/updates/{updateId}
```

唔需要預先建立 `users/{uid}` profile document，子 collection 可以獨立存在。`id` 由 document ID 讀出；保留 prompt 嘅 `userId`，Rules 要求佢等於路徑 uid，更新時不可改。

| Document | 內容 |
| --- | --- |
| Category | userId、name、icon?、createdAt |
| LearningEntry | userId、title、content（Markdown 字串）、categoryId、images、relatedGoalId?、learnedAt、createdAt、updatedAt |
| Goal | userId、title、description?、categoryId、targetValue、currentValue、unit、startDate、targetDate、status、createdAt、updatedAt |
| GoalUpdate | userId、goalId、progressDelta、note?、learningEntryId?、createdAt |

### 對原 prompt 嘅具體調整／約定

1. **Folder 結構保留 feature-based，但只建立用得到嘅檔案。** Auth 都當 feature；暫時唔需要空嘅 settings 或 utils 資料夾。
2. **App 用 `Date`，Firestore 用 `Timestamp`。** Service 負責轉換，createdAt／updatedAt 用 server timestamp；未有 server timestamp 時 UI 要有處理。可選欄位冇值就省略，唔直接寫 `undefined`。
3. **日期規則先定清楚。** v0.1 暫以使用者裝置本地時區計日、一星期由星期一開始；date input 喺本地日期轉換，避免 `YYYY-MM-DD` 被當 UTC 而移日。跨時區設定留待有需要先加。
4. **Goal 進度唔可以直接 edit currentValue。** 每次更新用 transaction 同時新增 history 同更新 currentValue；Security Rules 要驗證兩者配對同增量一致。必要嘅內部配對欄位會喺該步先解釋。
5. **Learning Entry 同 Goal 關聯唔代表自動加進度。** 一筆記錄可能包含多題，進度要明確輸入；改／刪 learning entry 唔會暗中改 goal history。
6. **Goal 狀態集中處理。** 初始值 0；新增進度後未達標為 in_progress、達標為 completed。暫停／恢復係明確操作；暫停時不可新增進度。v0.1 只加正數進度，未加入更正／刪除歷史功能。
7. **避免孤兒資料。** Category v0.1 只需要新增／列表，唔做刪除；Goal 刪除必須處理 updates 同 learning entry 關聯，唔可以只刪 parent document。
8. **Goal 有進度後鎖定計量單位同 targetValue。** 第一版仍可編輯標題、描述、分類、日期；避免改目標定義令舊紀錄失去意思。要重新定義目標就新增 Goal。
9. **Dashboard 先用簡單計算。** 統計範圍必須完整，唔可以用「最近幾筆」當全量計 streak。資料量大時先加入彙總設計。
10. **圖片用 Cloudinary（2026-09-27 使用者要求）。** 加入 v0.1，先完成文字 CRUD，再分步做多圖選擇、預覽、上傳、顯示同刪除；唔用 Firebase Storage。`imageUrls` 改成 `images: { publicId: string; url: string }[]`，未做圖片前用空陣列。保留 publicId 方便管理／刪除 Cloudinary 資產；圖片本體放 Cloudinary，Firestore 只存圖片資料。
11. **唔記錄學習時長（2026-09-27 使用者確認）。** 移除時長欄位、表單輸入、相關驗證及時長統計。保留學習日期、系統 timestamps 同按學習日期計算嘅 streak。Dashboard 只顯示最近記錄、active goals／進度同 streak。
12. **學習內容支援貼 code。** `content` 仍係一個字串，以 Markdown 儲存文字同 fenced code blocks（三個反引號，可標語言）；輸入時保留縮排／換行，顯示時用 code block。先用 textarea 同預覽，唔做完整 rich-text editor、code 執行或語法高亮。圖片先作為該筆記錄嘅附件，唔要求手動貼圖片 URL 或放入 Markdown。
13. **Cloudinary 安全同資料一致性。** API secret 只放 server；上傳簽名同刪除 API 驗證登入者、資產所有權同允許參數，限制圖片格式／大小／數量。Cloudinary 同 Firestore 冇共用 transaction，必須處理部分失敗、取消編輯同重試清理。簽名上傳唔代表圖片讀取私人：Task 21a 先確認圖片可見性；如需私人圖片，用 authenticated delivery 並按需產生存取 URL，唔將會過期 URL 當永久資料保存。

Cloudinary 參考：[Client-side uploading](https://cloudinary.com/documentation/client_side_uploading)、[Media access control](https://cloudinary.com/documentation/control_access_to_media)。

以下每一項都係一次獨立教學／實作；完成狀態以各項標記為準。

## Phase 0 — 理解設計

- [x] Task 00 — complete：檢查現有目錄，整理逐步計劃。
  - 完成日期：2026-09-27。
  - 改動：只新增 `task.md`。
  - 驗收：已讀原 prompt、檢查現有檔案；未建立 app 或安裝套件。

- [ ] Task 01 — 一齊行一次資料流程。
  - 做：用「新增一筆 LeetCode 學習記錄」說明 page、form、schema、service、Rules；確認上面資料模型同簡化約定。
  - 檔案：只按討論修訂 `task.md`。
  - 驗收：你能指出驗證、寫入、顯示各自喺邊一層，理解後先開始 foundation。
  - 進度：已提供 LeetCode 記錄嘅分層講解；理解問題未回覆，暫未標記 complete。使用者已明確要求開始 Task 02，按要求繼續，唔以答題作為阻擋。
  - 本步改動：只更新 `task.md`，未建立 application code。
  - 已確認需求：唔記錄時長；content 支援貼 code；圖片上傳 Cloudinary。Code 同圖片留到各自小步實作，Task 01 仍等待資料流程理解確認。
  - 教學例子：輸入「Two Sum」、學習內容、分類 ID、學習日期 → Form 收集 → Zod 驗證 → learning service 加登入者 UID／系統時間並轉換日期 → Firestore Rules 檢查 → 儲存 → UI 顯示成功；列表經 service 讀取後顯示。
  - 核心分工：page 組合畫面；form 處理輸入同提示；schema 定義有效輸入；service 封裝資料存取；Rules 保護資料庫；type 描述開發時資料形狀。
  - 注意：service 喺 v0.1 仍然喺瀏覽器執行，唔係可信任後端；userId／時間由 service 加入只係責任分工，安全限制仍須由 Rules 強制執行。
  - 理解問題：① 標題留空應由邊層驗證、邊層顯示錯誤？繞過表單後邊層仍要阻止非法寫入？② 想改記錄卡片嘅顯示同想改 Firestore 儲存方式，分別主要改邊層？

## Phase 1 — 專案基礎

- [x] Task 02 — complete：建立最小 Next.js 專案。
  - 做：確認 Node／套件管理器，建立 App Router、TypeScript、Tailwind、ESLint；保留現有 skills 同 task.md。
  - 重點檔案：`package.json`、lockfile、`tsconfig.json`、`src/app/layout.tsx`、`src/app/page.tsx`、`src/app/globals.css`。
  - 驗收：本機首頁開到；解釋 dev、build、lint 指令用途。
  - 完成日期：2026-09-27。
  - 環境／版本：Node 24.19.0、npm 11.17.0；Next.js 16.3.6、React 19.3.0、TypeScript 6.0.3、Tailwind CSS 4.3.3；用 npm lockfile 固定實際依賴。
  - 實際檔案：新增 `package.json`、`package-lock.json`、`tsconfig.json`、`eslint.config.mjs`、`postcss.config.mjs`、`src/app/layout.tsx`、`src/app/page.tsx`、`src/app/globals.css`；更新 `.gitignore` 同 `task.md`。`next-env.d.ts`／`.next` 由 Next.js 生成並忽略提交。
  - Next.js 開發伺服器另外自動生成 `AGENTS.md` 同 `CLAUDE.md`，提示 coding agent 先讀本機對應版本文件；已保留，唔影響 application 執行。
  - 驗收結果：lint 無警告、TypeScript 檢查通過、production build 通過；本機首頁 HTTP 200，回應包含預期標題同 Tailwind classes。
  - 相容性限制：ESLint 10.11.0 與現用 eslint-plugin-react 實測不相容（getFilename 錯誤），暫用 ESLint 9.39.5。npm 已提示 ESLint 9 停止支援；待 Next.js lint 依賴相容後升級，唔為避錯而關閉規則。
  - 指令：`npm run dev` 啟動開發；`npm run build` 建立正式版本；`npm start` 執行已 build 版本；`npm run lint` 檢查程式規則；`npm run typecheck` 檢查 TypeScript。
  - 教學重點：Next.js 用 `layout.tsx` 包住 `page.tsx`；layout import 全域 CSS；PostCSS 處理 Tailwind；`package.json` 定義指令／依賴，lockfile 固定安裝結果。
  - 理解問題：① 想改首頁標題應改邊個檔案？② `npm run dev` 同 `npm run build` 有咩分別？
  - 下一步：停喺 Task 02 講解，等使用者要求先開始 Task 03。

- [x] Task 03 — complete：用兩個頁面學 routing。
  - 做：建立 login 同 dashboard 最小頁面，用 Link 連接；解釋 layout、page、route group。
  - 檔案：`src/app/(auth)/login/page.tsx`、`src/app/(app)/dashboard/page.tsx`。
  - 驗收：兩個 URL 可直接開啟；你分得清 URL 同資料夾路徑。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `src/app/(auth)/login/page.tsx`、`src/app/(app)/dashboard/page.tsx`；更新 `src/app/page.tsx` 加登入頁入口，同更新本文件。共用現有 root layout，冇新增套件。
  - 驗收結果：lint、TypeScript、production build 通過；`/`、`/login`、`/dashboard` 均 HTTP 200，內容同連結正確；瀏覽器確認首頁可前往 login，再前往 dashboard。
  - 教學重點：`page.tsx` 定義頁面；`layout.tsx` 包住頁面；`(auth)`／`(app)` 只係 route group，唔進入 URL、唔會自動提供登入保護；`Link` 嘅 href 指向 URL。
  - 理解問題：① `(auth)/login/page.tsx` 對應 `/login` 定 `/auth/login`？② `Link href="/dashboard"` 嘅 href 應寫 URL 定檔案路徑？
  - 下一步：等使用者理解後再做 Task 04。

- [x] Task 04 — complete：初始化 shadcn/ui。
  - 做：只加入 Button，用現有 Tailwind 做基本樣式；講解生成嘅程式碼。
  - 檔案：`components.json`、必要 CSS／utility、`src/components/ui/button.tsx`、示範頁。
  - 驗收：按鈕正常显示，鍵盤 focus 清楚；冇安裝未使用元件。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `components.json`、`src/lib/utils.ts`、`src/components/ui/button.tsx`；更新 `src/app/globals.css`、`src/app/page.tsx`、`package.json`、lockfile 同本文件。
  - 設定：採用 Radix UI + Nova、neutral theme、CSS variables、React Server Components；只加入 Button，冇加入其他 UI components。
  - 實作：首頁保留 Next.js `Link`，用 `<Button asChild>` 將 Button 樣式交俾連結；冇加入 click handler 或 `use client`。
  - 驗收結果：lint、TypeScript、production build 通過；瀏覽器確認 Button 正常顯示，Tab 鍵有清楚 focus ring，Enter 可前往 `/login`；npm audit 0 vulnerabilities。
  - 工具備註：shadcn CLI 暫時未能自動辨認呢個手動建立嘅 Next.js 16 專案，所以按官方 manual installation 初始化，再由 CLI 生成 Button source。
  - 教學重點：`components.json` 俾 CLI 知道生成位置／風格；`globals.css` 提供 theme tokens；`button.tsx` 定義 variants；`asChild` 避免產生 button 包住 link 嘅錯誤 HTML。
  - 理解問題：① 點解導航仍然要用 `Link`，唔係只用 `<Button>`？② 想將按鈕改成 outline，應該傳入咩 prop？
  - 下一步：等使用者理解後再做 Task 05。

## Phase 2 — Firebase 同登入

- [x] Task 05 — complete：建立 Firebase 開發環境。
  - 做：逐步設定 project、Web App、Google provider、Firestore；解釋 region、authorized domains 同環境變數。
  - 檔案：`.env.example`、本機 `.env.local`、`.gitignore`。
  - 驗收：必要設定齊全；本機環境檔唔會提交；未用寬鬆公開 Rules。
  - 進度：已建立 `.env.example`；使用者已填好 `.env.local` 四個必要值，並確認該檔案被 Git 忽略。Authentication service 已啟用，公開設定檢查 HTTP 200；`localhost` 同 Firebase auth domain 均已授權。Google provider 已啟用，未使用嘅 Email/Password provider 已由使用者停用。
  - 預設決定：project display name 用 `Progress Tracker`；唔開 Google Analytics、Firebase Hosting 或 Storage；Firestore 用 `(default)`、Native／Standard、Production mode，region 用 `asia-east2`（Hong Kong）。建立前如 Console 顯示收費或其他不可預期選項，先停低處理。
  - 環境變數：只保留 Task 06 初始化 Auth／Firestore 需要嘅 Web App config；全部加 `NEXT_PUBLIC_`，代表會進入 browser bundle，唔可以放真正秘密。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `.env.example`；使用者建立本機 `.env.local`；更新 `.gitignore` 同本文件。Firebase Console 設定唔會產生 repository 檔案。
  - Firebase 設定：Web App config 已加入本機環境；Authentication 只啟用 Google provider；`localhost` 同 Firebase auth domain 已授權。
  - Firestore 設定：建立 `(default)` Standard database，region 為 `asia-east2`（Hong Kong），使用 Production mode；冇啟用付費 Scheduled backups。
  - 驗收結果：Firebase Authentication 公開設定檢查 HTTP 200；`.env.local` 已被 Git 忽略；Firestore Console 顯示 database ready；Production mode 預設拒絕第三方讀寫，冇使用 Test mode 公開 Rules。
  - 教學重點：`NEXT_PUBLIC_` Firebase Web App config 會送到瀏覽器，係 project 識別設定而唔係 server secret；authorized domains 控制可發起登入嘅網域；Firestore region 建立後不能更改，應揀近主要使用者嘅地區。
  - 理解問題：① 點解 `.env.local` 唔應該提交，但 Firebase Web App config 又唔算真正秘密？② 點解我哋揀 Production mode，而唔用較方便嘅 Test mode？
  - 理解確認：Firebase Web App config 係前端連接 Firebase project 嘅識別資料，瀏覽器使用時本身就會看得到；真正安全界線係 Authentication 同 Firestore Security Rules。`.env.local` 仍然唔提交，因為它屬於個別環境設定，亦避免日後意外混入真正秘密。Production mode 由拒絕所有讀寫開始，再逐步加入所需 Rules；Test mode 初始會暫時開放資料庫，容易意外暴露資料。使用者已理解。
  - 下一步：等使用者理解後再做 Task 06。

- [x] Task 06 — complete：Firebase 初始化。
  - 做：安裝 Firebase SDK，只初始化一次並 export Auth／Firestore；解釋 client config 同真正秘密嘅分別。
  - 檔案：`src/lib/firebase/client.ts`。
  - 驗收：開發 hot reload 冇重複初始化錯誤，設定缺失時有清楚提示。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `src/lib/firebase/client.ts`；更新 `package.json`、`package-lock.json` 同本文件。
  - 依賴：安裝 Firebase JavaScript SDK 12.19.0，使用 modular API；只 import App、Authentication 同 Firestore。
  - 實作：從四個 `NEXT_PUBLIC_` 環境變數建立 config；缺少值時指出確實變數名稱；用 `getApps()`／`getApp()` 避免 hot reload 重複初始化；export `auth` 同 `db`。
  - 驗收結果：正常 config 成功取得 Auth／Firestore；強制重複執行初始化通過，冇 `duplicate-app`；缺少 API key 時顯示預期錯誤；lint、TypeScript、production build 通過；npm audit 0 vulnerabilities。
  - 教學重點：Firebase app 係共用設定容器；`auth` 同 `db` 係個別服務入口；modular imports 俾 bundler 移除未用 Firebase 功能。真正 server secret 唔可以加 `NEXT_PUBLIC_` 或放入呢個 client module。
  - 理解問題：① 點解唔直接每次都呼叫 `initializeApp(firebaseConfig)`？② 之後登入功能同 Firestore service 應該分別 import 邊個 export？
  - 理解確認：hot reload 可能重新執行 module，而原有 Firebase app 仍然存在；先用 `getApps()` 檢查並用 `getApp()` 重用，可避免重複初始化／`duplicate-app`。Google 登入使用 `auth`，Firestore 資料操作使用 `db`。使用者已理解。
  - 下一步：等使用者理解後再做 Task 07。

- [x] Task 07 — complete：Google 登入同登出。
  - 做：Auth service 封裝登入／登出，login page 加按鈕、loading 同錯誤訊息。
  - 檔案：`features/auth/services/auth.service.ts`、login page／登入元件。
  - 驗收：可登入、登出；取消 popup 後可以重試，唔會一直 loading。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `src/features/auth/services/auth.service.ts`、`src/features/auth/components/sign-in-button.tsx`、`src/features/auth/components/sign-out-button.tsx`；更新 login／dashboard pages 同本文件。
  - 實作：service 封裝 `signInWithPopup()` 同 `signOut()`；互動按鈕用細小 Client Components 處理 loading、disabled、錯誤提示及成功後 `router.replace()`，pages 保持 Server Components。
  - 自動驗收：lint、TypeScript、production build 通過；本機 `/login` 正常顯示 Google 登入按鈕。
  - 手動驗收：Google 登入成功，Firebase Authentication Users 顯示帳戶同獨立 User UID；登入後到 `/dashboard`；登出成功並返回 `/login`；關閉 Google popup 後顯示取消提示，按鈕恢復可按並可重試。
  - 教學重點：`auth.service.ts` 集中 Firebase Auth 操作；Client Component 先可以使用 state、click handler 同 `useRouter()`；`finally` 無論成功或失敗都會清除 loading；Firebase Authentication 負責身份，之後 Firestore Rules 先負責資料隔離。
  - 理解問題：① 點解 login page 本身唔需要加 `"use client"`，只係登入按鈕需要？② 點解清除 loading 要放喺 `finally`，唔只放喺 `catch`？
  - 理解確認：Next.js page 預設係 Server Component，可喺 server 執行 JavaScript 同組合 HTML，但唔可以直接使用 browser interactivity、state hooks 或 event handlers；只有需要 `useState`、`onClick`、Google popup 同 `useRouter` 嘅按鈕要做 Client Component。`finally` 無論登入成功、失敗或取消都會執行，適合統一將 loading 回復為 `false`。使用者已理解。
  - 下一步：等使用者理解後再做 Task 08。

- [x] Task 08 — complete：共用登入狀態。
  - 做：加入最小 Auth provider，訂閱登入狀態並清理 listener；講解 Context 同初始 loading。
  - 檔案：`features/auth/components/`、相應 layout。
  - 驗收：refresh 後恢復登入狀態；未判定前唔閃出私人內容。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `src/features/auth/components/auth-provider.tsx`、`src/features/auth/components/auth-status.tsx`；更新 root layout、dashboard page 同本文件。
  - 實作：root layout 用 `AuthProvider` 包住 children；provider 以單一 `onAuthStateChanged()` listener 保存 `user`／`isLoading`，並將 unsubscribe function 交俾 `useEffect()` cleanup；`useAuth()` 提供共用狀態。Dashboard 未判定時顯示 loading，判定後先顯示未登入或帳戶資料。
  - 自動驗收：lint、TypeScript、production build 通過；已登出時開啟 Dashboard 正確顯示「目前未登入」。
  - 手動驗收：登入後 Dashboard 顯示目前帳戶；refresh 後 Firebase session 成功恢復，仍顯示同一帳戶；私人帳戶資料只喺 `isLoading` 結束後渲染。
  - 教學重點：Context 令多個 Client Components 共用同一份 auth state；`user === null` 同 `isLoading === true` 意思唔同；Effect cleanup 防止 component 重建時殘留 listener 或重複回調。
  - 理解問題：① 點解初始狀態唔可以只用 `user = null`，仲需要獨立 `isLoading`？② `useEffect()` 點解要 return Firebase 提供嘅 unsubscribe function？
  - 理解確認：`user = null`、`isLoading = true` 只代表 Firebase 仲未檢查完登入 session，唔代表已確定登出；`useState` 保存 component 狀態，Context 將狀態提供俾下面 components，`useContext`／`useAuth()` 負責讀取。listener cleanup 會喺 provider 移除時停止訂閱，避免殘留或重複 callback。使用者已理解核心資料流。
  - 下一步：等使用者理解後再做 Task 09。

- [x] Task 09 — complete：私人頁面入口保護。
  - 做：`(app)/layout.tsx` 處理登入中／未登入／已登入；未登入導向 login。
  - 驗收：直接輸入 dashboard URL 都要登入；講清楚呢層只係 UI，資料保護靠 Rules。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `src/app/(app)/layout.tsx`；更新本文件。
  - 實作：共用 `(app)` layout 讀取 `useAuth()`；loading 或未登入時唔 render `children`，未登入確認後用 `router.replace("/login")`，已登入先顯示私人頁面。
  - 自動驗收：lint、TypeScript、production build 通過；已登出時直接開 `/dashboard` 冇顯示 Dashboard 內容並自動返回 `/login`。
  - 手動驗收：Google 登入後可正常進入 `/dashboard`；refresh 後仍留喺 `/dashboard`，冇錯誤導向 login。
  - 安全界線：呢個 layout 只阻止未登入者經正常 UI 睇私人頁面，唔係資料庫授權；瀏覽器程式可以被繞過，Firestore 讀寫仍須由 Task 10 Security Rules 驗證。
  - 教學重點：route group layout 可以一次保護所有 `(app)` pages；redirect 係 browser side effect，所以放入 `useEffect()`；未確認身份前唔 render `children`，避免私人內容閃現。
  - 理解問題：① 點解 `isLoading` 時唔可以先 render Dashboard？② 點解有咗 layout redirect，仍然必須寫 Firestore Security Rules？
  - 理解確認：`isLoading` 代表 Firebase 仲檢查緊 auth session，未可以顯示私人頁面；layout redirect 只係可被繞過嘅 browser UI。UID 唔係秘密，攻擊者可以自行組合另一個 UID 嘅 Firestore 路徑；Security Rules 必須喺 Firebase server 比較 `request.auth.uid` 同路徑 uid，真正拒絕未授權讀寫。使用者已理解。
  - 下一步：等使用者理解後再做 Task 10。

- [x] Task 10 — complete：Security Rules 基礎同 Emulator。
  - 做：建立 deny-by-default 規則同最小可執行測試；後續每個 collection 同寫入功能一起開放。
  - 檔案：`firestore.rules`、`firebase.json`、最小 rules 測試檔同必要設定。
  - 驗收：未登入同未開放 collection 嘅讀寫均被拒絕；之後每階段測本人、另一個帳戶、非法資料。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `firestore.rules`、`firebase.json`、`tests/firestore.rules.test.mjs`；更新 `package.json`、`package-lock.json` 同本文件。
  - 依賴／指令：加入開發依賴 Firebase CLI 15.31.0 同 `@firebase/rules-unit-testing` 5.0.2；`npm run test:rules` 用 `emulators:exec` 自動啟動／停止 Firestore Emulator。
  - 實作：Rules version 2 以 recursive match 預設拒絕全部 read／write；測試使用 `demo-progress-tracker`，避免連接正式 project；分別模擬未登入同已登入 `alice`，兩者對未開放 learning entry 路徑嘅讀寫都必須失敗。
  - 驗收結果：rules suite 2 tests、4 個拒絕 request 全部通過；lint、TypeScript、production build 通過；production dependencies audit 0 vulnerabilities。Firebase CLI 開發依賴目前有 5 個 moderate transitive advisories，npm 建議嘅修復會降級 CLI，因此未套用破壞性 `--force` 修復。
  - 部署狀態：今步只驗證本機 `firestore.rules`；正式 Firestore 已沿用 Console 建立時嘅 Production mode deny-all。repository rules 要到部署步驟先發佈，唔會因新增檔案自動同步。
  - 教學重點：deny-by-default 代表未明確開放就拒絕；emulator 提供安全、可重複嘅本機測試；`authenticatedContext()` 只模擬身份，唔會自動獲得權限；`assertFails()` 證明 request 被 Rules 拒絕。
  - 理解問題：① 點解測試使用 `demo-` project ID，而唔直接連正式 Firebase project？② 點解已登入嘅 `alice` 目前仍然讀寫失敗？
  - 下一步：等使用者理解後再做 Task 11。

## Phase 3 — App shell

- [x] Task 11 — complete：導覽同共用版面。
  - 做：sidebar／窄畫面導覽、主內容區、登出按鈕；功能未做好嘅頁面只放清楚 placeholder。
  - 檔案：`components/layout/`、`(app)/layout.tsx`、必要 page。
  - 驗收：Dashboard、Categories、Learning、Goals 可切換；手機可用，鍵盤可操作。
  - 進度：已建立 responsive 共用 app shell；桌面係左側導覽，窄畫面係可橫向捲動嘅頂部導覽。加入 Dashboard、分類、學習記錄、目標四個連結、目前頁標示、共用登出按鈕同三個 placeholder pages。
  - 實際改動：新增 `src/components/layout/app-navigation.tsx`、categories／learning／goals pages；更新 `(app)/layout.tsx`、dashboard page 同登出按鈕間距。
  - 自動驗收：lint、TypeScript、production build 通過；build 成功產生 `/dashboard`、`/categories`、`/learning`、`/goals`；未登入時仍正確返回 `/login`。
  - 完成日期：2026-09-27。
  - 手動驗收：登入後四個頁面可切換；窄畫面導覽可使用；可用 Tab／Enter 操作連結同登出按鈕。
  - 教學重點：route group 名稱唔會加入 URL，但資料夾層級會決定 layout 包裹範圍；`(app)/layout.tsx` 保留共用導覽，導航時由 `children` 換入目前 page；平排嘅 `(auth)` 唔會使用 `(app)/layout.tsx`。
  - 理解確認：使用者知道 `AppNavigation` 由 `(app)/layout.tsx` 共用，導航時主要替換 `children`；亦理解 root layout 影響所有頁面，而 route-group layout 只影響自己資料夾下面嘅 routes。
  - 下一步：等使用者明確要求先開始 Task 12。

## Phase 4 — Categories

- [x] Task 12 — complete：Category 型別同驗證。
  - 做：加入 Category type／Zod schema；安裝表單所需依賴，解釋型別同 runtime validation 嘅分別。
  - 檔案：`features/categories/types/category.types.ts`、`schemas/category.schema.ts`。
  - 驗收：空白名稱被拒絕，合法名稱通過最小檢查；分類唔 hardcode。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `src/features/categories/types/category.types.ts`、`src/features/categories/schemas/category.schema.ts`、`tests/category.schema.test.mts`；更新 `package.json`、lockfile、`tsconfig.json` 同本文件。
  - 依賴：加入 Zod 4.6.5、React Hook Form 7.89.0、`@hookform/resolvers` 5.9.1；後兩者留到 Task 14 表單先使用，冇提前建立表單抽象。
  - 實作：`Category` interface 描述 app 使用嘅分類資料；`categorySchema` 喺 runtime 將名稱 trim，拒絕空白同超過 50 字元，圖示為可選並限制 10 字元；`CategoryInput` 直接由 schema 推斷，避免再寫一份可能不同步嘅型別。冇 hardcode 分類選項。
  - 驗收結果：schema suite 3 tests 通過，證明空白名稱被拒絕、合法名稱被 trim 後接受、超長圖示被拒絕；合法名稱測試冇提供 icon，亦證明 icon 可以省略。原有 Firestore rules 2 tests 通過；lint、TypeScript、production build 通過；production dependencies audit 0 vulnerabilities。Firebase CLI 開發依賴仍有原有 5 個 moderate transitive advisories。
  - 編輯器修正：`tsconfig.json` 明確加入 Node types 同 `**/*.mts`，確保 CLI 同編輯器都會 type-check Node test 檔案；修正後 typecheck、schema tests 同 lint 再次通過。
  - 教學重點：TypeScript 只喺開發／編譯時檢查程式碼，執行時會被移除；Zod schema 會喺 app 執行時檢查外來資料。`z.infer` 可由 schema 產生輸入型別，令 runtime 規則同 TypeScript 型別保持一致。
  - 理解問題：① 如果使用者提交 `{ name: "   " }`，TypeScript 點解未必會阻止，但 Zod 可以阻止？② `Category` 同 `CategoryInput` 分別代表已儲存資料同表單輸入，邊個會有 `id`、`userId`、`createdAt`？
  - 下一步：等使用者理解後再做 Task 13。

- [x] Task 13 — complete：Category service 同 Rules。
  - 做：`createCategory()`、`getCategories()`；驗證 userId、欄位同本人存取，設定 server timestamp。
  - 檔案：`features/categories/services/category.service.ts`、Rules 同測試。
  - 驗收：本人可新增／讀取；另一個帳戶同非法欄位被拒絕。
  - 完成日期：2026-09-27。
  - 實際檔案：新增 `src/features/categories/services/category.service.ts`；更新 `firestore.rules`、`tests/firestore.rules.test.mjs` 同本文件。
  - Service 實作：`createCategory()` 從 `auth.currentUser` 取得 UID、再次用 Zod parse 輸入、省略空 icon、用 `serverTimestamp()` 寫入本人 categories 路徑並回傳 document ID；`getCategories()` 只查目前使用者路徑，按 `createdAt` 由新到舊排列，將 Firestore `Timestamp` 轉成 app 使用嘅 `Date`。
  - Rules 實作：只有已登入且 `request.auth.uid` 等於路徑 `userId` 先可讀取；create 另外要求 `userId`／`name`／`createdAt` 必需、`icon` 可選、禁止額外欄位、驗證字串內容同長度，並要求 `createdAt == request.time`。update／delete 同其他 collections 繼續 deny by default。
  - 驗收結果：Firestore Rules 共 7 tests 通過；包括本人新增及 list、有／冇 icon、未登入、另一個帳戶、錯誤 owner、空白名稱、超長 icon、額外欄位、假 server time，以及未開放嘅 update／delete。Schema 3 tests、lint、TypeScript、production build 全部通過；production dependencies audit 0 vulnerabilities。
  - 部署狀態：今步仍只用 Emulator 驗證本機 rules，未發佈到正式 Firebase；正式 database 繼續沿用 deny-all，避免未有 UI 前改動線上權限。
  - 教學重點：service 負責方便同一致嘅資料操作，但 browser code 可以被繞過；Rules 用 `request.auth.uid`、路徑 UID 同 document `userId` 三者配對先係 server-side 權限。`serverTimestamp()` 由 Firebase 決定時間，Rules 用 `request.time` 阻止 client 偽造 `createdAt`。
  - 理解問題：① 點解 `createCategory()` 唔接受由 component 傳入嘅 `userId`？② Zod 已檢查 name，點解 Rules 仲要再檢查？③ `serverTimestamp()` 同瀏覽器 `new Date()` 邊個較適合 `createdAt`，點解？
  - 理解確認：使用者理解 service 從目前 auth user 取得 UID，而真正安全界線係 Rules 比較登入 token、路徑 UID 同 document userId；Zod 係可被繞過嘅前端 runtime validation，Rules 先係 Firebase server 授權；亦能分辨 `hasAll()` 要求必需欄位存在，而 `hasOnly()` 只禁止清單以外欄位，少咗清單內嘅可選欄位仍可通過。
  - 下一步：等使用者明確要求先做 Task 14。

- [x] Task 14 — complete：新增分類表單。
  - 做：React Hook Form + zodResolver + shadcn UI；submit 呼叫 service，顯示 inline error／提交結果。
  - 檔案：`features/categories/components/CategoryForm.tsx`、categories page。
  - 驗收：成功寫入；錯誤保留輸入；提交中避免重複按。
  - 進度：已建立 `CategoryForm`，使用 React Hook Form + zodResolver、shadcn Input／Button；name 同 icon 顯示 inline validation error，submit 時 disabled，成功後清空表單，Firebase 錯誤時保留輸入並顯示訊息。Categories page 保持 Server Component，只將互動表單設為 Client Component。
  - 實際改動：新增 `src/features/categories/components/category-form.tsx`、`src/components/ui/input.tsx`；更新 categories page 同本文件。
  - 自動驗收：schema 3 tests、lint、TypeScript、production build 通過；Firebase CLI 已登入，project ID 已設定。
  - 完成日期：2026-09-27。
  - 部署進度：使用者已批准發佈 Rules；加入並切換到 project-owner Firebase CLI 帳戶後，`firestore.rules` 編譯成功並已發佈到正式 `process-tracking-87407` Firestore。等待 `/categories` 手動驗收後先標記 complete。
  - 手動驗收：使用者已在 `/categories` 成功新增 `LeetCode`；Firebase Console 確認 document 有自動 ID、server `createdAt`、`name` 同登入者 `userId`。
  - 理解確認：使用者理解 page 冇互動可保持 Server Component，表單因 state／event／Firebase browser SDK 需要 Client Component；`zodResolver` 將 React Hook Form 輸入交俾 schema 並產生 field errors；`isSubmitting` disabled 防止重複 request；寫入失敗唔 reset，避免清走合法輸入，讓使用者可以重試。亦理解 schema 錯誤會在 `onSubmit` 前被 resolver 截停。
  - 下一步：等使用者明確要求先開始 Task 15。

- [x] Task 15 — complete：分類列表。
  - 做：顯示本人分類，新增後刷新列表，補 loading／empty／error。
  - 檔案：`features/categories/components/CategoryList.tsx`、categories page。
  - 驗收：refresh 後分類仍存在；完成 Categories 理解問題後先繼續。
  - 進度：已新增 `CategoryList`，mount 時呼叫 `getCategories()`，處理 loading／empty／error／列表四種畫面；以 document ID 做 React key，冇 icon 時顯示預設資料夾圖示。
  - 更新流程：新增 `CategoryManager` 保存 `listVersion`；`CategoryForm` 寫入成功後呼叫 `onCreated()`，版本加一令 `CategoryList` remount 並重新讀取，唔需要加入 React Query 或全域 store。
  - 實際改動：新增 `src/features/categories/components/category-list.tsx`、`category-manager.tsx`；更新 `category-form.tsx`、categories page 同本文件。
  - 自動驗收：schema 3 tests、lint、TypeScript、production build 通過。
  - 手動驗收：使用者確認現有分類可顯示、新增分類後列表即時更新，refresh 後分類仍然存在。
  - 理解確認：使用者理解 `onCreated()` 通知 parent 更新 `listVersion`；`key` 改變會移除舊 `CategoryList` 並建立新 instance，令 `useEffect(..., [])` 再執行；普通 prop 要放入 effect dependency array 先會因數值改變重新讀取；資料保存於 Firestore，唔係 React state。
  - 完成日期：2026-09-28。
  - 下一步：等使用者明確要求先開始 Task 16。

## Phase 5 — Learning Entry CRUD

- [x] Task 16 — complete：Learning Entry 型別同 schema。
  - 做：建立模型；驗證 title、content、categoryId、日期；先無圖片同 goal 選擇 UI。
  - 檔案：`features/learning/types/learning.types.ts`、`schemas/learning.schema.ts`。
  - 驗收：日期轉換、無效日期、空白文字、超長標題都有最小檢查。
  - 進度：已建立完整 `LearningEntry`／`LearningImage` 型別同輸入 schema；日期字串會轉成本地 `Date`，content 驗證空白但保留原本 Markdown／code 格式。
  - 實際改動：新增 learning types、schema 同 4 個 schema tests；`test:schema` 會執行全部 feature schema tests。
  - 自動驗收：全部 7 個 schema tests（其中 learning 4 個）、lint、TypeScript、production build 通過。
  - 理解確認：使用者理解 interface 只提供 TypeScript 靜態型別，唔會在 runtime 驗證或儲存資料；Zod schema 先會在 runtime 驗證輸入；HTML date input 提供字串，schema 將佢轉成本地 `Date`；JavaScript 月份由 0 開始。
  - 完成日期：2026-09-28。
  - 下一步：等使用者明確要求先開始 Task 17。

- [x] Task 17 — complete：新增記錄 service 同 Rules。
  - 做：`createLearningEntry()`；service 處理 userId、timestamps、空 images；Rules 檢查 category 屬於本人。
  - 檔案：`features/learning/services/learning.service.ts`、Rules 同測試。
  - 驗收：合法資料可寫入；跨帳戶、無效 category、空白標題被拒絕。
  - 進度：已加入 create service；schema 將日期字串轉成 `Date`，service 再轉 Firestore `Timestamp`，由登入狀態取得 userId，圖片暫存空陣列，建立／更新時間使用 server timestamp。
  - Rules：只開放本人 create；欄位、型別、標題／內容、空 images、server timestamps 都要合法，category document 必須存在於同一個使用者路徑；read／update／delete 暫未開放。
  - 自動驗收：Rules 11 tests（Learning Entry 4 個）、schema 7 tests、lint、TypeScript 同 production build 全部通過。
  - 部署：Rules 已編譯成功並發佈到正式 Firebase project `process-tracking-87407`。
  - 理解確認：使用者理解 service 從 Firebase Auth 取得 UID，唔信 component 傳入身份；`learnedAt` 係使用者選擇嘅學習日期，`createdAt`／`updatedAt` 係 server timestamps；Zod 改善前端輸入驗證，Rules 仍要防止繞過 UI 嘅直接請求；category `exists()` 只檢查同一使用者路徑。亦理解 `hasAll` 要求必要欄位但容許更多，`hasOnly` 禁止清單外欄位但可缺少，兩者合用先做到有齊而且冇多餘欄位。
  - 完成日期：2026-09-28。
  - 下一步：等使用者明確要求先開始 Task 18。

- [x] Task 18 — complete：新增記錄表單。
  - 做：LearningForm 輸入基本欄位，讀取分類選項；冇分類時引導先新增。
  - 檔案：`features/learning/components/LearningForm.tsx`、`learning/new/page.tsx`。
  - 驗收：填表到寫入成功行通；失敗保留內容，重複提交有保護。
  - 進度：已建立 `/learning/new` 同 LearningForm；載入本人分類，無分類時連去 `/categories`；表單包含標題、內容、分類、學習日期，日期預設今日。
  - 提交：React Hook Form + Zod 處理欄位錯誤；提交中 disabled，成功先清空並顯示訊息，失敗保留輸入。`/learning` 已加入新增入口。
  - 自動驗收：schema 7 tests、lint、TypeScript、production build 全部通過；`/learning/new` 本機回應 200。
  - 手動驗收：使用者已經由 `/learning/new` 成功建立 `Two Sum`；Firebase Console 確認 document 有 categoryId、content、空 images、learnedAt、createdAt、updatedAt、title 同登入者 userId。
  - 理解確認：使用者理解表單因 state、effect 同 submit interaction 需要 Client Component；分類在 mount 後載入一次；`isSubmitting` disabled 防止重複 request；失敗唔 reset 以保留輸入；categoryId 必填，所以冇分類時先引導建立分類。
  - 完成日期：2026-09-28。
  - 下一步：等使用者明確要求先開始 Task 19。

- [x] Task 19 — complete：讀取記錄列表。
  - 做：`getLearningEntries()`、日期排序、Card／List；按實際 query 加必要 index，同日記錄有穩定排序。
  - 檔案：learning service、`LearningCard.tsx`、`LearningList.tsx`、learning page。
  - 驗收：顯示標題、分類、日期；loading／empty／error 正常。
  - 進度：已加入本人記錄 query，按 `learnedAt desc`、`createdAt desc` 排序；LearningList 並行讀取記錄同分類，LearningCard 顯示標題、分類名稱同本地格式日期，並處理 loading／empty／error。
  - Rules／index：本人可讀自己 learningEntries，其他人不可讀；加入對應雙欄位 composite index，同日記錄按建立時間穩定排序。
  - 自動驗收：Rules 11 tests（包含本人 document／list read 成功、跨帳戶 read 失敗）、schema 7 tests、lint、TypeScript 同 production build 全部通過。
  - 部署：read Rules 同 composite index 已發佈到正式 Firebase project `process-tracking-87407`。
  - 手動驗收：index 狀態已變成 READY；使用者確認 `/learning` 顯示正式 Firestore 記錄 `Two Sum`、分類 `LeetCode` 同正確學習日期。
  - 理解確認：使用者理解 `learnedAt desc` 令較新學習日期排先，日期相同時由 `createdAt desc` 決定穩定次序；`Promise.all` 並行讀取記錄同分類；Map 用 categoryId 對照分類名稱；Firestore Timestamp 要轉 JavaScript Date；owner Rules 阻止 Bob 讀 Alice 路徑。
  - 完成日期：2026-09-29。
  - 下一步：等使用者明確要求先開始 Task 19a。

- [x] Task 19a — complete：學習內容支援文字同 code。
  - 做：textarea 保留貼上嘅縮排／換行；示範用三個反引號包住 code，加入安全 Markdown 預覽同記錄內容顯示。唔開放 raw HTML，限制連結協定；圖片只經附件功能顯示，唔自動載入 Markdown 外部圖片。
  - 檔案：LearningForm、learning 內容顯示元件、必要依賴。
  - 驗收：文字同多段 code 可共存，儲存／讀取／編輯後內容不變，長行可橫向捲動，HTML／script 唔會執行。
  - 進度：加入共用 MarkdownContent，LearningForm textarea 示範 fenced code 並即時預覽，LearningCard 顯示已儲存內容；code block 保留換行／縮排，長行可橫向捲動。
  - 安全：使用明確 element allowlist、`skipHtml`，只允許 HTTP(S) link；Markdown image 唔 render，圖片繼續只由附件功能處理。
  - 依賴／測試：加入 `react-markdown` 10.1.0；安全設定 tests 2/2、schema 7/7、Rules 11/11、lint、TypeScript、production build 全部通過；production dependencies audit 0 vulnerabilities。
  - 手動驗收：使用者確認預覽同正式列表都保留文字、code 換行／縮排及長行；raw script 同 Markdown 外部圖片冇 render；HTTPS link 正常，危險 protocol link 變普通文字；儲存／讀取後內容一致。
  - 理解確認：使用者理解單一 Markdown 字串可簡單保留文字、code 同順序；`useWatch` 只訂閱 content 最新值並觸發預覽 render，唔會寫 Firestore；`skipHtml` 忽略 raw HTML，element allowlist 限制 Markdown 產生嘅元素；HTTP(S) allowlist 防止危險 protocol；圖片之後只經 Cloudinary 附件功能加入。
  - 完成日期：2026-09-29。
  - 下一步：等使用者明確要求先開始 Task 20。

- [ ] Task 20 — 編輯記錄。
  - 做：`getLearningEntry()`、`updateLearningEntry()`，沿用表單；Rules 禁止改 userId／createdAt。
  - 檔案：learning service、LearningForm、`learning/[id]/edit/page.tsx`、Rules 同測試。
  - 驗收：預填、儲存、refresh 正常；不存在／非本人 ID 唔會顯示資料。

- [ ] Task 21 — 刪除記錄。
  - 做：`deleteLearningEntry()` 同確認 UI；成功先移除列表項目。
  - 檔案：learning service、刪除操作 UI、Rules 同測試。
  - 驗收：取消唔刪、確認先刪、失敗有提示；完成 Learning CRUD 理解問題。

## Phase 5b — Cloudinary 圖片（每項獨立做）

- [ ] Task 21a — 確認圖片存取方式同設定 Cloudinary。
  - 做：確認公開 URL 或私人圖片需求，解釋 Firestore Rules 唔會保護 Cloudinary URL；設定 Cloudinary、server 環境變數，同圖片格式／大小／數量限制。
  - 檔案：`.env.example`、本機環境設定、本文件。
  - 驗收：可見性方案已確認，秘密冇用 NEXT_PUBLIC 前綴，未上傳圖片。

- [ ] Task 21b — 選圖同本機預覽。
  - 做：LearningForm 支援多圖選擇、預覽、移除待上傳圖片；釋放預覽 object URL。
  - 檔案：learning 圖片輸入元件、LearningForm。
  - 驗收：選圖、取消、移除正常；不合規檔案有提示；呢步唔連 Cloudinary。

- [ ] Task 21c — Server 驗證身份同產生上傳簽名。
  - 做：建立 Firebase ID token 驗證、Cloudinary server 設定同簽名 Route Handler；server 控制 UID 資產路徑、允許參數及 upload 限制。
  - 檔案：`lib/firebase/admin.ts`、`lib/cloudinary/server.ts`、`app/api/learning-images/`、最小權限測試。
  - 驗收：未登入／偽造 token／他人路徑被拒；secret 唔進入 client bundle；伺服器端上傳限制有效。

- [ ] Task 21d — 上傳圖片同儲存關聯。
  - 做：前端取得簽名後上傳 Cloudinary；server 核實上傳結果及所有權，再將 publicId 同所需圖片資料連到記錄；同步更新 schema／Rules，避免繞過 API 偽造受保護圖片欄位。
  - 檔案：learning 圖片 service、必要 Route Handler、LearningForm、learning schema／types、Rules。
  - 驗收：多圖可儲存並於 refresh 後顯示；圖片內容唔寫入 Firestore；上傳／關聯失敗保留文字並有明確重試方式，唔顯示假成功。

- [ ] Task 21e — 編輯／刪除圖片同失敗清理。
  - 做：記錄顯示圖片，編輯可新增／移除；刪記錄時處理資產。Server 驗證所有權；定義可重試清理順序，避免先刪仍被有效記錄引用嘅圖片。
  - 檔案：learning 圖片顯示／編輯元件、圖片 service／API、記錄刪除流程。
  - 驗收：取消編輯、部分上傳失敗、Firestore 寫入失敗、Cloudinary 刪除失敗、重試均有處理；無法刪他人圖片；圖片可見性符合 Task 21a 決定。

## Phase 6 — Goal CRUD

- [ ] Task 22 — Goal 型別同 schema。
  - 做：Goal／GoalUpdate type、建立目標 schema；明確定義單位、正數目標、日期順序同狀態轉換。
  - 檔案：`features/goals/types/goal.types.ts`、`schemas/goal.schema.ts`。
  - 驗收：targetValue <= 0、結束早於開始等非法輸入被拒絕。

- [ ] Task 23 — 新增目標 service 同 Rules。
  - 做：`createGoal()`，currentValue 初始 0、status 為 not_started；檢查 category 所有權。
  - 檔案：`features/goals/services/goal.service.ts`、Rules 同測試。
  - 驗收：無法靠偽造輸入建立非零 currentValue 或他人目標。

- [ ] Task 24 — 新增目標表單。
  - 做：GoalForm，只收集使用者可編輯欄位；schema 管理驗證。
  - 檔案：`features/goals/components/GoalForm.tsx`、`goals/new/page.tsx`。
  - 驗收：建立「10 日完成 10 題」目標，資料同輸入一致。

- [ ] Task 25 — 目標列表同詳情。
  - 做：`getGoals()`、`getGoal()`；顯示進度、單位、日期、狀態。進度條最多 100%，文字保留真實數值。
  - 檔案：goal service、GoalCard／詳情元件、goals page、`goals/[id]/page.tsx`。
  - 驗收：0%、達標、超標顯示合理；不存在／無權限狀態有處理。

- [ ] Task 26 — 編輯／暫停／恢復目標。
  - 做：`updateGoal()` 同狀態操作；有進度後鎖定 targetValue／unit；一般編輯不可改 currentValue。
  - 檔案：goal service、GoalForm、edit page、Rules 同測試。
  - 驗收：合法編輯正常；直接提交非法進度／狀態被 Rules 拒絕。

- [ ] Task 27 — 刪除目標同關聯清理。
  - 做：先解釋 deletion policy；無 updates／learning 關聯先可刪。有關聯時 v0.1 顯示原因並禁止刪除，唔靜默 cascade。
  - 檔案：goal service、刪除 UI、必要關聯追蹤欄位、Rules 同測試。
  - 驗收：空目標可刪；有關聯目標不可刪；Rules 必須同步防止繞過 UI 刪除。若安全維護關聯需要拆步，先拆再實作。

## Phase 7 — Goal progress history

- [ ] Task 28 — 設計一筆進度更新。
  - 做：先用 +2 題示範 transaction、history、currentValue 同 Rules 配對；定義重試／重複點擊處理。
  - 檔案：先更新本文件嘅進度規則，必要時拆細下一步。
  - 驗收：你理解點解唔可以分開兩次普通寫入，亦理解 transaction 唔等於自動避免所有重複提交。

- [ ] Task 29 — 寫入進度 service 同一致性 Rules。
  - 做：`addGoalProgress()` 用 transaction 原子寫入 update 同新進度／狀態；history 不可直接修改。
  - 檔案：goal service、goal schema、Rules 同測試。
  - 驗收：並行 +2／+3 冇遺失；失敗唔只寫一半；只改 currentValue 或只新增 history 被拒；同一次操作重試唔重複計數。

- [ ] Task 30 — 進度表單同 timeline。
  - 做：GoalUpdateForm、`getGoalUpdates()`、GoalTimeline；顯示增量、備註、時間，成功後刷新。
  - 檔案：goal service、相關 components、goal detail page。
  - 驗收：提交 +2 後數值同 timeline 同步；暫停時不可新增；loading／error 完整。

- [ ] Task 31 — Learning Entry 關聯 Goal。
  - 做：LearningForm 加可選 goal；進度表單可選本人記錄。Service／Rules 驗證關聯，維護 Task 27 刪除保護。
  - 檔案：learning／goal form、schema、service、Rules 同測試。
  - 驗收：關聯／改關聯／取消關聯正常；他人／不存在目標被拒；刪記錄後 history 保留並顯示記錄已不存在。

## Phase 8 — Simple dashboard

- Task 32 — cancelled（2026-09-27）：按使用者要求取消時長統計，唔需要實作。保留編號，之後直接做 Task 33。

- [ ] Task 33 — 最近記錄同 active goals。
  - 做：重用現有 Card／services，顯示最近記錄、not_started／in_progress goals 同進度百分比。
  - 檔案：dashboard components／page、必要 service query。
  - 驗收：paused／completed 唔當 active；空資料有清楚提示。

- [ ] Task 34 — Learning streak。
  - 做：先定義「每日有至少一筆記錄」；今日未學時可由昨日開始算，未來記錄不計，同日去重。
  - 檔案：dashboard 日期計算、最小測試、streak 顯示。
  - 驗收：同日多筆、斷日、今日未學、跨月／跨年、空資料都有檢查；唔只用最近 N 筆估算。

- Task 35 — cancelled（2026-09-27）：按使用者要求取消各分類時長統計，唔需要實作。保留編號，之後直接做 Task 36。

## Phase 9 — 收尾同部署

- [ ] Task 36 — v0.1 整體驗收。
  - 做：由登入到分類、記錄 CRUD、code 顯示、Cloudinary 多圖、目標 CRUD、進度、dashboard 走一次；檢查 loading／empty／error、手機同鍵盤操作。
  - 檔案：只改發現問題涉及嘅檔案，記錄驗收結果。
  - 驗收：lint／TypeScript／build／現有測試通過；以兩個帳戶驗證隔離、登出後唔殘留前一個帳戶資料。

- [ ] Task 37 — Vercel 部署。
  - 做：確認部署帳戶／repo，設定 Firebase／Cloudinary server 環境變數、Firebase authorized domain，部署已驗證嘅 Rules／必要 indexes，再部署 app；驗證正式環境圖片流程。
  - 檔案：只加平台實際需要嘅設定；唔將秘密寫入 repo。
  - 驗收：正式網址登入同核心流程正常；若部署需要你登入／設定，完成先標記 complete。

- [ ] Task 38 — 寫低自己理解嘅架構。
  - 做：整理 README：啟動方式、環境變數名稱、資料流程、Rules、測試、已知限制。
  - 檔案：`README.md`、本文件。
  - 驗收：你可以跟 README 啟動，並指出新增一個欄位要改邊幾層；確認 v0.1 完成。

## v0.2 待辦（今輪唔做）

- 其他需求重新逐步規劃，唔自動開始。

v0.1 唔做：AI、RAG、推薦、通知、複雜圖表、gamification、heatmap、多人協作、Redux、複雜 caching、repository pattern、dependency injection、microservices。

## 下次由邊度開始

**Task 19a 已完成。** 未開始 Task 20；等使用者明確要求先開始。
