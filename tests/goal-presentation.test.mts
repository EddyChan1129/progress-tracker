import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareGoals,
  getDeadline,
  getStageLabel,
  numberFormatter,
} from "../src/features/goals/goal-presentation.ts";
import type { Goal } from "../src/features/goals/types/goal.types.ts";

const today = new Date(2026, 9, 6, 18);
const goal: Goal = {
  id: "one",
  userId: "user",
  title: "練習",
  categoryId: "cat",
  status: "in_progress",
  createdAt: today,
  updatedAt: today,
};

test("deadline labels use calendar days, ignore completed/paused goals, and keep optional dates", () => {
  assert.equal(getDeadline(goal, today), null);
  assert.equal(
    getDeadline({ ...goal, targetDate: new Date(2026, 9, 6) }, today)?.label,
    "今日到期",
  );
  assert.equal(
    getDeadline({ ...goal, targetDate: new Date(2026, 9, 5) }, today)?.label,
    "已逾期 1 日",
  );
  for (const status of ["completed", "paused"] as const)
    assert.equal(
      getDeadline({ ...goal, status, targetDate: new Date(2026, 9, 5) }, today)
        ?.overdue,
      false,
    );
  assert.equal(
    getDeadline(
      { ...goal, targetDate: new Date(2027, 0, 3) },
      today,
    )?.date.includes("2027"),
    true,
  );
  assert.equal(
    getStageLabel(
      { ...goal, status: "not_started", startDate: new Date(2026, 9, 7) },
      today,
    ),
    "即將開始",
  );
  assert.equal(
    getStageLabel(
      { ...goal, status: "not_started", startDate: new Date(2026, 9, 6) },
      today,
    ),
    "未開始",
  );
});

test("goals sort by stage, then deadline, with undated goals last and stable recency", () => {
  const goals: Goal[] = [
    { ...goal, id: "done", status: "completed" },
    { ...goal, id: "undated" },
    { ...goal, id: "upcoming", status: "not_started" },
    { ...goal, id: "later", targetDate: new Date(2026, 9, 10) },
    { ...goal, id: "overdue", targetDate: new Date(2026, 9, 5) },
  ];
  assert.deepEqual(
    goals.sort(compareGoals).map((item) => item.id),
    ["overdue", "later", "undated", "upcoming", "done"],
  );
});

test("count formatting separates thousands and preserves small valid progress", () => {
  assert.equal(numberFormatter.format(1234567.89), "1,234,567.89");
  assert.equal(numberFormatter.format(0.001), "0.001");
  assert.equal(numberFormatter.format(0.1 + 0.2), "0.3");
});
