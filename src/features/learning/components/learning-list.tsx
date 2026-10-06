"use client";

import { useEffect, useState } from "react";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { numberFormatter } from "@/features/goals/goal-presentation";
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState(0);

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
  }, [version]);

  if (isLoading) {
    return <ListSkeleton label="載入學習記錄中…" />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => {
          setErrorMessage("");
          setIsLoading(true);
          setVersion((value) => value + 1);
        }}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mt-5">
        <ImageCleanupStatus key={cleanupVersion} />
        <EmptyState
          title="暫時未有學習記錄。"
          description="記低一次練習、一個發現，慢慢累積。"
          action={
            <Button asChild>
              <Link href="/learning/new">新增第一筆記錄</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const goalNames = new Map(goals.map((goal) => [goal.id, goal.title]));
  const query = search.trim().toLocaleLowerCase();
  const visible = entries.filter(
    (entry) =>
      (!category || entry.categoryId === category) &&
      (!query ||
        `${entry.title} ${entry.content} ${categoryNames.get(entry.categoryId) ?? ""}`
          .toLocaleLowerCase()
          .includes(query)),
  );

  return (
    <div className="mt-5 space-y-3">
      <ImageCleanupStatus key={cleanupVersion} />
      <ListToolbar
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={setCategory}
        categories={categories}
        placeholder="搜尋學習記錄…"
      />
      <p role="status" className="text-xs text-muted-foreground tabular-nums">
        {numberFormatter.format(visible.length)} 筆記錄
        {visible.length !== entries.length
          ? `，共 ${numberFormatter.format(entries.length)} 筆`
          : ""}
      </p>
      {visible.length ? (
        <ScrollPanel label="學習記錄列表">
          <div>
            {visible.map((entry) => (
              <LearningCard
                categoryName={categoryNames.get(entry.categoryId) ?? "未知分類"}
                entry={entry}
                goalTitle={
                  entry.relatedGoalId
                    ? goalNames.get(entry.relatedGoalId)
                    : undefined
                }
                key={entry.id}
                onDeleted={(deletedId) => {
                  setCleanupVersion((version) => version + 1);
                  setEntries((current) =>
                    current.filter((item) => item.id !== deletedId),
                  );
                }}
              />
            ))}
          </div>
        </ScrollPanel>
      ) : (
        <EmptyState
          title="未有符合條件嘅記錄"
          description="試下其他關鍵字或分類。"
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("");
              }}
            >
              清除篩選
            </Button>
          }
        />
      )}
    </div>
  );
}
