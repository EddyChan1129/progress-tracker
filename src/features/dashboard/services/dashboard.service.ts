import { getCategories } from "@/features/categories/services/category.service";
import { getGoals } from "@/features/goals/services/goal.service";
import { getSubGoals } from "@/features/goals/services/sub-goal.service";
import { getLearningEntries } from "@/features/learning/services/learning.service";
import { getActiveGoals, getCompletedSubGoalCount, getLearningStreak } from "./dashboard-data";

export async function getDashboardData() {
  const [entries, goals, categories] = await Promise.all([getLearningEntries(), getGoals(), getCategories()]);
  const activeGoals = await Promise.all(getActiveGoals(goals).map(async (goal) => {
    const subGoals = await getSubGoals(goal.id);
    return { goal, completed: getCompletedSubGoalCount(subGoals), total: subGoals.length };
  }));
  // 全量學習日期計算 streak；最近列表只喺計算完成後截取。
  return {
    recentEntries: entries.slice(0, 8), activeGoals, categories,
    streak: getLearningStreak(entries.map((entry) => entry.learnedAt)),
    entryCount: entries.length,
    completedGoalCount: goals.filter((goal) => goal.status === "completed").length,
  };
}
