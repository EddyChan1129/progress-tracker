"use client";

import { useEffect, useState } from "react";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { getGoals } from "@/features/goals/services/goal.service";
import type { Goal } from "@/features/goals/types/goal.types";

import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";
import { ImageCleanupStatus } from "./image-cleanup-status";
import { LearningCard } from "@/features/learning/components/learning-card";
import { getLearningEntries } from "@/features/learning/services/learning.service";
import type { LearningEntry } from "@/features/learning/types/learning.types";

export function LearningList() {
  const [cleanupVersion, setCleanupVersion] = useState(0);
  const [entries, setEntries] = useState<LearningEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getLearningEntries(), getCategories(), getGoals()])
      .then(([entryResult, categoryResult, goalResult]) => {
        if (!isCurrent) return;

        setEntries(entryResult);
        setCategories(categoryResult);
        setGoals(goalResult);
      })
      .catch(() => {
        if (isCurrent) {
          setErrorMessage("未能載入學習記錄，請重新整理再試。");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p className="mt-8 text-sm text-muted-foreground" role="status">
        載入學習記錄中…
      </p>
    );
  }

  if (errorMessage) {
    return (
      <p className="mt-8 text-sm text-destructive" role="alert">
        {errorMessage}
      </p>
    );
  }

  if (entries.length === 0) {
    return <div className="mt-8 space-y-4"><ImageCleanupStatus key={cleanupVersion} /><p className="text-muted-foreground">暫時未有學習記錄。</p></div>;
  }

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const goalNames = new Map(goals.map((goal) => [goal.id, goal.title]));

  return (
    <div className="mt-7 space-y-4">
      <ImageCleanupStatus key={cleanupVersion} />
      <p className="text-sm text-muted-foreground">共 {entries.length} 筆記錄</p>
      <ScrollPanel label="學習記錄列表"><div className="grid gap-4">
      {entries.map((entry) => (
        <LearningCard
          categoryName={categoryNames.get(entry.categoryId) ?? "未知分類"}
          entry={entry}
          goalTitle={entry.relatedGoalId ? goalNames.get(entry.relatedGoalId) : undefined}
          key={entry.id}
          onDeleted={(deletedId) => {
            setCleanupVersion((version) => version + 1);
            setEntries((current) =>
              current.filter((item) => item.id !== deletedId),
            );
          }}
        />
      ))}
      </div></ScrollPanel>
    </div>
  );
}
