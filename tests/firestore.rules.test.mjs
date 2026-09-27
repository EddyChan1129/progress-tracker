import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";

import {
  assertFails,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

// 保存今次測試用嘅 Firebase 測試環境，俾所有 test 共用。
let testEnv;

// 所有 test 開始前執行一次：讀取本機 rules，連接 Firestore Emulator。
before(async () => {
  testEnv = await initializeTestEnvironment({
    // demo- project 只可以使用 emulator，避免測試意外連接正式 Firebase。
    projectId: "demo-progress-tracker",
    firestore: {
      // 將 repository 入面嘅 rules 載入 emulator。
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
});

// 所有 test 完成後執行一次：關閉測試建立嘅 Firebase connections。
after(async () => {
  await testEnv.cleanup();
});

describe("deny-by-default Firestore rules", () => {
  it("reject unauthenticated reads and writes", async () => {
    // 模擬一個完全未登入嘅 browser。
    const db = testEnv.unauthenticatedContext().firestore();

    // 只係建立 document reference，呢一行未有讀寫資料。
    const entry = doc(db, "users/alice/learningEntries/entry-1");

    // 測試預期 read 同 write 都被 rules 拒絕。
    // 如果任何一個 request 成功，assertFails() 會令 test 失敗。
    await assertFails(getDoc(entry));
    await assertFails(setDoc(entry, { title: "Two Sum" }));
  });

  it("reject authenticated access to unopened collections", async () => {
    // 模擬已登入使用者，Firebase Auth UID 係 "alice"。
    const db = testEnv.authenticatedContext("alice").firestore();

    // 即使路徑 uid 同登入 uid 都係 alice，目前 rules 仍未開放呢個 collection。
    const entry = doc(db, "users/alice/learningEntries/entry-1");

    // 驗證「已登入」唔代表自動有權限；兩個 request 仍然必須失敗。
    await assertFails(getDoc(entry));
    await assertFails(setDoc(entry, { title: "Two Sum" }));
  });
});
