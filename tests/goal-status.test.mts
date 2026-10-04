import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, after, it } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteField, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { commitGoalStatus, goalStatusTransitions } from "../src/features/goals/services/goal-status.ts";
import { commitSubGoalProgress } from "../src/features/goals/services/sub-goal-progress.ts";
import type { GoalStatus } from "../src/features/goals/types/goal.types.ts";

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-progress-tracker",
    firestore: { rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") } });
  await env.withSecurityRulesDisabled(async (context) => {
    for (const id of ["status-category", "other-status-category"]) {
      await setDoc(doc(context.firestore(), "users/alice/categories", id), {
        userId: "alice", name: "英文", createdAt: Timestamp.now(),
      });
    }
  });
});
after(async () => { await env?.cleanup(); });

async function seed(id: string, status: GoalStatus = "not_started") {
  const ref = doc(env.authenticatedContext("alice").firestore(), "users/alice/goals", id);
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ref.path), {
      userId: "alice", title: "改善英文", categoryId: "status-category", status,
      description: "練習對話", createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
  });
  return ref;
}

it("starts, pauses, resumes and completes without changing other goal fields", async () => {
  const ref = await seed("status-flow");
  const original = (await getDoc(ref)).data()!;
  let previous: GoalStatus = "not_started";
  for (const status of ["in_progress", "paused", "in_progress", "completed"] as const) {
    assert.equal(await commitGoalStatus(ref, "alice", status, previous), status);
    const saved = (await getDoc(ref)).data()!;
    assert.equal(saved.status, status);
    for (const key of ["userId", "title", "categoryId", "description"]) assert.equal(saved[key], original[key]);
    assert.ok(saved.createdAt.isEqual(original.createdAt));
    assert.ok(saved.updatedAt instanceof Timestamp);
    previous = status;
  }
  const saved = (await getDoc(ref)).data()!;
  await commitGoalStatus(ref, "alice", "completed", "in_progress");
  assert.ok((await getDoc(ref)).data()!.updatedAt.isEqual(saved.updatedAt));
});

it("Rules allow only the declared transitions, even when bypassing the service", async () => {
  const statuses = Object.keys(goalStatusTransitions) as GoalStatus[];
  for (const previous of statuses) {
    for (const status of statuses) {
      const ref = await seed(`matrix-${previous}-${status}`, previous);
      const write = updateDoc(ref, { status, updatedAt: serverTimestamp() });
      // 同值寫入冇改變狀態；service 對同次重試會直接返回，唔發出寫入。
      if (status === previous || goalStatusTransitions[previous].includes(status)) await assertSucceeds(write);
      else await assertFails(write);
    }
  }
});

it("rejects malformed states, identity forgery, mixed metadata edits and fake timestamps", async () => {
  const ref = await seed("status-invalid");
  for (const changes of [
    { status: "unknown" }, { status: null }, { status: 1 }, { status: deleteField() },
    { title: "偷偷改名" }, { userId: "bob" }, { categoryId: "other-status-category" },
    { createdAt: Timestamp.fromMillis(0) }, { extra: true }, { currentValue: 10 },
    { updatedAt: Timestamp.fromMillis(0) }, { updatedAt: deleteField() },
  ]) {
    await assertFails(updateDoc(ref, { status: "in_progress", updatedAt: serverTimestamp(), ...changes }));
  }
  assert.equal((await getDoc(ref)).data()!.status, "not_started");
});

it("rejects guests, other accounts and missing or wrongly owned goals", async () => {
  const ref = await seed("status-private");
  for (const context of [env.authenticatedContext("bob"), env.unauthenticatedContext()]) {
    const foreign = doc(context.firestore(), ref.path);
    await assertFails(updateDoc(foreign, { status: "in_progress", updatedAt: serverTimestamp() }));
    await assert.rejects(commitGoalStatus(foreign, "alice", "in_progress", "not_started"));
  }
  await assert.rejects(commitGoalStatus(ref, "bob", "in_progress", "not_started"));
  await assert.rejects(commitGoalStatus(doc(ref.parent, "missing-status"), "alice", "in_progress", "not_started"));
  await assert.rejects(commitGoalStatus(ref, "alice", "unknown" as GoalStatus, "not_started"));
  await assert.rejects(commitGoalStatus(ref, "alice", "in_progress", "unknown" as GoalStatus));
});

it("rejects stale screens and concurrent competing status actions", async () => {
  const ref = await seed("status-stale", "in_progress");
  await commitGoalStatus(ref, "alice", "paused", "in_progress");
  await assert.rejects(commitGoalStatus(ref, "alice", "completed", "in_progress"), /狀態已改變/);
  assert.equal((await getDoc(ref)).data()!.status, "paused");
  const concurrent = await seed("status-concurrent", "in_progress");
  const results = await Promise.allSettled([
    commitGoalStatus(concurrent, "alice", "paused", "in_progress"),
    commitGoalStatus(concurrent, "alice", "completed", "in_progress"),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.ok(["paused", "completed"].includes((await getDoc(concurrent)).data()!.status));
});

it("child completion does not complete the parent, and parent status preserves all child data", async () => {
  const ref = await seed("status-children");
  const words = doc(ref, "subGoals/words");
  const teacher = doc(ref, "subGoals/teacher");
  const common = { userId: "alice", goalId: ref.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(words, { ...common, kind: "count", title: "學單字", targetValue: 2, currentValue: 0, unit: "個" });
  await setDoc(teacher, { ...common, kind: "checklist", title: "搵老師", isCompleted: false });
  await commitSubGoalProgress(words, "alice", ref.id, { progressDelta: 2, note: "今日學習" }, "learned");
  await updateDoc(teacher, { isCompleted: true, updatedAt: serverTimestamp() });
  assert.equal((await getDoc(ref)).data()!.status, "not_started");
  const before = (await getDoc(words)).data()!;
  for (const [previous, status] of [["not_started", "in_progress"], ["in_progress", "paused"],
    ["paused", "in_progress"], ["in_progress", "completed"]] as const) {
    await commitGoalStatus(ref, "alice", status, previous);
  }
  assert.deepEqual((await getDoc(words)).data(), before);
  assert.equal((await getDoc(teacher)).data()!.isCompleted, true);
  const histories = await getDocs(collection(words, "updates"));
  assert.equal(histories.size, 1);
  assert.equal(histories.docs[0].data().note, "今日學習");
  // 大目標由本人評估，唔要求所有子目標達標先准完成。
  const manual = await seed("status-manual", "in_progress");
  await setDoc(doc(manual, "subGoals/uncompleted"), { ...common, goalId: manual.id,
    kind: "checklist", title: "未完成項目", isCompleted: false });
  await commitGoalStatus(manual, "alice", "completed", "in_progress");
  assert.equal((await getDoc(manual)).data()!.status, "completed");
});
