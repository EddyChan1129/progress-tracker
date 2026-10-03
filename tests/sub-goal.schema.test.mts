import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { subGoalSchema } from "../src/features/goals/schemas/sub-goal.schema.ts";

const checklist = { kind: "checklist", title: " 搵老師 " };
const count = { kind: "count", title: " 學單字 ", targetValue: 300, unit: " 個 " };

describe("subGoalSchema", () => {
  it("accepts a checklist without quantities and trims text", () => {
    assert.deepEqual(subGoalSchema.parse(checklist), { kind: "checklist", title: "搵老師" });
    assert.equal(subGoalSchema.parse({ ...checklist, description: " 比較老師 " }).description, "比較老師");
  });

  it("accepts a count with a positive target and a trimmed unit", () => {
    assert.deepEqual(subGoalSchema.parse(count), { kind: "count", title: "學單字", targetValue: 300, unit: "個" });
    // 單位由使用者定義，數量可以係小數，例如 2.5 章。
    assert.equal(subGoalSchema.safeParse({ ...count, targetValue: 2.5, unit: "章" }).success, true);
  });

  it("requires a known kind and valid common text fields", () => {
    for (const input of [
      { title: "搵老師" }, { ...checklist, kind: "other" },
      { ...checklist, title: " " }, { ...count, title: "a".repeat(101) },
      { ...checklist, description: "a".repeat(2001) }, { ...count, description: 123 },
      { kind: "checklist" },
    ]) assert.equal(subGoalSchema.safeParse(input).success, false);
  });

  it("requires a finite positive count target and a nonblank unit", () => {
    for (const targetValue of [undefined, 0, -1, Infinity, NaN, "300"]) {
      assert.equal(subGoalSchema.safeParse({ ...count, targetValue }).success, false);
    }
    for (const unit of [undefined, "", " ", "a".repeat(21)]) {
      assert.equal(subGoalSchema.safeParse({ ...count, unit }).success, false);
    }
  });

  it("rejects mixing checklist and count fields", () => {
    for (const changes of [{ targetValue: 300 }, { currentValue: 0 }, { unit: "個" }]) {
      assert.equal(subGoalSchema.safeParse({ ...checklist, ...changes }).success, false);
    }
    assert.equal(subGoalSchema.safeParse({ ...count, isCompleted: false }).success, false);
  });

  it("rejects caller-controlled identity, progress, completion and timestamps", () => {
    for (const input of [checklist, count]) {
      for (const field of ["id", "userId", "goalId", "currentValue", "isCompleted", "createdAt", "updatedAt", "color"]) {
        assert.equal(subGoalSchema.safeParse({ ...input, [field]: "forged" }).success, false);
      }
    }
  });
});
