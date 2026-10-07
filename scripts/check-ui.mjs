import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Run with npm run test:ui. Only the demo project and local emulators are touched.
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
  "Start the Firebase emulators first.",
);
process.env.TZ = "Asia/Hong_Kong";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const config = {
  apiKey: "test-key",
  authDomain: "localhost",
  projectId: "demo-progress-tracker",
  appId: "1:123:web:ui-check",
};
const baseUrl = "http://localhost:3100";
const app = initializeApp({ projectId: config.projectId }, "ui-check");
const db = getFirestore(app);
const profile = await mkdtemp(join(tmpdir(), "progress-tracker-ui-"));
const output = resolve(".next/ui-checks");
await mkdir(output, { recursive: true });
let server;
let context;
let serverLog = "";
const errors = [];
const browserOptions = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};

async function createUser(email) {
  const response = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "emulator-only-password",
        returnSecureToken: true,
      }),
    },
  );
  assert.equal(response.status, 200);
  return (await response.json()).localId;
}

async function signIn(page, email) {
  await page.goto(`${baseUrl}/login`);
  await page.getByRole("button", { name: "使用 Google 登入" }).waitFor();
  await page.addScriptTag({
    path: resolve("node_modules/firebase/firebase-app-compat.js"),
  });
  await page.addScriptTag({
    path: resolve("node_modules/firebase/firebase-auth-compat.js"),
  });
  await page.evaluate(
    async ({ config, email }) => {
      const auth = window.firebase.initializeApp(config).auth();
      auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true });
      await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
      await auth.signInWithEmailAndPassword(email, "emulator-only-password");
    },
    { config, email },
  );
  await page.goto(baseUrl);
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { name: "最近學習" }).waitFor();
}

async function assertFits(page, width) {
  await page.setViewportSize({ width, height: 900 });
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth + 1,
  );
  if (!fits) {
    console.error(
      await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.width && (rect.right > innerWidth + 1 || rect.left < -1)
            );
          })
          .slice(0, 12)
          .map((element) => ({
            tag: element.tagName,
            class: element.className,
            text: element.textContent?.slice(0, 60),
            width: element.getBoundingClientRect().width,
          })),
      ),
    );
    await page.screenshot({
      animations: "disabled",
      path: join(output, "overflow.png"),
    });
  }
  assert.ok(fits, `Horizontal page overflow at ${width}px: ${page.url()}`);
}

try {
  const email = `alice-${Date.now()}@example.test`;
  const bobEmail = `bob-${Date.now()}@example.test`;
  const [uid, bobUid] = await Promise.all([
    createUser(email),
    createUser(bobEmail),
  ]);
  const owner = db.collection("users").doc(uid);
  const now = Timestamp.now();
  const batch = db.batch();
  for (let i = 0; i < 12; i++)
    batch.set(owner.collection("categories").doc(`category-${i}`), {
      userId: uid,
      name: i ? `學習方向 ${i}` : "英文與職業技能",
      icon: "📘",
      createdAt: now,
    });
  for (let i = 0; i < 35; i++)
    batch.set(owner.collection("goals").doc(`goal-${i}`), {
      userId: uid,
      title:
        i === 0
          ? "改善英文 speaking"
          : i === 1
            ? "成為冷氣師傅"
            : `練習目標 ${i}`,
      description: "將大方向拆成細步驟，練習、回顧，再繼續。",
      categoryId: "category-0",
      status:
        i % 5 === 0
          ? "in_progress"
          : i % 5 === 1
            ? "not_started"
            : i % 5 === 2
              ? "paused"
              : "completed",
      createdAt: now,
      updatedAt: now,
    });
  for (let i = 0; i < 20; i++)
    batch.set(
      owner
        .collection("goals")
        .doc("goal-0")
        .collection("subGoals")
        .doc(`step-${i}`),
      {
        userId: uid,
        goalId: "goal-0",
        title: `練習細步驟 ${i + 1}`,
        kind: "checklist",
        isCompleted: i < 6,
        createdAt: now,
        updatedAt: now,
      },
    );
  for (let i = 0; i < 24; i++)
    batch.set(owner.collection("learningEntries").doc(`entry-${i}`), {
      userId: uid,
      title: i ? `學習手記 ${i}` : "今日嘅英文練習",
      content: i
        ? "完成一次練習，記低唔熟嘅地方，再試一次。"
        : `長筆記與程式碼\n\n${"學習內容\n\n".repeat(100)}\n\n\`\`\`js\n${"const example = '" + "x".repeat(250) + "';"}\n\`\`\``,
      categoryId: "category-0",
      images: [],
      relatedGoalId: "goal-0",
      learnedAt: Timestamp.fromDate(
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate() - i,
        ),
      ),
      createdAt: now,
      updatedAt: now,
    });
  await batch.commit();
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--port", "3100", "--webpack"],
    {
      env: {
        ...process.env,
        NEXT_DIST_DIR: ".next/ui-tests",
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
        NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
        NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
        FIREBASE_ADMIN_CLIENT_EMAIL: "",
        FIREBASE_ADMIN_PRIVATE_KEY: "",
        CLOUDINARY_CLOUD_NAME: "",
        CLOUDINARY_API_KEY: "",
        CLOUDINARY_API_SECRET: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (chunk) => {
      serverLog = (serverLog + chunk).slice(-6000);
    });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      ready = (
        await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(1000) })
      ).ok;
    } catch {
      /* wait for dev server */
    }
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, "Test dev server did not start.");
  context = await chromium.launchPersistentContext(profile, {
    ...browserOptions,
    headless: true,
    ignoreDefaultArgs: ["--hide-scrollbars"],
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Asia/Hong_Kong",
  });
  let page = context.pages()[0];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page, email);
  await page
    .getByRole("link", { name: "改善英文 speaking", exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator('img[src="/brand/logo.svg"]')
      .evaluate((image) => image.complete && image.naturalWidth > 0),
    true,
  );
  assert.ok(
    await page
      .locator('link[rel="icon"]')
      .getAttribute("href")
      .then((href) => href.includes("/brand/logo.svg")),
  );
  await page.screenshot({
    animations: "disabled",
    path: join(output, "desktop.png"),
    fullPage: true,
  });
  for (const width of [320, 375, 768, 1440]) await assertFits(page, width);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    animations: "disabled",
    path: join(output, "mobile.png"),
  });
  await page.goto(`${baseUrl}/goals`);
  const goalsPanel = page.getByRole("region", {
    name: "大目標列表",
    exact: true,
  });
  await goalsPanel.waitFor();
  assert.ok(
    await goalsPanel.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  );
  await goalsPanel.focus();
  await page.keyboard.press("PageDown");
  await page.waitForFunction(
    () => document.querySelector('[aria-label="大目標列表"]')?.scrollTop > 0,
  );
  await assertFits(page, 320);
  await page.goto(`${baseUrl}/goals/goal-0`);
  await page.getByRole("region", { name: "細目標列表", exact: true }).waitFor();
  await assertFits(page, 320);
  await page.getByRole("button", { name: "暫停目標", exact: true }).click();
  await page.getByRole("button", { name: "恢復目標", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "恢復目標", exact: true }).click();
  await page.getByRole("button", { name: "完成目標", exact: true }).waitFor();
  await page.getByRole("button", { name: "完成目標", exact: true }).click();
  await page.getByText("你已確認完成呢個大目標。", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("你已確認完成呢個大目標。", { exact: true }).waitFor();
  assert.equal(
    (await owner.collection("goals").doc("goal-0").get()).data().status,
    "completed",
  );
  assert.equal(
    (
      await owner
        .collection("goals")
        .doc("goal-0")
        .collection("subGoals")
        .where("isCompleted", "==", true)
        .get()
    ).size,
    6,
  );
  await page.goto(`${baseUrl}/goals/new`);
  await page.getByLabel("標題", { exact: true }).waitFor();
  await assertFits(page, 320);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "goal-form-mobile.png"),
  });
  await page.goto(`${baseUrl}/learning`);
  const entriesPanel = page.getByRole("region", {
    name: "學習記錄列表",
    exact: true,
  });
  await entriesPanel.waitFor();
  assert.ok(
    await entriesPanel.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  );
  await assertFits(page, 320);
  await page.goto(`${baseUrl}/learning/new`);
  await page.getByLabel("標題", { exact: true }).waitFor();
  const codeInput = page.getByLabel("學習內容", { exact: true });
  const exampleCode = 'const message = "hello";\n' + "// long line ".repeat(80);
  await codeInput.fill(exampleCode);
  await codeInput.evaluate((element) =>
    element.setSelectionRange(0, element.value.length),
  );
  await page.getByRole("button", { name: "插入 code", exact: true }).click();
  assert.equal(await codeInput.inputValue(), "```js\n" + exampleCode + "\n```");
  await page.getByText("預覽學習內容", { exact: true }).click();
  assert.ok((await page.locator(".code-block .hljs-keyword").count()) > 0);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__copiedCode = value;
        },
      },
    });
  });
  await page.getByRole("button", { name: "複製程式碼", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "已複製" }).waitFor();
  assert.equal(
    await page.evaluate(() => window.__copiedCode),
    exampleCode + "\n",
  );
  await assertFits(page, 320);
  await page.getByLabel("標題", { exact: true }).fill("UI 驗收記錄");
  await page
    .getByLabel("學習內容", { exact: true })
    .fill("只寫入本機測試資料。");
  await page.getByLabel("分類", { exact: true }).selectOption("category-0");
  await page.getByLabel("關聯大目標（可選）").selectOption("goal-34");
  await owner.collection("goals").doc("goal-34").delete();
  await page.getByRole("button", { name: "新增學習記錄", exact: true }).click();
  await page
    .getByText("搵唔到本人嘅目標，請重新選擇。", { exact: true })
    .waitFor();
  assert.equal(await page.getByLabel("關聯大目標（可選）").isDisabled(), false);
  await page.getByLabel("關聯大目標（可選）").selectOption("goal-0");
  await page.getByRole("button", { name: "新增學習記錄", exact: true }).click();
  await page.getByText("學習記錄已新增。", { exact: true }).waitFor();
  const saved = await owner
    .collection("learningEntries")
    .where("title", "==", "UI 驗收記錄")
    .get();
  assert.equal(saved.size, 1);
  assert.equal(saved.docs[0].data().relatedGoalId, "goal-0");
  await page.goto(`${baseUrl}/learning/${saved.docs[0].id}/edit`);
  await page.getByLabel("關聯大目標（可選）").selectOption("");
  await page.getByRole("button", { name: "儲存修改", exact: true }).click();
  await page.waitForURL("**/learning");
  assert.equal(
    "relatedGoalId" in (await saved.docs[0].ref.get()).data(),
    false,
  );
  await page.goto(`${baseUrl}/categories`);
  await page.getByRole("region", { name: "分類列表" }).waitFor();
  await assertFits(page, 320);
  await page.getByLabel("名稱", { exact: true }).fill("圖示選擇測試");
  await page.getByRole("button", { name: "程式", exact: true }).click();
  assert.equal(
    await page.getByLabel("自訂 emoji", { exact: true }).inputValue(),
    "💻",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "程式", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "不使用圖示", exact: true }).click();
  assert.equal(
    await page.getByLabel("自訂 emoji", { exact: true }).inputValue(),
    "",
  );
  await page.getByRole("button", { name: "閱讀", exact: true }).click();
  await assertFits(page, 320);
  await page.getByRole("button", { name: "新增分類", exact: true }).click();
  await page.getByText("分類已新增。", { exact: true }).waitFor();
  const iconCategory = await owner
    .collection("categories")
    .where("name", "==", "圖示選擇測試")
    .get();
  assert.equal(iconCategory.docs[0].data().icon, "📚");
  assert.equal(
    await page.getByLabel("自訂 emoji", { exact: true }).inputValue(),
    "",
  );
  await iconCategory.docs[0].ref.delete();
  // Dialogs and deletion only affect the emulator fixtures created above.
  async function confirmClick(button, expectedText, accept = true) {
    await button.click();
    const dialog = page.getByRole("alertdialog");
    await dialog.waitFor();
    assert.ok((await dialog.textContent()).includes(expectedText));
    await assertFits(page, 320);
    if (accept)
      await dialog
        .getByRole("button", { name: "確認刪除", exact: true })
        .click();
    else {
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      await page.waitForFunction(
        (element) => element === document.activeElement,
        await button.elementHandle(),
      );
    }
  }
  await confirmClick(
    page.getByRole("button", { name: "刪除分類「學習方向 10」", exact: true }),
    "無法復原",
    false,
  );
  assert.equal(
    (await owner.collection("categories").doc("category-10").get()).exists,
    true,
  );
  await confirmClick(
    page.getByRole("button", { name: "刪除分類「學習方向 11」", exact: true }),
    "無法復原",
  );
  await page
    .getByRole("button", { name: "刪除分類「學習方向 11」", exact: true })
    .waitFor({ state: "detached" });
  assert.equal(
    (await owner.collection("categories").doc("category-11").get()).exists,
    false,
  );
  await confirmClick(
    page.getByRole("button", {
      name: "刪除分類「英文與職業技能」",
      exact: true,
    }),
    "無法復原",
  );
  await page
    .getByText("呢個分類仍有學習記錄或目標使用，請先將佢哋轉到其他分類。", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    (await owner.collection("categories").doc("category-0").get()).exists,
    true,
  );
  const parent = owner.collection("goals").doc("goal-0");
  const count = parent.collection("subGoals").doc("delete-count");
  await count.set({
    userId: uid,
    goalId: parent.id,
    title: "可刪除計量細目標",
    kind: "count",
    targetValue: 10,
    currentValue: 2,
    unit: "次",
    createdAt: now,
    updatedAt: now,
  });
  const history = count.collection("updates").doc("one");
  await history.set({
    userId: uid,
    goalId: parent.id,
    subGoalId: count.id,
    progressDelta: 2,
    previousValue: 0,
    currentValue: 2,
    createdAt: now,
  });
  await page.goto(`${baseUrl}/goals/goal-0`);
  await page
    .getByRole("button", {
      name: "刪除細目標「可刪除計量細目標」",
      exact: true,
    })
    .waitFor();
  await assertFits(page, 320);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    animations: "disabled",
    path: join(output, "goal-deletion.png"),
    fullPage: true,
  });
  await confirmClick(
    page.getByRole("button", {
      name: "刪除細目標「可刪除計量細目標」",
      exact: true,
    }),
    "進度歷史",
  );
  await page
    .getByRole("heading", { name: "可刪除計量細目標", exact: true })
    .waitFor({ state: "detached" });
  assert.equal((await history.get()).exists, false);
  assert.equal((await parent.get()).exists, true);
  await confirmClick(
    page.getByRole("button", {
      name: "刪除細目標「練習細步驟 1」",
      exact: true,
    }),
    "大目標及其他細目標會保留",
  );
  await page
    .getByRole("heading", { name: "練習細步驟 1", exact: true })
    .waitFor({ state: "detached" });
  assert.equal((await parent.collection("subGoals").get()).size, 19);
  await confirmClick(
    page.getByRole("button", { name: "刪除目標", exact: true }),
    "旗下所有細目標",
    false,
  );
  assert.equal((await parent.get()).exists, true);
  await confirmClick(
    page.getByRole("button", { name: "刪除目標", exact: true }),
    "學習記錄會保留",
  );
  await page.waitForURL("**/goals");
  assert.equal((await parent.get()).exists, false);
  assert.equal((await parent.collection("subGoals").get()).size, 0);
  const retainedNotes = await owner.collection("learningEntries").get();
  assert.equal(retainedNotes.size, 25);
  assert.ok(retainedNotes.docs.every((note) => !note.data().relatedGoalId));
  await context.close();
  context = await chromium.launchPersistentContext(profile, {
    ...browserOptions,
    headless: true,
    ignoreDefaultArgs: ["--hide-scrollbars"],
    timezoneId: "Asia/Hong_Kong",
  });
  page = context.pages()[0];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/", "/login"]) {
    await page.goto(`${baseUrl}${path}`);
    await page.waitForURL("**/dashboard");
    await page.getByRole("heading", { name: "最近學習" }).waitFor();
  }
  await page
    .getByRole("button", { name: "登出", exact: true })
    .filter({ visible: true })
    .click();
  await page.waitForURL("**/login");
  await page.getByRole("button", { name: "使用 Google 登入" }).waitFor();
  await page.screenshot({
    animations: "disabled",
    path: join(output, "login-brand.png"),
    fullPage: true,
  });
  await page.goto(`${baseUrl}/goals`);
  await page.waitForURL("**/login");
  await signIn(page, bobEmail);
  await page.getByText("仲未有學習記錄", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("今日嘅英文練習", { exact: true }).count(),
    0,
  );
  assert.equal(
    await db
      .collection("users")
      .doc(bobUid)
      .collection("learningEntries")
      .count()
      .get()
      .then((result) => result.data().count),
    0,
  );

  await page.goto(`${baseUrl}/goals`);
  await page.getByText("由一個小目標開始", { exact: true }).waitFor();
  await assertFits(page, 320);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "empty-goals-mobile.png"),
  });
  await page.goto(`${baseUrl}/learning`);
  await page.getByText("暫時未有學習記錄。", { exact: true }).waitFor();

  // break-ui fixtures enter through the same Firestore boundary as normal data, in the demo project only.
  const stressOwner = db.collection("users").doc(bobUid);
  const longTitle =
    "安排每週英文會話練習、複習冷氣維修知識，整理工作現場筆記並記錄每次遇到嘅問題。"
      .repeat(3)
      .slice(0, 100);
  const unbrokenTitle =
    "AdvancedAirConditioningMaintenanceAndPracticalEnglishStudyNotesForTheNextCertification"
      .repeat(2)
      .slice(0, 100);
  const longDescription = "每次練習後記低困難、解決方法同下一次需要改善嘅地方。"
    .repeat(100)
    .slice(0, 2000);
  const longCategory = "英文會話與專業冷氣安裝維修職業技能學習記錄及進修計劃"
    .repeat(3)
    .slice(0, 50);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const stressBatch = db.batch();
  for (let i = 0; i < 60; i++)
    stressBatch.set(
      stressOwner.collection("categories").doc(`stress-category-${i}`),
      {
        userId: bobUid,
        name: i === 0 ? longCategory : i === 1 ? "J" : `學習分類 ${i}`,
        ...(i % 2 ? {} : { icon: "👩🏽‍💻" }),
        createdAt: now,
      },
    );
  for (let i = 0; i < 125; i++)
    stressBatch.set(stressOwner.collection("goals").doc(`stress-goal-${i}`), {
      userId: bobUid,
      title:
        i === 0 ? longTitle : i === 1 ? unbrokenTitle : `壓力測試目標 ${i}`,
      ...(i % 3 ? {} : { description: longDescription }),
      categoryId: "stress-category-0",
      status:
        i === 0
          ? "in_progress"
          : i % 4 === 1
            ? "not_started"
            : i % 4 === 2
              ? "paused"
              : i % 4 === 3
                ? "completed"
                : "in_progress",
      ...(i % 3 === 0
        ? { targetDate: Timestamp.fromDate(yesterday) }
        : i % 3 === 1
          ? {
              startDate: Timestamp.fromDate(tomorrow),
              targetDate: Timestamp.fromDate(tomorrow),
            }
          : {}),
      createdAt: Timestamp.fromMillis(now.toMillis() - i * 1000),
      updatedAt: now,
    });
  stressBatch.set(
    stressOwner
      .collection("goals")
      .doc("stress-goal-0")
      .collection("subGoals")
      .doc("huge-count"),
    {
      userId: bobUid,
      goalId: "stress-goal-0",
      title: unbrokenTitle,
      description: longDescription,
      kind: "count",
      currentValue: 1234567.89,
      targetValue: 999999999,
      unit: "次完整練習與職業技能複習",
      createdAt: now,
      updatedAt: now,
    },
  );
  for (let i = 0; i < 110; i++)
    stressBatch.set(
      stressOwner
        .collection("goals")
        .doc("stress-goal-0")
        .collection("subGoals")
        .doc(`stress-step-${i}`),
      {
        userId: bobUid,
        goalId: "stress-goal-0",
        title: i === 0 ? longTitle : `練習步驟 ${i}`,
        kind: "checklist",
        isCompleted: i % 2 === 0,
        createdAt: now,
        updatedAt: now,
      },
    );
  const missingImageUrl =
    "https://res.cloudinary.com/demo/image/upload/ui-test-missing.png";
  stressBatch.set(
    stressOwner.collection("learningEntries").doc("stress-entry"),
    {
      userId: bobUid,
      title: longTitle,
      content: `${longDescription}\n\n${longDescription}\n\n\`\`\`js\nconst url = '${unbrokenTitle.repeat(5)}';\n\`\`\``,
      categoryId: "stress-category-0",
      images: [{ publicId: "ui-test-missing", url: missingImageUrl }],
      learnedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  );
  await stressBatch.commit();

  await page.goto(`${baseUrl}/goals`);
  await page.getByRole("region", { name: "大目標列表", exact: true }).waitFor();
  assert.equal(await page.locator("article").count(), 125);
  assert.ok((await page.getByText("已逾期 1 日", { exact: true }).count()) > 0);
  for (const width of [320, 375, 768, 1440]) await assertFits(page, width);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "goals-worst-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 568 });
  const nav = page.getByRole("navigation", { name: "主要導覽" });
  const navBox = await nav.boundingBox();
  assert.ok(
    navBox && Math.abs(navBox.y + navBox.height - 568) < 2,
    "Mobile navigation stays at the viewport bottom",
  );
  for (const link of await nav.getByRole("link").all())
    assert.ok((await link.boundingBox()).height >= 44);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "goals-worst-mobile.png"),
  });
  await page.getByRole("searchbox", { name: "搜尋目標…" }).fill("不存在嘅目標");
  await page.getByText("未有符合條件嘅目標", { exact: true }).waitFor();
  await page.getByRole("button", { name: "清除篩選", exact: true }).click();
  await page.getByRole("button", { name: /^已完成/ }).click();
  assert.equal(await page.locator("article").count(), 31);
  await page.getByRole("button", { name: /^全部/ }).click();
  await page
    .getByRole("searchbox", { name: "搜尋目標…" })
    .fill("壓力測試目標 4");
  await page
    .getByRole("button", { name: "完成目標「壓力測試目標 4」", exact: true })
    .click();
  await page
    .getByRole("button", { name: "完成目標「壓力測試目標 4」", exact: true })
    .waitFor({ state: "detached" });
  assert.equal(
    (await stressOwner.collection("goals").doc("stress-goal-4").get()).data()
      .status,
    "completed",
  );

  await page.goto(`${baseUrl}/goals/stress-goal-0`);
  await page.getByRole("region", { name: "細目標列表", exact: true }).waitFor();
  for (const width of [320, 375, 1440]) await assertFits(page, width);
  assert.ok(await page.getByText("1,234,567.89", { exact: true }).count());
  const countRow = page
    .getByRole("heading", { name: unbrokenTitle, exact: true })
    .locator("xpath=ancestor::li[1]");
  await countRow.getByText("更新進度", { exact: true }).click();
  await countRow.getByLabel(/^增加數量/).fill("0.5");
  await countRow
    .getByLabel("備註（可選）", { exact: true })
    .fill("保留小數進度");
  await countRow.getByRole("button", { name: "新增進度", exact: true }).click();
  await countRow.getByText("1,234,568.39", { exact: true }).waitFor();
  await countRow.getByText("進度歷史", { exact: true }).click();
  await countRow.getByText("保留小數進度", { exact: true }).waitFor();
  await assertFits(page, 320);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "progress-worst-mobile.png"),
  });
  const checkbox = page.getByRole("checkbox", {
    name: "標記「練習步驟 1」完成",
    exact: true,
  });
  await checkbox.click();
  await page.waitForFunction(() => {
    const input = document.querySelector(
      'input[aria-label="標記「練習步驟 1」完成"]',
    );
    return input.checked && !input.disabled;
  });
  assert.equal(
    (
      await stressOwner
        .collection("goals")
        .doc("stress-goal-0")
        .collection("subGoals")
        .doc("stress-step-1")
        .get()
    ).data().isCompleted,
    true,
  );
  await page.getByRole("button", { name: "刪除目標", exact: true }).click();
  await page.getByRole("alertdialog").waitFor();
  await assertFits(page, 320);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "delete-sheet-mobile.png"),
  });
  await page.keyboard.press("Tab");
  assert.ok(
    await page
      .getByRole("alertdialog")
      .evaluate((element) => element.contains(document.activeElement)),
    "Sheet traps focus",
  );
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "刪除目標", exact: true }).click();
  const animationDuration = await page
    .getByRole("alertdialog")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  assert.ok(
    parseFloat(animationDuration) < 0.01,
    "Reduced motion removes sheet movement",
  );
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto(`${baseUrl}/goals/stress-goal-0/edit`);
  await page.locator("#goal-title").waitFor();
  await assertFits(page, 320);
  await page.locator("#goal-title").focus();
  assert.ok(
    await page
      .locator("#goal-title")
      .evaluate(
        (element) => parseFloat(getComputedStyle(element).fontSize) >= 16,
      ),
    "Mobile input avoids iOS zoom",
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await assertFits(page, 320);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });

  const firstEditor = page.locator('[aria-label="編輯細目標"] details').first();
  await firstEditor.locator("summary").click();
  await page.locator("#sub-goal-0-title").fill("");
  await firstEditor.locator("summary").click();
  await page.getByRole("button", { name: "儲存修改", exact: true }).click();
  await page.getByText("請輸入細目標標題。", { exact: true }).waitFor();
  assert.equal(
    await firstEditor.evaluate((element) => element.open),
    true,
    "Invalid collapsed fields become visible",
  );
  await page.locator("#sub-goal-0-title").fill(unbrokenTitle);
  await page.getByRole("button", { name: "儲存修改", exact: true }).click();
  await page.waitForURL("**/goals/stress-goal-0");
  const savedCount = stressOwner
    .collection("goals")
    .doc("stress-goal-0")
    .collection("subGoals")
    .doc("huge-count");
  assert.equal((await savedCount.get()).data().currentValue, 1234568.39);
  assert.equal(
    (await savedCount.collection("updates").get()).size,
    1,
    "Editing preserves progress history",
  );

  const invalidGoal = stressOwner.collection("goals").doc("invalid-fixture");
  await invalidGoal.set({
    userId: bobUid,
    title: "載入錯誤測試",
    categoryId: "stress-category-0",
    status: "not_started",
    createdAt: "invalid",
    updatedAt: now,
  });
  await page.goto(`${baseUrl}/goals`);
  await page.getByRole("alert").waitFor();
  await assertFits(page, 320);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "error-goals-mobile.png"),
  });
  await invalidGoal.delete();
  await page.getByRole("button", { name: "重試載入", exact: true }).click();
  await page.getByRole("region", { name: "大目標列表", exact: true }).waitFor();

  await page.route(missingImageUrl, (route) =>
    route.fulfill({ status: 404, body: "missing" }),
  );
  await page.goto(`${baseUrl}/learning`);
  await page
    .getByRole("region", { name: "學習記錄列表", exact: true })
    .waitFor();
  await page.getByLabel(`閱讀「${longTitle}」內容`, { exact: true }).click();
  await page
    .getByRole("link", { name: "開啟學習筆記圖片 1", exact: true })
    .scrollIntoViewIfNeeded();
  await page.getByText("圖片未能載入", { exact: true }).waitFor();
  for (const width of [320, 375, 1440]) await assertFits(page, width);
  await page.screenshot({
    animations: "disabled",
    path: join(output, "learning-worst-desktop.png"),
    fullPage: true,
  });
  await page.goto(`${baseUrl}/categories`);
  await page.getByRole("region", { name: "分類列表", exact: true }).waitFor();
  for (const width of [320, 375, 1440]) await assertFits(page, width);
  await page.goto(`${baseUrl}/goals/stress-goal-124`);
  await page.getByText("呢個大目標未有細目標。", { exact: true }).waitFor();
  await assertFits(page, 320);

  assert.deepEqual(errors, []);
  console.log(
    "UI checks passed: existing workflows, 320/375/768/1440px, 125 goals, 111 steps, 60 categories, schema-limit titles/descriptions, overdue/undated goals, filters, quick completion, decimal progress/history, collapsed editor validation/saving, empty/error/retry states, keyboard focus, mobile sheets, reduced motion, 200% text, missing images and account isolation.",
  );
  console.log(`Screenshots: ${output}`);
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
  if (server) {
    server.kill("SIGTERM");
    await new Promise((done) => server.once("exit", done));
  }
  await deleteApp(app);
}
