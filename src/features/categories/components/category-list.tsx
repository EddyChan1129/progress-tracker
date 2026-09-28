"use client";

import { useEffect, useState } from "react";

import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getCategories()
      .then((result) => {
        if (isCurrent) setCategories(result);
      })
      .catch(() => {
        if (isCurrent) setErrorMessage("未能載入分類，請重新整理再試。");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section aria-labelledby="category-list-heading" className="mt-10 max-w-2xl">
      <h2 className="text-xl font-semibold" id="category-list-heading">
        你的分類
      </h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          載入分類中…
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && !errorMessage && categories.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">暫時未有分類。</p>
      ) : null}

      {categories.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <li
              className="flex items-center gap-3 rounded-lg border bg-card p-4"
              key={category.id}
            >
              <span aria-hidden className="text-xl">
                {category.icon ?? "📁"}
              </span>
              <span className="font-medium">{category.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
