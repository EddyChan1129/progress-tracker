import type { Goal, GoalStatus } from "./types/goal.types.ts";

export const statusLabels: Record<GoalStatus, string> = {
  not_started: "未開始",
  in_progress: "進行中",
  completed: "已完成",
  paused: "已暫停",
};

export const numberFormatter = new Intl.NumberFormat("zh-HK", {
  maximumSignificantDigits: 15,
});

function calendarDay(date: Date) {
  return (
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

export function getStageLabel(goal: Goal, today = new Date()) {
  return goal.status === "not_started" &&
    goal.startDate &&
    calendarDay(goal.startDate) > calendarDay(today)
    ? "即將開始"
    : statusLabels[goal.status];
}

export function getDeadline(goal: Goal, today = new Date()) {
  if (!goal.targetDate) return null;
  const days = calendarDay(goal.targetDate) - calendarDay(today);
  const active = goal.status === "in_progress" || goal.status === "not_started";
  const date = new Intl.DateTimeFormat("zh-HK", {
    ...(goal.targetDate.getFullYear() !== today.getFullYear()
      ? { year: "numeric" as const }
      : {}),
    month: "short",
    day: "numeric",
  }).format(goal.targetDate);
  return {
    overdue: active && days < 0,
    label:
      active && days < 0
        ? `已逾期 ${numberFormatter.format(-days)} 日`
        : active && days === 0
          ? "今日到期"
          : `${date} 到期`,
    date,
  };
}

// Keep active work first, then paused and completed; nearest deadlines first within each group.
export function compareGoals(a: Goal, b: Goal) {
  const rank = { in_progress: 0, not_started: 1, paused: 2, completed: 3 };
  return (
    rank[a.status] - rank[b.status] ||
    (a.targetDate?.getTime() ?? Infinity) -
      (b.targetDate?.getTime() ?? Infinity) ||
    b.createdAt.getTime() - a.createdAt.getTime()
  );
}
