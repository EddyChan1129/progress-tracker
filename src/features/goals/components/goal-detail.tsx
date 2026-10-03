"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/features/categories/services/category.service";
import { GoalCard } from "@/features/goals/components/goal-card";
import { getGoal } from "@/features/goals/services/goal.service";
import type { Goal } from "@/features/goals/types/goal.types";
import { SubGoalList } from "./sub-goal-list";

export function GoalDetail({ goalId }: { goalId: string }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [categoryName, setCategoryName] = useState("未知分類");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;
    Promise.all([getGoal(goalId), getCategories()])
      .then(([goalResult, categories]) => {
        if (!isCurrent) return;
        setGoal(goalResult);
        setCategoryName(categories.find((category) => category.id === goalResult?.categoryId)?.name ?? "未知分類");
      })
      .catch(() => { if (isCurrent) setErrorMessage("未能載入目標，請重新整理再試。"); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, [goalId]);

  return (
    <div className="mt-8 space-y-5">
      {isLoading ? <p className="text-sm text-muted-foreground" role="status">載入目標中…</p>
        : errorMessage ? <p className="text-sm text-destructive" role="alert">{errorMessage}</p>
        : goal ? (
          <>
            <GoalCard goal={goal} categoryName={categoryName} showDetailLink={false} />
            <Button asChild variant="outline"><Link href={`/goals/${goal.id}/edit`}>編輯目標</Link></Button>
            <section className="space-y-5" aria-labelledby="sub-goals-heading">
              <h2 id="sub-goals-heading" className="text-xl font-semibold">細目標</h2>
              <SubGoalList key={goal.id} goalId={goal.id} />
            </section>
          </>
        )
        : <p role="status">搵唔到呢個目標，或者佢唔屬於你。</p>}
      <Button asChild variant="outline"><Link href="/goals">返回目標列表</Link></Button>
    </div>
  );
}
