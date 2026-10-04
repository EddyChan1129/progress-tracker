import assert from "node:assert/strict";
import { it } from "node:test";
import { Timestamp } from "firebase/firestore";
import { toSubGoal } from "../src/features/goals/services/sub-goal-data.ts";

const time = Timestamp.fromDate(new Date(2026, 9, 3));
const common = { userId: "alice", goalId: "english", title: "搵老師", createdAt: time, updatedAt: time };

it("maps both kinds and Timestamp dates without mixing progress fields", () => {
  const checklist = toSubGoal("teacher", { ...common, kind: "checklist", isCompleted: false });
  assert.equal(checklist.id, "teacher");
  assert.equal(checklist.createdAt.getTime(), time.toMillis());
  assert.equal("currentValue" in checklist, false);
  const count = toSubGoal("words", { ...common, kind: "count", targetValue: 300, currentValue: 20, unit: "個" });
  assert.equal(count.kind, "count");
  if (count.kind === "count") assert.equal(count.currentValue, 20);
  assert.equal(toSubGoal("words", { ...common, kind: "count", targetValue: 300, currentValue: 22, unit: "個", lastUpdateId: "operation" }).kind, "count");
  assert.equal("isCompleted" in count, false);
});

it("rejects malformed stored ownership, dates, kinds and progress", () => {
  const checklist = { ...common, kind: "checklist", isCompleted: false };
  for (const changes of [{ userId: null }, { goalId: 1 }, { createdAt: null }, { updatedAt: "bad" }, { kind: "other" }, { isCompleted: 0 }, { currentValue: 0 }, { unit: "次" }]) {
    assert.throws(() => toSubGoal("id", { ...checklist, ...changes }));
  }
  const count = { ...common, kind: "count", targetValue: 300, currentValue: 0, unit: "個" };
  for (const changes of [{ currentValue: -1 }, { currentValue: "0" }, { currentValue: Infinity }, { targetValue: 0 }, { isCompleted: false }]) {
    assert.throws(() => toSubGoal("id", { ...count, ...changes }));
  }
});
