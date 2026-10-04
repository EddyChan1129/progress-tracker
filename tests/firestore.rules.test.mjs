import assert from "node:assert/strict";
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
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
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

describe("learning goal references", () => {
  it("allows owned goals, changing a reference and removing it", async () => {
    await seedCategory("alice", "leetcode-entry");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      for (const id of ["linked-one", "linked-two"]) {
        await setDoc(doc(context.firestore(), "users/alice/goals", id), { userId: "alice" });
      }
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    const entry = doc(db, "users/alice/learningEntries/linked");
    await assertSucceeds(setDoc(entry, validLearningEntry({ relatedGoalId: "linked-one" })));
    await assertSucceeds(updateDoc(entry, { relatedGoalId: "linked-two", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(entry, { relatedGoalId: deleteField(), updatedAt: serverTimestamp() }));
    assert.equal("relatedGoalId" in (await getDoc(entry)).data(), false);
  });

  it("rejects missing, foreign, forged and malformed references", async () => {
    await seedCategory("alice", "leetcode-entry");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/bob/goals/foreign"), { userId: "bob" });
      await setDoc(doc(context.firestore(), "users/alice/goals/forged"), { userId: "bob" });
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const [i, relatedGoalId] of ["missing", "foreign", "forged", "../bob", "", null].entries()) {
      await assertFails(setDoc(doc(db, "users/alice/learningEntries", `bad-link-${i}`), validLearningEntry({ relatedGoalId })));
    }
    await seedLearningEntry("alice", "bad-update-link", "leetcode-entry");
    const entry = doc(db, "users/alice/learningEntries/bad-update-link");
    await assertFails(updateDoc(entry, { relatedGoalId: "foreign", updatedAt: serverTimestamp() }));
    assert.equal("relatedGoalId" in (await getDoc(entry)).data(), false);
  });
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

    // 即使路徑 uid 同登入 uid 都係 alice，目前 rules 仍未開放 settings。
    const settings = doc(db, "users/alice/settings/preferences");

    // 驗證「已登入」唔代表自動有權限；兩個 request 仍然必須失敗。
    await assertFails(getDoc(settings));
    await assertFails(setDoc(settings, { theme: "dark" }));
  });
});

describe("server-only image bookkeeping", () => {
  it("prevents browsers from forging asset states or operation receipts", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const collectionName of ["imageAssets", "mediaOperations"]) {
      const ref = doc(db, "users", "alice", collectionName, "forged");
      await assertFails(setDoc(ref, { state: "active", hash: "fake" }));
      await assertFails(getDoc(ref));
    }
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

  it("allows text edits but rejects forged or removed image associations", async () => {
    await seedLearningEntry("alice", "protected-images", "protected-category");
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/learningEntries/protected-images");
    const images = [{ publicId: "verified", url: "https://res.cloudinary.com/test/image.png" }];
    await assertFails(updateDoc(ref, { images, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, "users/alice/learningEntries/forged-images"), validLearningEntry({ categoryId: "protected-category", images })));
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), ref.path), { images });
    });
    await assertSucceeds(updateDoc(ref, { title: "New title", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { images: [], updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { images: [{ ...images[0], url: "https://evil.example" }], updatedAt: serverTimestamp() }));
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

function validGoal(overrides = {}) {
  return {
    userId: "alice", title: "成為冷氣師傅", categoryId: "goal-category",
    status: "not_started", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describe("goal Firestore rules", () => {
  before(async () => { await seedCategory("alice", "goal-category"); });

  it("allows creating and reading own parent goals without quantities or dates", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/goals/valid-goal");
    await assertSucceeds(setDoc(ref, validGoal()));
    await assertSucceeds(setDoc(doc(db, "users/alice/goals/described-goal"), validGoal({ description: "學識安裝同維修" })));
    const snapshot = await assertSucceeds(getDoc(ref));
    for (const field of ["targetValue", "currentValue", "unit", "startDate", "targetDate"]) {
      assert.equal(field in snapshot.data(), false);
    }
    await assertSucceeds(getDocs(collection(db, "users/alice/goals")));
  });

  it("rejects unauthenticated access and access across owners", async () => {
    for (const db of [testEnv.unauthenticatedContext().firestore(), testEnv.authenticatedContext("bob").firestore()]) {
      await assertFails(getDoc(doc(db, "users/alice/goals/valid-goal")));
      await assertFails(getDocs(collection(db, "users/alice/goals")));
      await assertFails(setDoc(doc(db, "users/alice/goals/foreign-goal"), validGoal()));
    }
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users/alice/goals/forged-owner"), validGoal({ userId: "bob" })));
  });

  it("rejects missing, foreign and malformed category references", async () => {
    await seedCategory("bob", "bob-goal-category");
    // 模擬錯誤 server 資料：即使路徑係 Alice，欄位 owner 都必須係 Alice。
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice/categories/wrong-owner-category"), { userId: "bob" });
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const categoryId of ["missing-category", "bob-goal-category", "wrong-owner-category", "../bob", "", ".", ".."] ) {
      await assertFails(setDoc(doc(db, "users/alice/goals/bad-category"), validGoal({ categoryId })));
    }
  });

  it("rejects quantity fields and forged initial status", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const changes of [
      { targetValue: 10 }, { currentValue: 0 }, { unit: "題" },
      { status: "completed" }, { status: "in_progress" }, { status: "paused" }, { status: "unknown" },
    ]) {
      await assertFails(setDoc(doc(db, "users/alice/goals/forged-progress"), validGoal(changes)));
    }
  });

  it("rejects invalid text, extra fields and missing required fields", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const changes of [
      { title: " " }, { title: "a".repeat(101) }, { title: " untrimmed " },
      { description: 123 }, { description: "a".repeat(2001) }, { color: "red" },
    ]) {
      await assertFails(setDoc(doc(db, "users/alice/goals/bad-fields"), validGoal(changes)));
    }
    for (const field of ["userId", "title", "categoryId", "status", "createdAt", "updatedAt"]) {
      const incomplete = validGoal();
      delete incomplete[field];
      await assertFails(setDoc(doc(db, "users/alice/goals/missing-field"), incomplete));
    }
  });

  it("accepts optional dates but rejects wrong types and reversed pairs", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const startDate = Timestamp.fromDate(new Date(2026, 9, 3));
    const targetDate = Timestamp.fromDate(new Date(2026, 9, 12));
    for (const [id, dates] of [
      ["start-only", { startDate }], ["target-only", { targetDate }],
      ["both-dates", { startDate, targetDate }], ["same-day", { startDate, targetDate: startDate }],
    ]) {
      await assertSucceeds(setDoc(doc(db, "users/alice/goals", id), validGoal(dates)));
    }
    for (const dates of [
      { startDate: targetDate, targetDate: startDate }, { startDate: "2026-10-03" },
      { targetDate: "" }, { startDate: null }, { targetDate: null },
    ]) {
      await assertFails(setDoc(doc(db, "users/alice/goals/bad-dates"), validGoal(dates)));
    }
  });

  it("rejects forged timestamps", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const field of ["createdAt", "updatedAt"]) {
      await assertFails(setDoc(doc(db, "users/alice/goals/fake-time"), validGoal({ [field]: Timestamp.fromMillis(0) })));
    }
  });

  it("allows owner metadata edits and clearing optional fields without changing progress or children", async () => {
    await seedCategory("alice", "new-goal-category");
    const db = testEnv.authenticatedContext("alice").firestore();
    const goal = doc(db, "users/alice/goals/editable-parent");
    await assertSucceeds(setDoc(goal, validGoal()));
    const child = doc(goal, "subGoals/kept-child");
    await assertSucceeds(setDoc(child, validCountSubGoal({ goalId: goal.id })));
    // 模擬將來狀態功能已將目標設為進行中；編輯唔應該重設狀態。
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), goal.path), { status: "in_progress" });
    });
    const beforeEdit = (await getDoc(goal)).data();
    await assertSucceeds(updateDoc(goal, {
      title: "改善英文 speaking", description: "練習日常對話", categoryId: "new-goal-category",
      startDate: Timestamp.fromDate(new Date(2026, 9, 3)),
      targetDate: Timestamp.fromDate(new Date(2026, 9, 12)), updatedAt: serverTimestamp(),
    }));
    const edited = (await getDoc(goal)).data();
    assert.equal(edited.title, "改善英文 speaking");
    assert.equal(edited.categoryId, "new-goal-category");
    assert.equal(edited.status, "in_progress");
    assert.ok(edited.createdAt.isEqual(beforeEdit.createdAt));
    // deleteField 真正移除原值，唔係保存空字串或 null。
    await assertSucceeds(updateDoc(goal, {
      description: deleteField(), startDate: deleteField(), targetDate: deleteField(), updatedAt: serverTimestamp(),
    }));
    const cleared = (await getDoc(goal)).data();
    for (const field of ["description", "startDate", "targetDate"]) assert.equal(field in cleared, false);
    const keptChild = (await getDoc(child)).data();
    assert.equal(keptChild.title, "學單字");
    assert.equal(keptChild.currentValue, 0);
    assert.equal(keptChild.targetValue, 300);
  });

  it("rejects guests, other owners and updates to missing goals", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const goal = doc(db, "users/alice/goals/update-owner");
    await assertSucceeds(setDoc(goal, validGoal()));
    for (const context of [testEnv.unauthenticatedContext(), testEnv.authenticatedContext("bob")]) {
      await assertFails(updateDoc(doc(context.firestore(), goal.path), { title: "Changed", updatedAt: serverTimestamp() }));
    }
    await assertFails(updateDoc(doc(db, "users/alice/goals/missing-update"), { title: "Changed", updatedAt: serverTimestamp() }));
  });

  it("rejects forged goal identity, status, creation time, extra fields and removal of required fields", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const goal = doc(db, "users/alice/goals/protected-parent");
    await assertSucceeds(setDoc(goal, validGoal()));
    for (const changes of [
      { userId: "bob" }, { createdAt: Timestamp.fromMillis(0) }, { status: "completed" },
      { currentValue: 5 }, { targetValue: 10 }, { unit: "題" }, { color: "red" },
      { updatedAt: Timestamp.fromMillis(0) },
      { title: deleteField() }, { categoryId: deleteField() }, { userId: deleteField() },
      { createdAt: deleteField() }, { status: deleteField() },
    ]) {
      await assertFails(updateDoc(goal, { updatedAt: serverTimestamp(), ...changes }));
    }
    assert.equal((await getDoc(goal)).data().status, "not_started");
  });

  it("rejects invalid edited text, category references and dates", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const goal = doc(db, "users/alice/goals/invalid-edit");
    await assertSucceeds(setDoc(goal, validGoal()));
    for (const changes of [
      { title: " " }, { title: " untrimmed " }, { title: "a".repeat(101) },
      { description: 123 }, { description: "a".repeat(2001) },
      { categoryId: "missing-category" }, { categoryId: "bob-goal-category" },
      { categoryId: "wrong-owner-category" }, { categoryId: "../bob" }, { categoryId: "." },
      { startDate: null }, { targetDate: "2026-10-03" },
      { startDate: Timestamp.fromDate(new Date(2026, 9, 12)), targetDate: Timestamp.fromDate(new Date(2026, 9, 3)) },
    ]) {
      await assertFails(updateDoc(goal, { ...changes, updatedAt: serverTimestamp() }));
    }
  });

  it("keeps parent deletion and progress history closed", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const goal = doc(db, "users/alice/goals/locked-goal");
    await assertSucceeds(setDoc(goal, validGoal()));
    await assertFails(updateDoc(goal, { currentValue: 5, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(goal));
    for (const path of ["updates/forged-progress", "subGoals/child/updates/progress"]) {
      const child = doc(db, "users/alice/goals/locked-goal", path);
      await assertFails(setDoc(child, { userId: "alice", progressDelta: 5 }));
      await assertFails(getDoc(child));
    }
  });

  it("preserves owner read access to existing goals in the old format", async () => {
    // 只喺 emulator 模擬之前已有嘅資料；唔改／刪正式 Firestore 記錄。
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice/goals/legacy-goal"), validGoal({
        targetValue: 10, currentValue: 3, unit: "題", status: "in_progress",
        startDate: Timestamp.fromDate(new Date(2026, 9, 3)),
        targetDate: Timestamp.fromDate(new Date(2026, 9, 12)),
      }));
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    const snapshot = await assertSucceeds(getDoc(doc(db, "users/alice/goals/legacy-goal")));
    assert.equal(snapshot.data().currentValue, 3);
    assert.equal(snapshot.data().unit, "題");
    // 只改新版可編輯欄位，舊計量欄位保持原值，唔暗中遷移或刪除。
    await assertSucceeds(updateDoc(snapshot.ref, { title: "Updated legacy title", updatedAt: serverTimestamp() }));
    const edited = (await getDoc(snapshot.ref)).data();
    assert.equal(edited.title, "Updated legacy title");
    assert.equal(edited.status, "in_progress");
    assert.equal(edited.targetValue, 10);
    assert.equal(edited.currentValue, 3);
    assert.equal(edited.unit, "題");
    assert.ok(edited.createdAt.isEqual(snapshot.data().createdAt));
    await assertFails(updateDoc(snapshot.ref, { unit: deleteField(), updatedAt: serverTimestamp() }));
    await assertSucceeds(getDocs(collection(db, "users/alice/goals")));
    await assertFails(getDoc(doc(testEnv.authenticatedContext("bob").firestore(), "users/alice/goals/legacy-goal")));
  });
});

function validSubGoal(overrides = {}) {
  return {
    userId: "alice", goalId: "sub-parent", kind: "checklist", title: "搵老師",
    isCompleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function validCountSubGoal(overrides = {}) {
  const data = validSubGoal({ kind: "count", title: "學單字", targetValue: 300, currentValue: 0, unit: "個", ...overrides });
  delete data.isCompleted;
  return data;
}

describe("subgoal Firestore rules", () => {
  before(async () => {
    await seedCategory("alice", "goal-category");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice/goals/sub-parent"), validGoal());
      await setDoc(doc(context.firestore(), "users/alice/goals/wrong-owner-parent"), { userId: "bob" });
      await setDoc(doc(context.firestore(), "users/bob/goals/bob-parent"), { userId: "bob" });
    });
  });

  it("allows the owner to create both kinds and read their list", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/goals/sub-parent/subGoals/checklist");
    await assertSucceeds(setDoc(ref, validSubGoal()));
    await assertSucceeds(setDoc(doc(db, "users/alice/goals/sub-parent/subGoals/count"), validCountSubGoal()));
    await assertSucceeds(setDoc(doc(db, "users/alice/goals/sub-parent/subGoals/decimal"), validCountSubGoal({ targetValue: 2.5, unit: "章", description: "閱讀" })));
    assert.equal((await assertSucceeds(getDoc(ref))).data().isCompleted, false);
    const list = await assertSucceeds(getDocs(collection(db, "users/alice/goals/sub-parent/subGoals")));
    assert.equal(list.size, 3);
  });

  it("allows creating a parent and both subgoal kinds in one atomic batch", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const parent = doc(db, "users/alice/goals/batch-parent");
    const checklist = doc(parent, "subGoals/checklist");
    const count = doc(parent, "subGoals/count");
    const batch = writeBatch(db);
    batch.set(parent, validGoal());
    batch.set(checklist, validSubGoal({ goalId: parent.id }));
    batch.set(count, validCountSubGoal({ goalId: parent.id }));

    await assertSucceeds(batch.commit());
    assert.equal((await assertSucceeds(getDoc(parent))).exists(), true);
    assert.equal((await assertSucceeds(getDoc(checklist))).data().isCompleted, false);
    assert.equal((await assertSucceeds(getDoc(count))).data().currentValue, 0);
    assert.equal((await assertSucceeds(getDocs(collection(parent, "subGoals")))).size, 2);
  });

  it("rolls back the parent and every child if a batch child forges ownership or progress", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const invalidChildren = [
      (goalId) => validSubGoal({ goalId, userId: "bob" }),
      () => validSubGoal({ goalId: "another-parent" }),
      (goalId) => validSubGoal({ goalId, isCompleted: true }),
      (goalId) => validCountSubGoal({ goalId, currentValue: 1 }),
    ];
    for (const [index, invalidChild] of invalidChildren.entries()) {
      const parent = doc(db, "users/alice/goals", `rejected-batch-${index}`);
      const validChildRef = doc(parent, "subGoals/valid");
      const invalidChildRef = doc(parent, "subGoals/invalid");
      const batch = writeBatch(db);
      batch.set(parent, validGoal());
      batch.set(validChildRef, validSubGoal({ goalId: parent.id }));
      batch.set(invalidChildRef, invalidChild(parent.id));
      await assertFails(batch.commit());

      // 唔只檢查 request 失敗，亦確認成功分支嘅資料冇被部分儲存。
      await testEnv.withSecurityRulesDisabled(async (context) => {
        for (const ref of [parent, validChildRef, invalidChildRef]) {
          assert.equal((await getDoc(doc(context.firestore(), ref.path))).exists(), false);
        }
      });
    }
  });

  it("rejects guests, other users and forged ownership or parent IDs", async () => {
    for (const db of [testEnv.unauthenticatedContext().firestore(), testEnv.authenticatedContext("bob").firestore()]) {
      const ref = doc(db, "users/alice/goals/sub-parent/subGoals/checklist");
      await assertFails(getDoc(ref));
      await assertFails(getDocs(collection(db, "users/alice/goals/sub-parent/subGoals")));
      await assertFails(setDoc(ref, validSubGoal()));
    }
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const changes of [{ userId: "bob" }, { goalId: "bob-parent" }]) {
      await assertFails(setDoc(doc(db, "users/alice/goals/sub-parent/subGoals/forged"), validSubGoal(changes)));
    }
  });

  it("rejects missing, foreign or incorrectly owned parents for reads and creates", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const goalId of ["missing-parent", "bob-parent", "wrong-owner-parent"]) {
      const ref = doc(db, "users/alice/goals", goalId, "subGoals/child");
      await assertFails(setDoc(ref, validSubGoal({ goalId })));
      await assertFails(getDoc(ref));
      await assertFails(getDocs(collection(db, "users/alice/goals", goalId, "subGoals")));
    }
  });

  it("rejects forged initial progress, mixed fields and unknown kinds", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/goals/sub-parent/subGoals/bad-progress");
    for (const data of [
      validSubGoal({ isCompleted: true }), validSubGoal({ isCompleted: 0 }),
      validSubGoal({ unit: "次" }), validSubGoal({ targetValue: 1 }), validSubGoal({ currentValue: 0 }),
      validSubGoal({ kind: "unknown" }), validCountSubGoal({ currentValue: 1 }),
      validCountSubGoal({ currentValue: "0" }), { ...validCountSubGoal(), isCompleted: false },
    ]) await assertFails(setDoc(ref, data));
  });

  it("rejects invalid fields, missing fields and forged timestamps", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/goals/sub-parent/subGoals/bad-fields");
    for (const changes of [
      { title: " " }, { title: " untrimmed " }, { title: "a".repeat(101) }, { title: 1 },
      { description: 1 }, { description: "a".repeat(2001) }, { color: "red" },
      { createdAt: Timestamp.fromMillis(0) }, { updatedAt: Timestamp.fromMillis(0) },
    ]) await assertFails(setDoc(ref, validSubGoal(changes)));
    for (const changes of [
      { targetValue: 0 }, { targetValue: -1 }, { targetValue: "300" },
      { targetValue: Infinity }, { targetValue: NaN },
      { unit: "" }, { unit: " 個 " }, { unit: "a".repeat(21) }, { unit: 1 },
    ]) await assertFails(setDoc(ref, validCountSubGoal(changes)));
    for (const data of [validSubGoal(), validCountSubGoal()]) {
      for (const field of Object.keys(data)) {
        const missing = { ...data };
        delete missing[field];
        await assertFails(setDoc(ref, missing));
      }
    }
  });

  it("atomically edits a parent and existing children, and adds a new child", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const parent = doc(db, "users/alice/goals/sub-parent");
    const child = doc(parent, "subGoals/edit-count");
    await assertSucceeds(setDoc(child, validCountSubGoal()));
    const before = (await getDoc(child)).data();
    const batch = writeBatch(db);
    batch.update(parent, { title: "一齊修改", updatedAt: serverTimestamp() });
    batch.update(child, { title: "學 500 字", targetValue: 500, updatedAt: serverTimestamp() });
    batch.set(doc(parent, "subGoals/edit-new"), validSubGoal());
    await assertSucceeds(batch.commit());
    const after = (await getDoc(child)).data();
    assert.equal(after.targetValue, 500);
    assert.equal(after.currentValue, 0);
    assert.ok(after.createdAt.isEqual(before.createdAt));

    const invalid = writeBatch(db);
    invalid.update(parent, { title: "唔應該保存", updatedAt: serverTimestamp() });
    invalid.update(child, { currentValue: 99, updatedAt: serverTimestamp() });
    await assertFails(invalid.commit());
    assert.equal((await getDoc(parent)).data().title, "一齊修改");
    assert.equal((await getDoc(child)).data().currentValue, 0);
  });

  it("protects child identity, kind, progress and timestamps while allowing text edits", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/goals/sub-parent/subGoals/edit-checklist");
    await assertSucceeds(setDoc(ref, validSubGoal({ description: "舊描述" })));
    await assertSucceeds(updateDoc(ref, { title: "新標題", description: deleteField(), updatedAt: serverTimestamp() }));
    for (const changes of [
      { userId: "bob" }, { goalId: "other" }, { kind: "count" },
      { createdAt: Timestamp.fromMillis(1) }, { extra: true }, { title: "" },
      { targetValue: 10 }, { unit: "個" }, { title: deleteField() },
      { updatedAt: Timestamp.fromMillis(1) },
    ]) await assertFails(updateDoc(ref, { updatedAt: serverTimestamp(), ...changes }));
    for (const context of [testEnv.unauthenticatedContext(), testEnv.authenticatedContext("bob")]) {
      await assertFails(updateDoc(doc(context.firestore(), ref.path), { title: "冒認", updatedAt: serverTimestamp() }));
    }
    await assertFails(updateDoc(doc(db, "users/alice/goals/sub-parent/subGoals/missing-edit"), { title: "不存在", updatedAt: serverTimestamp() }));
  });

  it("locks count measurements after progress, including a stale form save", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/goals/sub-parent/subGoals/edit-progress");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ref.path), validCountSubGoal({ currentValue: 5 }));
    });
    await assertSucceeds(updateDoc(ref, { title: "改文字", targetValue: 300, unit: "個", updatedAt: serverTimestamp() }));
    for (const changes of [{ targetValue: 500 }, { unit: "次" }, { currentValue: 0 }, { targetValue: deleteField() }]) {
      await assertFails(updateDoc(ref, { ...changes, updatedAt: serverTimestamp() }));
    }
    const batch = writeBatch(db);
    batch.update(doc(db, "users/alice/goals/sub-parent"), { title: "過期表單", updatedAt: serverTimestamp() });
    batch.update(ref, { targetValue: 500, updatedAt: serverTimestamp() });
    await assertFails(batch.commit());
    assert.notEqual((await getDoc(doc(db, "users/alice/goals/sub-parent"))).data().title, "過期表單");
  });

  it("allows only the owner to toggle checklist completion", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    const checklist = doc(alice, "users/alice/goals/sub-parent/subGoals/toggle-checklist");
    await assertSucceeds(setDoc(checklist, validSubGoal()));
    await assertSucceeds(updateDoc(checklist, { isCompleted: true, updatedAt: serverTimestamp() }));
    assert.equal((await getDoc(checklist)).data().isCompleted, true);
    await assertSucceeds(updateDoc(checklist, { isCompleted: false, updatedAt: serverTimestamp() }));

    for (const changes of [
      { userId: "bob" }, { goalId: "other" }, { kind: "count" },
      { currentValue: 1 }, { createdAt: Timestamp.fromMillis(1) },
      { isCompleted: 1 }, { updatedAt: Timestamp.fromMillis(1) },
    ]) await assertFails(updateDoc(checklist, { isCompleted: true, updatedAt: serverTimestamp(), ...changes }));
    await assertFails(updateDoc(doc(testEnv.authenticatedContext("bob").firestore(), checklist.path), {
      isCompleted: true, updatedAt: serverTimestamp(),
    }));
  });

  it("rejects completion toggles on count subgoals", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const count = doc(db, "users/alice/goals/sub-parent/subGoals/toggle-count");
    await assertSucceeds(setDoc(count, validCountSubGoal()));
    await assertFails(updateDoc(count, { isCompleted: true, updatedAt: serverTimestamp() }));
  });

  it("keeps checklist deletion, history and another level of children closed", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/goals/sub-parent/subGoals/locked");
    await assertSucceeds(setDoc(ref, validSubGoal()));
    await assertSucceeds(updateDoc(ref, { isCompleted: true, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(ref));
    for (const path of ["updates/progress", "subGoals/grandchild"]) {
      const child = doc(ref, path);
      await assertFails(setDoc(child, validSubGoal()));
      await assertFails(getDoc(child));
    }
  });
});
