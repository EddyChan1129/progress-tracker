import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goalSchema } from "../src/features/goals/schemas/goal.schema.ts";

const validGoal = {
  title: " 完成 10 題 ",
  categoryId: "leetcode",
  targetValue: 10,
  unit: " 題 ",
  startDate: "2026-10-03",
  targetDate: "2026-10-12",
};

describe("goalSchema", () => {
  it("accepts valid input, trims text and converts dates to local midnight", () => {
    const goal = goalSchema.parse(validGoal);
    assert.equal(goal.title, "完成 10 題");
    assert.equal(goal.unit, "題");
    assert.equal(goal.startDate.getFullYear(), 2026);
    assert.equal(goal.startDate.getMonth(), 9);
    assert.equal(goal.startDate.getDate(), 3);
    assert.equal(goal.startDate.getHours(), 0);
    assert.equal(goal.targetDate.getDate(), 12);
    assert.equal(goal.description, undefined);
  });

  it("rejects zero, negative, non-finite and non-numeric targets", () => {
    for (const targetValue of [0, -1, Infinity, NaN, "10"]) {
      assert.equal(goalSchema.safeParse({ ...validGoal, targetValue }).success, false);
    }
  });

  it("rejects blank required fields and overly long text", () => {
    for (const changes of [
      { title: " " }, { categoryId: " " }, { unit: " " },
      { title: "a".repeat(101) }, { unit: "a".repeat(21) }, { description: "a".repeat(2001) },
    ]) {
      assert.equal(goalSchema.safeParse({ ...validGoal, ...changes }).success, false);
    }
  });

  it("rejects invalid dates and a deadline before the start, but accepts the same day", () => {
    for (const changes of [{ startDate: "2026-02-30" }, { targetDate: "2026-13-01" }, { targetDate: "2026-10-02" }]) {
      assert.equal(goalSchema.safeParse({ ...validGoal, ...changes }).success, false);
    }
    const result = goalSchema.safeParse({ ...validGoal, targetDate: "2026-10-02" });
    assert.equal(result.success, false);
    if (!result.success) assert.deepEqual(result.error.issues[0].path, ["targetDate"]);
    assert.equal(goalSchema.safeParse({ ...validGoal, targetDate: validGoal.startDate }).success, true);
  });

  it("rejects system-controlled fields in a creation request", () => {
    // 前端 validation 都唔容許自行傳進度／身份；Task 23 再加真正 Firestore 保護。
    for (const field of ["id", "userId", "currentValue", "status", "createdAt", "updatedAt"]) {
      assert.equal(goalSchema.safeParse({ ...validGoal, [field]: "forged" }).success, false);
    }
  });
});
