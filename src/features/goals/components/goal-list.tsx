"use client";

import { useEffect, useState } from "react";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { ListToolbar } from "@/components/ui/list-toolbar";
import {
  compareGoals,
  getDeadline,
  numberFormatter,
} from "../goal-presentation";
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState("all");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    // 兩份資料互不依賴，可以同時讀取。
    Promise.all([getGoals(), getCategories()])
      .then(([goalResult, categoryResult]) => {
        if (!isCurrent) return;
        setGoals(goalResult);
        setCategories(categoryResult);
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
  }, [version]);

  if (isLoading) return <ListSkeleton label="載入目標中…" />;
  if (errorMessage)
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
  if (goals.length === 0)
    return (
      <EmptyState
        title="由一個小目標開始"
        description="寫低想做嘅事，再拆成幾個容易完成嘅步驟。"
        action={
          <Button asChild>
            <Link href="/goals/new">新增第一個目標</Link>
          </Button>
        }
      />
    );

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const query = search.trim().toLocaleLowerCase();
  const matches = goals.filter(
    (goal) =>
      (!category || goal.categoryId === category) &&
      (!query ||
        `${goal.title} ${goal.description ?? ""} ${categoryNames.get(goal.categoryId) ?? ""}`
          .toLocaleLowerCase()
          .includes(query)),
  );
  const tabs = [
    { id: "all", label: "全部", count: matches.length },
    {
      id: "active",
      label: "待完成",
      count: matches.filter(
        (goal) =>
          goal.status === "not_started" || goal.status === "in_progress",
      ).length,
    },
    {
      id: "completed",
      label: "已完成",
      count: matches.filter((goal) => goal.status === "completed").length,
    },
    {
      id: "paused",
      label: "暫停",
      count: matches.filter((goal) => goal.status === "paused").length,
    },
  ];
  const visible = matches
    .filter(
      (goal) =>
        filter === "all" ||
        (filter === "active"
          ? goal.status === "not_started" || goal.status === "in_progress"
          : goal.status === filter),
    )
    .sort(compareGoals);
  const overdue = visible.filter((goal) => getDeadline(goal)?.overdue).length;
  return (
    <div className="mt-5 space-y-3">
      <ListToolbar
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={setCategory}
        categories={categories}
        placeholder="搜尋目標…"
      />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b">
        <div
          className="flex min-w-0 max-w-full overflow-x-auto"
          aria-label="篩選目標狀態"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="filter-tab"
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
              <span className="ml-1.5 text-xs font-normal tabular-nums">
                {numberFormatter.format(tab.count)}
              </span>
            </button>
          ))}
        </div>
        {overdue ? (
          <p className="pb-2 text-xs text-destructive">
            {numberFormatter.format(overdue)} 個逾期
          </p>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        顯示 {visible.length} 個目標
      </p>
      {visible.length ? (
        <ScrollPanel label="大目標列表">
          <div>
            {visible.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                categoryName={categoryNames.get(goal.categoryId) ?? "未知分類"}
                onStatusChanged={(status) =>
                  setGoals((current) =>
                    current.map((item) =>
                      item.id === goal.id ? { ...item, status } : item,
                    ),
                  )
                }
              />
            ))}
          </div>
        </ScrollPanel>
      ) : (
        <EmptyState
          title="未有符合條件嘅目標"
          description="試下其他關鍵字或分類。"
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("");
                setFilter("all");
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
