import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { learningEntrySchema } from "../src/features/learning/schemas/learning.schema.ts";

const validEntry = {
  title: "Two Sum",
  content: "學識用 Map 儲存已見過嘅數字。",
  categoryId: "leetcode",
  learnedAt: "2026-09-28",
};

describe("learningEntrySchema", () => {
  it("accepts an optional goal and rejects invalid document paths", () => {
    assert.equal(learningEntrySchema.parse({ ...validEntry, relatedGoalId: "" }).relatedGoalId, undefined);
    assert.equal(learningEntrySchema.parse({ ...validEntry, relatedGoalId: "goal-1" }).relatedGoalId, "goal-1");
    for (const relatedGoalId of ["../bob", "goals/other", ".", "..", "a".repeat(101), null]) {
      assert.equal(learningEntrySchema.safeParse({ ...validEntry, relatedGoalId }).success, false);
    }
  });
  it("accepts valid input and converts the date", () => {
    const result = learningEntrySchema.safeParse(validEntry);

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.learnedAt.getFullYear(), 2026);
    assert.equal(result.data.learnedAt.getMonth(), 8);
    assert.equal(result.data.learnedAt.getDate(), 28);
  });

  it("rejects an invalid date", () => {
    const result = learningEntrySchema.safeParse({
      ...validEntry,
      learnedAt: "2026-02-30",
    });

    assert.equal(result.success, false);
  });

  it("rejects blank content", () => {
    const result = learningEntrySchema.safeParse({
      ...validEntry,
      content: "   ",
    });

    assert.equal(result.success, false);
  });

  it("rejects a title longer than 100 characters", () => {
    const result = learningEntrySchema.safeParse({
      ...validEntry,
      title: "a".repeat(101),
    });

    assert.equal(result.success, false);
  });
});
