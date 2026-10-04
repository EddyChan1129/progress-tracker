import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, after, it } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch, type DocumentReference } from "firebase/firestore";
import { commitSubGoalProgress } from "../src/features/goals/services/sub-goal-progress.ts";

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-progress-tracker",
    firestore: { rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") } });
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/alice/goals/english"), { userId: "alice" });
  });
});
after(async () => { await env?.cleanup(); });

async function seed(id: string, overrides = {}) {
  const ref = doc(env.authenticatedContext("alice").firestore(), "users/alice/goals/english/subGoals", id);
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ref.path), { userId: "alice", goalId: "english", kind: "count",
      title: "學單字", targetValue: 300, unit: "個", currentValue: 50,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(), ...overrides });
  });
  return ref;
}

function pairedBatch(ref: DocumentReference, id: string, changes = {}, childChanges = {}) {
  const batch = writeBatch(ref.firestore);
  batch.update(ref, { currentValue: 52, lastUpdateId: id, updatedAt: serverTimestamp(), ...childChanges });
  batch.set(doc(ref, "updates", id), { userId: "alice", goalId: "english", subGoalId: ref.id,
    progressDelta: 2, previousValue: 50, currentValue: 52, createdAt: serverTimestamp(), ...changes });
  return batch;
}

it("concurrent +2/+3 transactions preserve both increments and histories", async () => {
  const ref = await seed("concurrent");
  await Promise.all([
    commitSubGoalProgress(ref, "alice", "english", { progressDelta: 2, note: "兩個" }, "plus-2"),
    commitSubGoalProgress(ref, "alice", "english", { progressDelta: 3 }, "plus-3"),
  ]);
  assert.equal((await getDoc(ref)).data()?.currentValue, 55);
  const histories = await getDocs(collection(ref, "updates"));
  assert.equal(histories.size, 2);
  assert.equal(histories.docs.reduce((sum, entry) => sum + entry.data().progressDelta, 0), 5);
});

it("retries the same operation without counting again, even after another update", async () => {
  const ref = await seed("retry");
  assert.equal(await commitSubGoalProgress(ref, "alice", "english", { progressDelta: 2 }, "same"), 52);
  await commitSubGoalProgress(ref, "alice", "english", { progressDelta: 3 }, "next");
  assert.equal(await commitSubGoalProgress(ref, "alice", "english", { progressDelta: 2 }, "same"), 55);
  await assert.rejects(commitSubGoalProgress(ref, "alice", "english", { progressDelta: 4 }, "same"));
  await assertFails(updateDoc(ref, { currentValue: 57, lastUpdateId: "same", updatedAt: serverTimestamp() }));
  assert.equal((await getDocs(collection(ref, "updates"))).size, 2);
});

it("concurrent retries of the same operation create exactly one history", async () => {
  const ref = await seed("concurrent-retry");
  await Promise.all(Array.from({ length: 3 }, () =>
    commitSubGoalProgress(ref, "alice", "english", { progressDelta: 2 }, "same-operation")));
  assert.equal((await getDoc(ref)).data()?.currentValue, 52);
  assert.equal((await getDocs(collection(ref, "updates"))).size, 1);
});

it("supports decimals and exceeding the target without clamping the history", async () => {
  const ref = await seed("decimal", { currentValue: 299 });
  assert.equal(await commitSubGoalProgress(ref, "alice", "english", { progressDelta: 2.5 }, "decimal"), 301.5);
});

it("rejects standalone total or history writes and preserves the original total", async () => {
  const ref = await seed("one-sided");
  await assertFails(updateDoc(ref, { currentValue: 52, lastUpdateId: "alone", updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(ref, "updates/alone"), { userId: "alice", goalId: "english", subGoalId: ref.id,
    progressDelta: 2, previousValue: 50, currentValue: 52, createdAt: serverTimestamp() }));
  assert.equal((await getDoc(ref)).data()?.currentValue, 50);
  assert.equal((await getDocs(collection(ref, "updates"))).size, 0);
});

it("rejects forged paired writes atomically, including wrong totals and unrelated field changes", async () => {
  const ref = await seed("forged");
  const invalidHistory = [
    { userId: "bob" }, { goalId: "other" }, { subGoalId: "other" }, { progressDelta: 0 },
    { progressDelta: -2 }, { progressDelta: "2" }, { progressDelta: Infinity }, { progressDelta: NaN },
    { previousValue: 49 }, { currentValue: 54 }, { note: 1 }, { note: " x " },
    { note: "x".repeat(2001) }, { extra: true }, { createdAt: Timestamp.fromMillis(1) },
  ];
  for (const [index, changes] of invalidHistory.entries()) {
    await assertFails(pairedBatch(ref, `bad-${index}`, changes).commit());
  }
  for (const [index, changes] of [{ title: "偷偷改" }, { targetValue: 400 }, { userId: "bob" },
    { updatedAt: Timestamp.fromMillis(1) }, { currentValue: 54 }, { lastUpdateId: "other" }].entries()) {
    await assertFails(pairedBatch(ref, `child-${index}`, {}, changes).commit());
  }
  assert.equal((await getDoc(ref)).data()?.currentValue, 50);
  assert.equal((await getDocs(collection(ref, "updates"))).size, 0);
  // 同一總數更新亦唔可以偷偷配兩筆歷史。
  const double = pairedBatch(ref, "first");
  double.set(doc(ref, "updates/second"), { userId: "alice", goalId: "english", subGoalId: ref.id,
    progressDelta: 2, previousValue: 50, currentValue: 52, createdAt: serverTimestamp() });
  await assertFails(double.commit());
});

it("keeps history immutable and denies another account or unauthenticated access", async () => {
  const ref = await seed("private");
  await assertSucceeds(pairedBatch(ref, "saved").commit());
  const history = doc(ref, "updates/saved");
  await assertFails(updateDoc(history, { note: "改歷史" }));
  await assertFails(deleteDoc(history));
  for (const context of [env.authenticatedContext("bob"), env.unauthenticatedContext()]) {
    const foreign = doc(context.firestore(), ref.path);
    await assertFails(getDoc(doc(foreign, "updates/saved")));
    await assertFails(getDocs(collection(foreign, "updates")));
    await assertFails(pairedBatch(foreign, "intruder", {}, { currentValue: 54 }).commit());
  }
});

it("rejects checklist, missing subgoals, missing parents and invalid service input", async () => {
  const checklist = await seed("checklist", { kind: "checklist", isCompleted: false });
  await assert.rejects(commitSubGoalProgress(checklist, "alice", "english", { progressDelta: 2 }, "check"));
  await assertFails(pairedBatch(checklist, "bypass").commit());
  const missing = doc(checklist.parent, "missing");
  await assert.rejects(commitSubGoalProgress(missing, "alice", "english", { progressDelta: 2 }, "missing"));
  const ref = await seed("invalid-input");
  for (const progressDelta of [0, -1, Infinity, NaN]) {
    await assert.rejects(commitSubGoalProgress(ref, "alice", "english", { progressDelta }, "invalid"));
  }
  await assert.rejects(commitSubGoalProgress(ref, "alice", "english", { progressDelta: 2 }, "../wrong"));
  const orphan = doc(ref.firestore, "users/alice/goals/missing/subGoals/words");
  await assertFails(pairedBatch(orphan, "orphan", { goalId: "missing" }).commit());
});

it("rolls back both writes if another write in the same batch is rejected", async () => {
  const ref = await seed("rollback");
  const batch = pairedBatch(ref, "rollback");
  batch.set(doc(ref.firestore, "unopened/rejected"), { value: 1 });
  await assertFails(batch.commit());
  assert.equal((await getDoc(ref)).data()?.currentValue, 50);
  assert.equal((await getDoc(doc(ref, "updates/rollback"))).exists(), false);
});

it("rejects overflow or increments too small to change the stored number", async () => {
  const ref = await seed("overflow", { currentValue: Number.MAX_VALUE });
  for (const progressDelta of [Number.MAX_VALUE, Number.MIN_VALUE]) {
    await assert.rejects(commitSubGoalProgress(ref, "alice", "english", { progressDelta }, "overflow"));
  }
  assert.equal((await getDocs(collection(ref, "updates"))).size, 0);
});
