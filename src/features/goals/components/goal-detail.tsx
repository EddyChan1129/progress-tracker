"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
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
    setIsDeleting(true);
    setGoal({ ...goal, deleting: true });
    setDeleteError("");
    try {
      await deleteGoal(goal.id);
      router.push("/goals");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "刪除目標失敗，請再試一次。",
      );
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
        setCategoryName(
          categories.find((category) => category.id === goalResult?.categoryId)
            ?.name ?? "未知分類",
        );
      })
      .catch(() => {
        if (isCurrent) setErrorMessage("未能載入目標，請重新整理再試。");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [goalId]);

  return (
    <div className="space-y-5">
      <Link
        href="/goals"
        className="inline-flex min-h-11 items-center gap-2 rounded text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft aria-hidden size={15} />
        返回目標列表
      </Link>
      {isLoading ? (
        <ListSkeleton label="載入目標中…" />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : goal ? (
        <>
          <GoalCard
            goal={goal}
            categoryName={categoryName}
            showDetailLink={false}
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <GoalStatusActions
              key={goal.id}
              goal={goal}
              disabled={isDeleting || Boolean(goal.deleting)}
              onChanged={(status) => {
                setGoal((current) =>
                  current ? { ...current, status } : current,
                );
              }}
            />
            <div className="flex flex-wrap gap-2">
              {!goal.deleting ? (
                <Button asChild variant="outline">
                  <Link href={`/goals/${goal.id}/edit`}>
                    <Pencil aria-hidden />
                    編輯目標
                  </Link>
                </Button>
              ) : null}
              {goal.deleting ? (
                <Button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  type="button"
                  variant="destructive"
                >
                  {isDeleting ? "刪除中…" : "重試刪除目標"}
                </Button>
              ) : (
                <ConfirmAction
                  title="刪除目標？"
                  description={`「${goal.title}」\n旗下所有細目標及進度歷史亦會一併刪除，無法復原。學習記錄會保留並解除目標關聯。`}
                  onConfirm={handleDelete}
                  disabled={isDeleting}
                  variant="ghost"
                  className="text-muted-foreground"
                >
                  <Trash2 aria-hidden />
                  刪除目標
                </ConfirmAction>
              )}
            </div>
          </div>
          {deleteError ? (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}
          <section
            className="space-y-3 border-t pt-6"
            aria-labelledby="sub-goals-heading"
          >
            <h2 id="sub-goals-heading" className="text-base font-semibold">
              細目標
            </h2>
            <SubGoalList
              key={goal.id}
              goalId={goal.id}
              disabled={isDeleting || goal.deleting}
            />
          </section>
        </>
      ) : (
        <EmptyState title="搵唔到呢個目標，或者佢唔屬於你。" />
      )}
    </div>
  );
}
