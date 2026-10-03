import assert from "node:assert/strict";
import { it } from "node:test";
import { Timestamp } from "firebase/firestore";
import { toGoal } from "../src/features/goals/services/goal-data.ts";

const timestamp = Timestamp.fromDate(new Date(2026, 9, 3));
const data = { userId: "alice", title: "改善英文", categoryId: "english", status: "not_started", createdAt: timestamp, updatedAt: timestamp };

it("reads goals with no dates, one date or both dates", () => {
  const goal = toGoal("goal-id", data);
  assert.equal(goal.id, "goal-id");
  assert.equal(goal.startDate, undefined);
  assert.equal(goal.targetDate, undefined);
  assert.equal(goal.createdAt.getTime(), timestamp.toMillis());
  assert.equal(toGoal("id", { ...data, targetDate: timestamp }).startDate, undefined);
  assert.equal(toGoal("id", { ...data, targetDate: timestamp }).targetDate?.getTime(), timestamp.toMillis());
  const both = toGoal("id", { ...data, startDate: timestamp, targetDate: timestamp });
  assert.equal(both.startDate?.getTime(), timestamp.toMillis());
  assert.equal(both.targetDate?.getTime(), timestamp.toMillis());
});

it("reads legacy goals without using their quantities as parent goal progress", () => {
  const legacy = { ...data, status: "in_progress", targetValue: 10, currentValue: 3, unit: "題", startDate: timestamp, targetDate: timestamp };
  const goal = toGoal("legacy", legacy);
  assert.equal(goal.status, "in_progress");
  for (const field of ["targetValue", "currentValue", "unit"]) assert.equal(field in goal, false);
  assert.equal(legacy.currentValue, 3); // 讀取轉換唔會改原本資料。
});

it("rejects malformed stored dates and unknown statuses", () => {
  for (const changes of [{ startDate: null }, { targetDate: "2026-10-03" }, { createdAt: null }, { updatedAt: "bad" }, { status: "unknown" }]) {
    assert.throws(() => toGoal("id", { ...data, ...changes }));
  }
});
