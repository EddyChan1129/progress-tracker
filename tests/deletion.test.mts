import assert from "node:assert/strict";
import { after, it, mock } from "node:test";
import { randomUUID } from "node:crypto";
import { deleteApp, getApps } from "firebase-admin/app";
import { Timestamp } from "firebase-admin/firestore";
import { DELETE as deleteGoal } from "../src/app/api/goals/route.ts";
import { DELETE as deleteCategory } from "../src/app/api/categories/route.ts";
import { POST as createEntry } from "../src/app/api/learning-entries/route.ts";
import { getAdminAuth, getAdminDb } from "../src/lib/firebase/admin.ts";

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Use the Firestore emulator.");
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-progress-tracker";
after(async () => { mock.restoreAll(); await Promise.all(getApps().map(deleteApp)); });
const userId = "delete-alice";
const request = (body: unknown) => new Request("http://localhost/api/test", {
  method: "DELETE", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: JSON.stringify(body),
});

it("requires authentication and rejects forged ownership, IDs and caller-provided UID", async () => {
  const guest = new Request("http://localhost/api/test", { method: "DELETE" });
  assert.equal((await deleteGoal(guest)).status, 401);
  assert.equal((await deleteCategory(guest)).status, 401);
  mock.method(getAdminAuth(), "verifyIdToken", async () => ({ uid: userId }));
  for (const body of [{ goalId: "../bob" }, { goalId: "g", userId: "bob" }, { goalId: "g", subGoalId: "../child" }]) {
    assert.equal((await deleteGoal(request(body))).status, 400);
  }
  assert.equal((await deleteCategory(request({ categoryId: "../bob" }))).status, 400);
  const db = getAdminDb();
  await db.doc(`users/${userId}/goals/forged`).set({ userId: "bob" });
  await db.doc(`users/${userId}/categories/forged`).set({ userId: "bob" });
  assert.equal((await deleteGoal(request({ goalId: "forged" }))).status, 404);
  assert.equal((await deleteCategory(request({ categoryId: "forged" }))).status, 404);
  assert.equal((await db.doc(`users/${userId}/goals/forged`).get()).exists, true);
});

it("deletes one subgoal and its history, retains siblings and parent, and resumes interrupted deletion", async () => {
  const db = getAdminDb();
  const goal = db.doc(`users/${userId}/goals/independent`);
  const child = goal.collection("subGoals").doc("count");
  const sibling = goal.collection("subGoals").doc("checklist");
  const history = child.collection("updates").doc("one");
  await Promise.all([goal.set({ userId }), child.set({ userId, goalId: goal.id, kind: "count" }), sibling.set({ userId, goalId: goal.id }), history.set({ currentValue: 1 })]);
  const interrupted = mock.method(db, "recursiveDelete", async () => { throw new Error("Simulated outage"); });
  assert.equal((await deleteGoal(request({ goalId: goal.id, subGoalId: child.id }))).status, 502);
  assert.equal((await child.get()).data()?.deleting, true);
  assert.equal((await history.get()).exists, true);
  interrupted.mock.restore();
  assert.equal((await deleteGoal(request({ goalId: goal.id, subGoalId: child.id }))).status, 200);
  assert.equal((await child.get()).exists, false);
  assert.equal((await history.get()).exists, false);
  assert.equal((await sibling.get()).exists, true);
  assert.equal((await goal.get()).exists, true);
  assert.equal((await deleteGoal(request({ goalId: goal.id, subGoalId: child.id }))).status, 200);
});

it("cascades more than 500 history documents, unlinks more than one page of notes, and keeps other accounts untouched", async () => {
  const db = getAdminDb();
  const goal = db.doc(`users/${userId}/goals/cascade`);
  const child = goal.collection("subGoals").doc("count");
  const foreign = db.doc("users/delete-bob/goals/cascade/subGoals/count/updates/one");
  const writer = db.bulkWriter();
  writer.set(goal, { userId });
  writer.set(child, { userId, goalId: goal.id });
  for (let i = 0; i < 550; i++) writer.set(child.collection("updates").doc(`history-${i}`), { currentValue: i });
  for (let i = 0; i < 105; i++) writer.set(db.doc(`users/${userId}/learningEntries/note-${i}`), {
    userId, relatedGoalId: goal.id, title: `Note ${i}`, content: "Keep my learning", images: [{ publicId: "keep-image" }],
  });
  writer.set(foreign, { currentValue: 1 });
  await writer.close();
  const interrupted = mock.method(db, "recursiveDelete", async () => { throw new Error("Simulated outage"); });
  assert.equal((await deleteGoal(request({ goalId: goal.id }))).status, 502);
  assert.equal((await goal.get()).data()?.deleting, true);
  assert.equal((await deleteGoal(request({ goalId: goal.id, subGoalId: child.id }))).status, 409);
  interrupted.mock.restore();
  assert.equal((await deleteGoal(request({ goalId: goal.id }))).status, 200);
  assert.equal((await goal.get()).exists, false);
  assert.equal((await child.get()).exists, false);
  assert.equal((await child.collection("updates").get()).size, 0);
  const notes = await db.collection(`users/${userId}/learningEntries`).get();
  assert.equal(notes.size, 105);
  for (const note of notes.docs) {
    assert.equal(note.data().relatedGoalId, undefined);
    assert.equal(note.data().content, "Keep my learning");
    assert.deepEqual(note.data().images, [{ publicId: "keep-image" }]);
    assert.ok(note.data().updatedAt instanceof Timestamp);
  }
  assert.equal((await foreign.get()).exists, true);
  assert.equal((await deleteGoal(request({ goalId: goal.id }))).status, 200);
});

it("deletes only unused categories; a used category requires reassigning its entries and goals first", async () => {
  const db = getAdminDb();
  const owner = db.collection("users").doc(userId);
  const category = owner.collection("categories").doc("unused");
  const goal = owner.collection("goals").doc("category-goal");
  const entry = owner.collection("learningEntries").doc("category-note");
  await category.set({ userId });
  await goal.set({ userId, categoryId: category.id });
  assert.equal((await deleteCategory(request({ categoryId: category.id }))).status, 409);
  await goal.delete();
  await entry.set({ userId, categoryId: category.id });
  assert.equal((await deleteCategory(request({ categoryId: category.id }))).status, 409);
  await entry.delete();
  assert.equal((await deleteCategory(request({ categoryId: category.id }))).status, 200);
  assert.equal((await category.get()).exists, false);
  assert.equal((await deleteCategory(request({ categoryId: category.id }))).status, 200);
});

it("rejects new goal references during deletion and serializes category deletion against entry creation", async () => {
  const db = getAdminDb();
  const owner = db.collection("users").doc(userId);
  const category = owner.collection("categories").doc("racing-category");
  await category.set({ userId });
  await owner.collection("goals").doc("locked-goal").set({ userId, deleting: true });
  const body = {
    entryId: randomUUID(), input: { title: "Race note", content: "Keep this", categoryId: category.id, learnedAt: "2026-10-05" },
    publicIds: [], timezoneOffset: -480,
  };
  assert.equal((await createEntry(request({ ...body, input: { ...body.input, relatedGoalId: "locked-goal" } }))).status, 400);
  assert.equal((await owner.collection("learningEntries").doc(body.entryId).get()).exists, false);
  await Promise.all([createEntry(request(body)), deleteCategory(request({ categoryId: category.id }))]);
  const [note, remainingCategory] = await Promise.all([owner.collection("learningEntries").doc(body.entryId).get(), category.get()]);
  assert.ok(!note.exists || remainingCategory.exists);
});
