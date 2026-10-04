import type { Goal } from "../../goals/types/goal.types.ts";
import type { SubGoal } from "../../goals/types/sub-goal.types.ts";

function calendarDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function getLearningStreak(dates: Date[], today = new Date()) {
  const currentDay = calendarDay(today);
  const days = new Set(dates.map(calendarDay).filter((day) => day <= currentDay));
  let day = days.has(currentDay) ? currentDay : currentDay - 1;
  let streak = 0;
  while (days.has(day)) { streak += 1; day -= 1; }
  return streak;
}

export function getActiveGoals(goals: Goal[]) {
  return goals.filter((goal) => goal.status === "not_started" || goal.status === "in_progress");
}

export function getCompletedSubGoalCount(subGoals: SubGoal[]) {
  return subGoals.filter((goal) => goal.kind === "checklist" ? goal.isCompleted : goal.currentValue >= goal.targetValue).length;
}
