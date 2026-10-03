import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goalSchema } from "../src/features/goals/schemas/goal.schema.ts";

const validGoal = {
  title: " 成為冷氣師傅 ",
  categoryId: " career ",
};

describe("goalSchema", () => {
  it("accepts a parent goal without quantities or dates and trims text", () => {
    const goal = goalSchema.parse(validGoal);
    assert.equal(goal.title, "成為冷氣師傅");
    assert.equal(goal.categoryId, "career");
    assert.equal(goal.description, undefined);
    assert.equal(goal.startDate, undefined);
    assert.equal(goal.targetDate, undefined);
    assert.equal(goalSchema.parse({ ...validGoal, description: " 學識安裝同維修 " }).description, "學識安裝同維修");
  });

  it("treats blank dates as absent and accepts either date on its own", () => {
    // HTML date input 留空傳入 ""，唔係一個無效日期。
    const emptyDates = goalSchema.parse({ ...validGoal, startDate: "", targetDate: "" });
    assert.equal(emptyDates.startDate, undefined);
    assert.equal(emptyDates.targetDate, undefined);
    const startOnly = goalSchema.parse({ ...validGoal, startDate: "2026-10-03" });
    assert.ok(startOnly.startDate instanceof Date);
    assert.equal(startOnly.targetDate, undefined);
    const targetOnly = goalSchema.parse({ ...validGoal, startDate: "", targetDate: "2026-10-12" });
    assert.equal(targetOnly.startDate, undefined);
    assert.ok(targetOnly.targetDate instanceof Date);
  });

  it("converts supplied dates to local midnight", () => {
    const goal = goalSchema.parse({ ...validGoal, startDate: "2026-10-03", targetDate: "2026-10-12" });
    assert.ok(goal.startDate instanceof Date);
    assert.ok(goal.targetDate instanceof Date);
    assert.equal(goal.startDate.getFullYear(), 2026);
    assert.equal(goal.startDate.getMonth(), 9);
    assert.equal(goal.startDate.getDate(), 3);
    assert.equal(goal.startDate.getHours(), 0);
    assert.equal(goal.targetDate.getDate(), 12);
  });

  it("rejects blank required fields and overly long text", () => {
    for (const changes of [
      { title: " " }, { categoryId: " " }, { title: "a".repeat(101) },
      { description: "a".repeat(2001) }, { description: 123 },
    ]) {
      assert.equal(goalSchema.safeParse({ ...validGoal, ...changes }).success, false);
    }
    assert.equal(goalSchema.safeParse({ categoryId: "career" }).success, false);
    assert.equal(goalSchema.safeParse({ title: "Goal" }).success, false);
  });

  it("rejects malformed dates and reversed dates when both are supplied", () => {
    for (const changes of [
      { startDate: "2026-02-30" }, { targetDate: "2026-13-01" },
      { startDate: null }, { targetDate: " " },
    ]) {
      assert.equal(goalSchema.safeParse({ ...validGoal, ...changes }).success, false);
    }
    const result = goalSchema.safeParse({ ...validGoal, startDate: "2026-10-03", targetDate: "2026-10-02" });
    assert.equal(result.success, false);
    if (!result.success) assert.deepEqual(result.error.issues[0].path, ["targetDate"]);
    assert.equal(goalSchema.safeParse({ ...validGoal, startDate: "2026-10-03", targetDate: "2026-10-03" }).success, true);
  });

  it("rejects old quantity fields and system-controlled fields", () => {
    // 大目標唔再接收計量欄位；strict 亦拒絕偽造身份／狀態／時間。
    for (const field of ["targetValue", "unit", "id", "userId", "currentValue", "status", "createdAt", "updatedAt"]) {
      assert.equal(goalSchema.safeParse({ ...validGoal, [field]: "forged" }).success, false);
    }
  });
});
