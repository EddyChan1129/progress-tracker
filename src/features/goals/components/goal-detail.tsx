"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCategories } from "@/features/categories/services/category.service";
import { GoalCard } from "@/features/goals/components/goal-card";
import { deleteGoal, getGoal } from "@/features/goals/services/goal.service";
import type { Goal } from "@/features/goals/types/goal.types";
import { SubGoalList } from "./sub-goal-list";
import { GoalStatusActions } from "./goal-status-actions";

export function GoalDetail({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [categoryName, setCategoryName] = useState("未知分類");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting || !goal) return;
    if (!goal.deleting && !window.confirm(`確定刪除「${goal.title}」？旗下所有細目標及進度歷史亦會一併刪除，無法復原。學習記錄會保留並解除目標關聯。`)) return;
    setIsDeleting(true);
    setGoal({ ...goal, deleting: true });
    setDeleteError("");
    try {
      await deleteGoal(goal.id);
      router.push("/goals");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "刪除目標失敗，請再試一次。");
    } finally {
      setIsDeleting(false);
    }
  }

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
            <GoalStatusActions key={goal.id} goal={goal} disabled={isDeleting || Boolean(goal.deleting)} onChanged={(status) => {
              setGoal((current) => current ? { ...current, status } : current);
            }} />
            <div className="flex flex-wrap gap-2">
              {!goal.deleting ? <Button asChild variant="outline"><Link href={`/goals/${goal.id}/edit`}>編輯目標</Link></Button> : null}
              <Button disabled={isDeleting} onClick={handleDelete} type="button" variant="destructive">
                {isDeleting ? "刪除中…" : goal.deleting ? "重試刪除目標" : "刪除目標"}
              </Button>
            </div>
            {deleteError ? <p className="text-sm text-destructive" role="alert">{deleteError}</p> : null}
            <section className="space-y-5" aria-labelledby="sub-goals-heading">
              <h2 id="sub-goals-heading" className="text-xl font-semibold">細目標</h2>
              <SubGoalList key={goal.id} goalId={goal.id} disabled={isDeleting || goal.deleting} />
            </section>
          </>
        )
        : <p role="status">搵唔到呢個目標，或者佢唔屬於你。</p>}
      <Button asChild variant="outline"><Link href="/goals">返回目標列表</Link></Button>
    </div>
  );
}
