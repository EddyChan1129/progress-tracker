"use client";

import { useEffect, useState } from "react";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

import { deleteCategory, getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  async function handleDelete(category: Category) {
    if (deletingId || !window.confirm(`確定刪除分類「${category.name}」？刪除後無法復原。如有記錄或目標使用，請先轉到其他分類。`)) return;
    setDeletingId(category.id);
    setErrorMessage("");
    try {
      await deleteCategory(category.id);
      setCategories((current) => current.filter((item) => item.id !== category.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "刪除分類失敗，請重試。");
    } finally {
      setDeletingId("");
    }
  }

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
    <section aria-labelledby="category-list-heading" className="mt-7 min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
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
        <ScrollPanel label="分類列表" className="mt-4"><ul className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <li
              className="flex items-center gap-3 rounded-lg border bg-card p-4"
              key={category.id}
            >
              <span aria-hidden className="text-xl">
                {category.icon ?? "📁"}
              </span>
              <span className="min-w-0 flex-1 break-words font-medium">{category.name}</span>
              <Button type="button" size="sm" variant="ghost" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={Boolean(deletingId)} onClick={() => handleDelete(category)} aria-label={`刪除分類「${category.name}」`}>
                <Trash2 aria-hidden size={15} />
              </Button>
            </li>
          ))}
        </ul></ScrollPanel>
      ) : null}
    </section>
  );
}
