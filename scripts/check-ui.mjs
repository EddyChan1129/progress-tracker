import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Run with npm run test:ui. Only the demo project and local emulators are touched.
assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, "Start the Firebase emulators first.");
process.env.TZ = "Asia/Hong_Kong";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const config = { apiKey: "test-key", authDomain: "localhost", projectId: "demo-progress-tracker", appId: "1:123:web:ui-check" };
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

async function createUser(email) {
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "emulator-only-password", returnSecureToken: true }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).localId;
}

async function signIn(page, email) {
  await page.goto(`${baseUrl}/login`);
  await page.getByRole("button", { name: "使用 Google 登入" }).waitFor();
  await page.addScriptTag({ path: resolve("node_modules/firebase/firebase-app-compat.js") });
  await page.addScriptTag({ path: resolve("node_modules/firebase/firebase-auth-compat.js") });
  await page.evaluate(async ({ config, email }) => {
    const auth = window.firebase.initializeApp(config).auth();
    auth.useEmulator("http://127.0.0.1:9099", { disableWarnings: true });
    await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    await auth.signInWithEmailAndPassword(email, "emulator-only-password");
  }, { config, email });
  await page.goto(baseUrl);
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { name: "最近學習" }).waitFor();
}

async function assertFits(page, width) {
  await page.setViewportSize({ width, height: 900 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  assert.ok(fits, `Horizontal page overflow at ${width}px: ${page.url()}`);
}

try {
  const email = `alice-${Date.now()}@example.test`;
  const bobEmail = `bob-${Date.now()}@example.test`;
  const [uid, bobUid] = await Promise.all([createUser(email), createUser(bobEmail)]);
  const owner = db.collection("users").doc(uid);
  const now = Timestamp.now();
  const batch = db.batch();
  for (let i = 0; i < 12; i++) batch.set(owner.collection("categories").doc(`category-${i}`), { userId: uid, name: i ? `學習方向 ${i}` : "英文與職業技能", icon: "📘", createdAt: now });
  for (let i = 0; i < 35; i++) batch.set(owner.collection("goals").doc(`goal-${i}`), {
    userId: uid, title: i === 0 ? "改善英文 speaking" : i === 1 ? "成為冷氣師傅" : `練習目標 ${i}`, description: "將大方向拆成細步驟，練習、回顧，再繼續。", categoryId: "category-0",
    status: i % 5 === 0 ? "in_progress" : i % 5 === 1 ? "not_started" : i % 5 === 2 ? "paused" : "completed", createdAt: now, updatedAt: now,
  });
  for (let i = 0; i < 20; i++) batch.set(owner.collection("goals").doc("goal-0").collection("subGoals").doc(`step-${i}`), {
    userId: uid, goalId: "goal-0", title: `練習細步驟 ${i + 1}`, kind: "checklist", isCompleted: i < 6, createdAt: now, updatedAt: now,
  });
  for (let i = 0; i < 24; i++) batch.set(owner.collection("learningEntries").doc(`entry-${i}`), {
    userId: uid, title: i ? `學習手記 ${i}` : "今日嘅英文練習", content: i ? "完成一次練習，記低唔熟嘅地方，再試一次。" : `長筆記與程式碼\n\n${"學習內容\n\n".repeat(100)}\n\n\`\`\`js\n${"const example = '" + "x".repeat(250) + "';"}\n\`\`\``, categoryId: "category-0", images: [], relatedGoalId: "goal-0",
    learnedAt: Timestamp.fromDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - i)), createdAt: now, updatedAt: now,
  });
  await batch.commit();
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3100", "--webpack"], {
    env: { ...process.env, NEXT_DIST_DIR: ".next/ui-tests", NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true", NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain, NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId, NEXT_PUBLIC_FIREBASE_APP_ID: config.appId, FIREBASE_ADMIN_CLIENT_EMAIL: "", FIREBASE_ADMIN_PRIVATE_KEY: "", CLOUDINARY_CLOUD_NAME: "", CLOUDINARY_API_KEY: "", CLOUDINARY_API_SECRET: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { serverLog = (serverLog + chunk).slice(-6000); });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* wait for dev server */ }
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, "Test dev server did not start.");
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 1440, height: 1000 }, timezoneId: "Asia/Hong_Kong" });
  let page = context.pages()[0];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page, email);
  await page.getByRole("link", { name: "改善英文 speaking", exact: true }).waitFor();
  await page.screenshot({ path: join(output, "desktop.png"), fullPage: true });
  for (const width of [320, 375, 768, 1440]) await assertFits(page, width);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: join(output, "mobile.png"), fullPage: true });
  await page.goto(`${baseUrl}/goals`);
  const goalsPanel = page.getByRole("region", { name: "大目標列表", exact: true });
  await goalsPanel.waitFor();
  assert.ok(await goalsPanel.evaluate((element) => element.scrollHeight > element.clientHeight));
  await goalsPanel.focus();
  await page.keyboard.press("PageDown");
  await page.waitForFunction(() => document.querySelector('[aria-label="大目標列表"]')?.scrollTop > 0);
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
  assert.equal((await owner.collection("goals").doc("goal-0").get()).data().status, "completed");
  assert.equal((await owner.collection("goals").doc("goal-0").collection("subGoals").where("isCompleted", "==", true).get()).size, 6);
  await page.goto(`${baseUrl}/goals/new`);
  await page.getByLabel("標題", { exact: true }).waitFor();
  await assertFits(page, 320);
  await page.goto(`${baseUrl}/learning`);
  const entriesPanel = page.getByRole("region", { name: "學習記錄列表", exact: true });
  await entriesPanel.waitFor();
  assert.ok(await entriesPanel.evaluate((element) => element.scrollHeight > element.clientHeight));
  await assertFits(page, 320);
  await page.goto(`${baseUrl}/learning/new`);
  await page.getByLabel("標題", { exact: true }).waitFor();
  await page.getByLabel("標題", { exact: true }).fill("UI 驗收記錄");
  await page.getByLabel("學習內容", { exact: true }).fill("只寫入本機測試資料。");
  await page.getByLabel("分類", { exact: true }).selectOption("category-0");
  await page.getByLabel("關聯大目標（可選）").selectOption("goal-34");
  await owner.collection("goals").doc("goal-34").delete();
  await page.getByRole("button", { name: "新增學習記錄", exact: true }).click();
  await page.getByText("搵唔到本人嘅目標，請重新選擇。", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("關聯大目標（可選）").isDisabled(), false);
  await page.getByLabel("關聯大目標（可選）").selectOption("goal-0");
  await page.getByRole("button", { name: "新增學習記錄", exact: true }).click();
  await page.getByText("學習記錄已新增。", { exact: true }).waitFor();
  const saved = await owner.collection("learningEntries").where("title", "==", "UI 驗收記錄").get();
  assert.equal(saved.size, 1);
  assert.equal(saved.docs[0].data().relatedGoalId, "goal-0");
  await page.goto(`${baseUrl}/learning/${saved.docs[0].id}/edit`);
  await page.getByLabel("關聯大目標（可選）").selectOption("");
  await page.getByRole("button", { name: "儲存修改", exact: true }).click();
  await page.waitForURL("**/learning");
  assert.equal("relatedGoalId" in (await saved.docs[0].ref.get()).data(), false);
  await page.goto(`${baseUrl}/categories`);
  await page.getByRole("region", { name: "分類列表" }).waitFor();
  await assertFits(page, 320);
  await context.close();
  context = await chromium.launchPersistentContext(profile, { headless: true, timezoneId: "Asia/Hong_Kong" });
  page = context.pages()[0];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/", "/login"]) {
    await page.goto(`${baseUrl}${path}`);
    await page.waitForURL("**/dashboard");
    await page.getByRole("heading", { name: "最近學習" }).waitFor();
  }
  await page.getByRole("button", { name: "登出", exact: true }).filter({ visible: true }).click();
  await page.waitForURL("**/login");
  await page.goto(`${baseUrl}/goals`);
  await page.waitForURL("**/login");
  await signIn(page, bobEmail);
  await page.getByText("仲未有學習記錄", { exact: true }).waitFor();
  assert.equal(await page.getByText("今日嘅英文練習", { exact: true }).count(), 0);
  assert.equal(await db.collection("users").doc(bobUid).collection("learningEntries").count().get().then((result) => result.data().count), 0);
  assert.deepEqual(errors, []);
  console.log("UI checks passed: 320/375/768/1440px, bounded keyboard scroll, goal status changes, create/edit goal links, browser restart persistence, login redirects, sign-out and account isolation.");
  console.log(`Screenshots: ${output}`);
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  await context?.close();
  if (server) { server.kill("SIGTERM"); await new Promise((done) => server.once("exit", done)); }
  await deleteApp(app);
}
