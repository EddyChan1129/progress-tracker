import assert from "node:assert/strict";
import { it } from "node:test";
import { Timestamp } from "firebase/firestore";
import { subGoalProgressSchema } from "../src/features/goals/schemas/sub-goal-progress.schema.ts";
import { toSubGoalUpdate } from "../src/features/goals/services/sub-goal-progress.ts";

it("accepts positive decimal increments and trims optional notes", () => {
  assert.deepEqual(subGoalProgressSchema.parse({ progressDelta: 2.5, note: " 今日練習 " }), { progressDelta: 2.5, note: "今日練習" });
  assert.equal(subGoalProgressSchema.safeParse({ progressDelta: 2 }).success, true);
  for (const progressDelta of [0, -1, NaN, Infinity, "2", undefined]) {
    assert.equal(subGoalProgressSchema.safeParse({ progressDelta }).success, false);
  }
  for (const extra of [{ currentValue: 10 }, { userId: "bob" }, { createdAt: new Date() }, { note: "x".repeat(2001) }]) {
    assert.equal(subGoalProgressSchema.safeParse({ progressDelta: 2, ...extra }).success, false);
  }
});

it("maps history timestamps and rejects malformed stored totals", () => {
  const data = { userId: "alice", goalId: "english", subGoalId: "words", progressDelta: 2,
    previousValue: 50, currentValue: 52, createdAt: Timestamp.now() };
  const result = toSubGoalUpdate("operation", data);
  assert.equal(result.id, "operation");
  assert.equal(result.createdAt.getTime(), data.createdAt.toMillis());
  for (const extra of [{ previousValue: -1 }, { currentValue: 54 }, { currentValue: Infinity },
    { createdAt: "today" }, { userId: 1 }, { extra: true }]) {
    assert.throws(() => toSubGoalUpdate("operation", { ...data, ...extra }));
  }
});
