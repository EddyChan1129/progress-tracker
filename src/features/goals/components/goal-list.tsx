"use client";

import { useEffect, useState } from "react";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";
import { GoalCard } from "@/features/goals/components/goal-card";
import { getGoals } from "@/features/goals/services/goal.service";
import type { Goal } from "@/features/goals/types/goal.types";

export function GoalList() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;
    // 兩份資料互不依賴，可以同時讀取。
    Promise.all([getGoals(), getCategories()])
      .then(([goalResult, categoryResult]) => {
        if (!isCurrent) return;
        setGoals(goalResult);
        setCategories(categoryResult);
      })
      .catch(() => { if (isCurrent) setErrorMessage("未能載入目標，請重新整理再試。"); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, []);

  if (isLoading) return <p className="mt-8 text-sm text-muted-foreground" role="status">載入目標中…</p>;
  if (errorMessage) return <p className="mt-8 text-sm text-destructive" role="alert">{errorMessage}</p>;
  if (goals.length === 0) return <p className="mt-8 text-muted-foreground">暫時未有目標，可以先新增一個大目標。</p>;

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return (
    <div className="mt-7 space-y-4">
      <p className="text-sm text-muted-foreground">共 {goals.length} 個大目標</p>
      <ScrollPanel label="大目標列表"><div className="grid gap-4 xl:grid-cols-2">
      {goals.map((goal) => <GoalCard key={goal.id} goal={goal} categoryName={categoryNames.get(goal.categoryId) ?? "未知分類"} />)}
      </div></ScrollPanel>
    </div>
  );
}
