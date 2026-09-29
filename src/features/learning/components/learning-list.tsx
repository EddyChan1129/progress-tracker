"use client";

import { useEffect, useState } from "react";

import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";
import { LearningCard } from "@/features/learning/components/learning-card";
import { getLearningEntries } from "@/features/learning/services/learning.service";
import type { LearningEntry } from "@/features/learning/types/learning.types";

export function LearningList() {
  const [entries, setEntries] = useState<LearningEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getLearningEntries(), getCategories()])
      .then(([entryResult, categoryResult]) => {
        if (!isCurrent) return;

        setEntries(entryResult);
        setCategories(categoryResult);
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
    return <p className="mt-8 text-muted-foreground">暫時未有學習記錄。</p>;
  }

  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return (
    <div className="mt-8 grid gap-4">
      {entries.map((entry) => (
        <LearningCard
          categoryName={categoryNames.get(entry.categoryId) ?? "未知分類"}
          entry={entry}
          key={entry.id}
        />
      ))}
    </div>
  );
}
