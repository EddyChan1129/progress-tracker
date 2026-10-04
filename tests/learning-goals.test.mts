import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, it, mock } from "node:test";
import { deleteApp, getApps } from "firebase-admin/app";
import { Timestamp } from "firebase-admin/firestore";
import { POST, PATCH, DELETE } from "../src/app/api/learning-entries/route.ts";
import { DELETE as deleteGoal } from "../src/app/api/goals/route.ts";
import { getAdminAuth, getAdminDb } from "../src/lib/firebase/admin.ts";

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Use the Firestore emulator.");
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-progress-tracker";
after(async () => { mock.restoreAll(); await Promise.all(getApps().map(deleteApp)); });

it("links only owned goals, unlinks notes during goal deletion and preserves history when deleting only a note", async () => {
  const userId = "link-alice";
  mock.method(getAdminAuth(), "verifyIdToken", async () => ({ uid: userId }));
  const db = getAdminDb();
  const owner = db.collection("users").doc(userId);
  const category = owner.collection("categories").doc(randomUUID());
  await category.set({ userId, name: "Learning" });
  const one = owner.collection("goals").doc(randomUUID());
  const two = owner.collection("goals").doc(randomUUID());
  const foreign = db.collection("users").doc("link-bob").collection("goals").doc(randomUUID());
  const forged = owner.collection("goals").doc(randomUUID());
  await Promise.all([one.set({ userId }), two.set({ userId }), foreign.set({ userId: "link-bob" }), forged.set({ userId: "link-bob" })]);
  const history = one.collection("subGoals").doc("count").collection("updates").doc("history");
  await history.set({ currentValue: 2 });
  const body = { entryId: randomUUID(), input: { title: "Note", content: "Practice", categoryId: category.id, learnedAt: "2026-10-04", relatedGoalId: one.id }, timezoneOffset: -480, publicIds: [] };
  const request = (data: unknown) => new Request("http://localhost/api/test", { method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const ref = owner.collection("learningEntries").doc(body.entryId);
  for (const relatedGoalId of ["missing", foreign.id, forged.id]) {
    assert.equal((await POST(request({ ...body, input: { ...body.input, relatedGoalId } }))).status, 400);
    assert.equal((await ref.get()).exists, false);
  }
  assert.equal((await POST(request(body))).status, 200);
  assert.equal((await ref.get()).data()!.relatedGoalId, one.id);
  assert.equal((await POST(request(body))).status, 200);
  assert.equal((await POST(request({ ...body, input: { ...body.input, relatedGoalId: two.id } }))).status, 409);

  const edit = async (relatedGoalId: string) => PATCH(request({ ...body, input: { ...body.input, relatedGoalId }, operationId: randomUUID(), expectedUpdatedAt: Math.floor((await ref.get()).data()!.updatedAt.toMillis()) }));
  assert.equal((await edit(foreign.id)).status, 400);
  assert.equal((await ref.get()).data()!.relatedGoalId, one.id);
  assert.equal((await edit(two.id)).status, 200);
  assert.equal((await ref.get()).data()!.relatedGoalId, two.id);
  assert.equal((await deleteGoal(request({ goalId: two.id }))).status, 200);
  assert.equal("relatedGoalId" in (await ref.get()).data()!, false);
  assert.equal((await edit("")).status, 200);
  assert.equal("relatedGoalId" in (await ref.get()).data()!, false);
  assert.equal((await deleteGoal(request({ goalId: two.id }))).status, 200);
  assert.equal((await DELETE(request({ entryId: body.entryId }))).status, 200);
  assert.deepEqual((await history.get()).data(), { currentValue: 2 });
  assert.equal((await deleteGoal(request({ goalId: one.id }))).status, 200);
  assert.equal((await history.get()).exists, false);

  // 新關聯同刪目標並行時，唔可以產生指向已刪除目標嘅記錄。
  const racingGoal = owner.collection("goals").doc(randomUUID());
  await racingGoal.set({ userId, createdAt: Timestamp.now() });
  const racingEntry = { ...body, entryId: randomUUID(), input: { ...body.input, relatedGoalId: racingGoal.id } };
  await Promise.all([POST(request(racingEntry)), deleteGoal(request({ goalId: racingGoal.id }))]);
  const [goalSnapshot, entrySnapshot] = await Promise.all([racingGoal.get(), owner.collection("learningEntries").doc(racingEntry.entryId).get()]);
  assert.ok(!entrySnapshot.exists || !entrySnapshot.data()?.relatedGoalId || goalSnapshot.exists);
});
