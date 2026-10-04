import assert from "node:assert/strict";
import { it } from "node:test";
import { getActiveGoals, getCompletedSubGoalCount, getLearningStreak } from "../src/features/dashboard/services/dashboard-data.ts";
import type { Goal } from "../src/features/goals/types/goal.types.ts";
import type { SubGoal } from "../src/features/goals/types/sub-goal.types.ts";

const localDate = (value: string) => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); };

it("counts local calendar days, deduplicates entries, ignores future dates and accepts yesterday", () => {
  const today = localDate("2026-10-04");
  assert.equal(getLearningStreak([], today), 0);
  assert.equal(getLearningStreak([localDate("2026-10-05")], today), 0);
  assert.equal(getLearningStreak(["2026-10-04", "2026-10-04", "2026-10-03", "2026-10-05"].map(localDate), today), 2);
  assert.equal(getLearningStreak(["2026-10-03", "2026-10-02"].map(localDate), today), 2);
  assert.equal(getLearningStreak(["2026-10-02", "2026-10-01"].map(localDate), today), 0);
  assert.equal(getLearningStreak(["2026-10-04", "2026-10-02"].map(localDate), today), 1);
  assert.equal(getLearningStreak(["2026-10-01", "2026-09-30"].map(localDate), localDate("2026-10-01")), 2);
  assert.equal(getLearningStreak(["2027-01-01", "2026-12-31"].map(localDate), localDate("2027-01-01")), 2);
  assert.equal(getLearningStreak(["2026-03-09", "2026-03-08", "2026-03-07"].map(localDate), localDate("2026-03-09")), 3);
  const allDays = Array.from({ length: 120 }, (_, i) => new Date(2026, 9, 4 - i));
  assert.equal(getLearningStreak(allDays, today), 120);
});

it("excludes paused/completed goals and counts completed checklist and count sub-goals", () => {
  const goals = ["not_started", "in_progress", "paused", "completed"].map((status) => ({ status })) as Goal[];
  assert.deepEqual(getActiveGoals(goals).map((goal) => goal.status), ["not_started", "in_progress"]);
  const subGoals = [
    { kind: "checklist", isCompleted: true }, { kind: "checklist", isCompleted: false },
    { kind: "count", currentValue: 1, targetValue: 2 }, { kind: "count", currentValue: 2, targetValue: 2 },
    { kind: "count", currentValue: 3, targetValue: 2 },
  ] as SubGoal[];
  assert.equal(getCompletedSubGoalCount(subGoals), 3);
  assert.equal(getCompletedSubGoalCount([]), 0);
  assert.deepEqual(goals.map((goal) => goal.status), ["not_started", "in_progress", "paused", "completed"]);
});
