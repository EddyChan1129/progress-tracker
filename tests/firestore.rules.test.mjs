import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

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

async function seedCategory(userId, categoryId) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", userId, "categories", categoryId), {
      userId,
      name: "Test category",
      createdAt: Timestamp.now(),
    });
  });
}

async function seedLearningEntry(userId, entryId, categoryId) {
  await seedCategory(userId, categoryId);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const timestamp = Timestamp.now();

    await setDoc(
      doc(context.firestore(), "users", userId, "learningEntries", entryId),
      {
        userId,
        title: "Original title",
        content: "Original content",
        categoryId,
        images: [],
        learnedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );
  });
}

function validLearningEntry(overrides = {}) {
  return {
    userId: "alice",
    title: "Two Sum",
    content: "學識用 Map 儲存已見過嘅數字。",
    categoryId: "leetcode-entry",
    images: [],
    learnedAt: Timestamp.fromDate(new Date(2026, 8, 28)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

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

    // 即使路徑 uid 同登入 uid 都係 alice，目前 rules 仍未開放 goals。
    const goal = doc(db, "users/alice/goals/goal-1");

    // 驗證「已登入」唔代表自動有權限；兩個 request 仍然必須失敗。
    await assertFails(getDoc(goal));
    await assertFails(setDoc(goal, { title: "Read every day" }));
  });
});

describe("learning entry Firestore rules", () => {
  it("allows a user to create a valid entry with their own category", async () => {
    await seedCategory("alice", "leetcode-entry");
    const db = testEnv.authenticatedContext("alice").firestore();
    const entry = doc(db, "users/alice/learningEntries/valid-entry");

    await assertSucceeds(setDoc(entry, validLearningEntry()));
    await assertSucceeds(getDoc(entry));
    await assertSucceeds(
      getDocs(collection(db, "users/alice/learningEntries")),
    );
  });

  it("rejects access across users", async () => {
    const db = testEnv.authenticatedContext("bob").firestore();
    const aliceEntry = doc(db, "users/alice/learningEntries/alice-entry");

    await assertFails(getDoc(aliceEntry));
    await assertFails(
      getDocs(collection(db, "users/alice/learningEntries")),
    );
    await assertFails(
      setDoc(
        doc(db, "users/alice/learningEntries/bob-entry"),
        validLearningEntry(),
      ),
    );
  });

  it("rejects a category that does not belong to the user", async () => {
    await seedCategory("alice", "private-category");
    const db = testEnv.authenticatedContext("bob").firestore();
    const entry = doc(db, "users/bob/learningEntries/wrong-category");

    await assertFails(
      setDoc(
        entry,
        validLearningEntry({
          userId: "bob",
          categoryId: "private-category",
        }),
      ),
    );
  });

  it("rejects a blank title", async () => {
    await seedCategory("alice", "blank-title-category");
    const db = testEnv.authenticatedContext("alice").firestore();
    const entry = doc(db, "users/alice/learningEntries/blank-title");

    await assertFails(
      setDoc(
        entry,
        validLearningEntry({
          title: "   ",
          categoryId: "blank-title-category",
        }),
      ),
    );
  });

  it("allows an owner to update editable learning entry fields", async () => {
    await seedLearningEntry("alice", "editable-entry", "edit-category");
    const db = testEnv.authenticatedContext("alice").firestore();
    const entry = doc(db, "users/alice/learningEntries/editable-entry");

    await assertSucceeds(
      updateDoc(entry, {
        title: "Updated title",
        content: "Updated content",
        learnedAt: Timestamp.fromDate(new Date(2026, 8, 30)),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rejects changes to a learning entry owner or creation time", async () => {
    await seedLearningEntry("alice", "locked-entry", "locked-category");
    const db = testEnv.authenticatedContext("alice").firestore();
    const entry = doc(db, "users/alice/learningEntries/locked-entry");

    await assertFails(updateDoc(entry, { userId: "bob" }));
    await assertFails(updateDoc(entry, { createdAt: serverTimestamp() }));
  });

  it("rejects another user's learning entry update", async () => {
    await seedLearningEntry("alice", "private-entry", "private-category");
    const db = testEnv.authenticatedContext("bob").firestore();
    const entry = doc(db, "users/alice/learningEntries/private-entry");

    await assertFails(updateDoc(entry, { title: "Changed by Bob" }));
  });

  it("allows only the owner to delete a learning entry", async () => {
    await seedLearningEntry("alice", "delete-entry", "delete-category");
    const path = "users/alice/learningEntries/delete-entry";
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(deleteDoc(doc(guestDb, path)));
    await assertFails(deleteDoc(doc(bobDb, path)));
    await assertSucceeds(getDoc(doc(aliceDb, path)));
    await assertSucceeds(deleteDoc(doc(aliceDb, path)));
    const deleted = await getDoc(doc(aliceDb, path));
    if (deleted.exists()) throw new Error("Entry was not deleted.");
  });

  it("rejects direct deletion of an entry with images", async () => {
    await seedLearningEntry("alice", "image-entry", "image-category");
    const path = "users/alice/learningEntries/image-entry";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), path), {
        images: [{ publicId: "test-image", url: "https://example.com/image.png" }],
      });
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(db, path)));
  });
});

describe("category Firestore rules", () => {
  it("allow a user to create and list their own categories", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const category = doc(db, "users/alice/categories/leetcode");

    await assertSucceeds(
      setDoc(category, {
        userId: "alice",
        name: "LeetCode",
        icon: "💻",
        createdAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/alice/categories/no-icon"), {
        userId: "alice",
        name: "閱讀",
        createdAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDocs(collection(db, "users/alice/categories")));
  });

  it("reject category updates and deletes", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const category = doc(db, "users/alice/categories/leetcode");

    await assertFails(updateDoc(category, { name: "New name" }));
    await assertFails(deleteDoc(category));
  });

  it("reject unauthenticated category access", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const category = doc(db, "users/alice/categories/private");

    await assertFails(getDoc(category));
    await assertFails(
      setDoc(category, {
        userId: "alice",
        name: "Private",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("reject access to another user's categories", async () => {
    const db = testEnv.authenticatedContext("bob").firestore();
    const category = doc(db, "users/alice/categories/leetcode");

    await assertFails(getDoc(category));
    await assertFails(
      setDoc(category, {
        userId: "alice",
        name: "Changed by Bob",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("reject invalid category data", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();

    await assertFails(
      setDoc(doc(db, "users/alice/categories/wrong-owner"), {
        userId: "bob",
        name: "Wrong owner",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/categories/blank-name"), {
        userId: "alice",
        name: "   ",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/categories/long-icon"), {
        userId: "alice",
        name: "LeetCode",
        icon: "12345678901",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/categories/extra-field"), {
        userId: "alice",
        name: "LeetCode",
        color: "red",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/categories/fake-time"), {
        userId: "alice",
        name: "LeetCode",
        createdAt: Timestamp.fromMillis(0),
      }),
    );
  });
});
