"use client";

import { useEffect, useState } from "react";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";

import {
  deleteCategory,
  getCategories,
} from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");

  async function handleDelete(category: Category) {
    if (deletingId) return;
    setDeletingId(category.id);
    setErrorMessage("");
    try {
      await deleteCategory(category.id);
      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "刪除分類失敗，請重試。",
      );
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

  const visible = categories.filter((category) =>
    category.name
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <section aria-labelledby="category-list-heading" className="min-w-0">
      <h2 className="text-base font-semibold" id="category-list-heading">
        你的分類
      </h2>

      {isLoading ? <ListSkeleton label="載入分類中…" /> : null}

      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {!isLoading && !errorMessage && categories.length === 0 ? (
        <EmptyState
          title="暫時未有分類。"
          description="用幾個常用分類，整理學習同目標。"
        />
      ) : null}

      {categories.length > 0 ? (
        <div className="mt-4 space-y-3">
          <Input
            type="search"
            aria-label="搜尋分類"
            placeholder="搜尋分類…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {visible.length ? (
            <ScrollPanel label="分類列表">
              <ul className="divide-y">
                {visible.map((category) => (
                  <li
                    className="list-row flex min-h-14 items-center gap-3 py-2"
                    key={category.id}
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center overflow-hidden text-lg"
                    >
                      {category.icon || "📁"}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {category.name}
                    </span>
                    <ConfirmAction
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={Boolean(deletingId)}
                      aria-label={`刪除分類「${category.name}」`}
                      title="刪除分類？"
                      description={`「${category.name}」\n刪除後無法復原。如有記錄或目標使用，請先轉到其他分類。`}
                      onConfirm={() => handleDelete(category)}
                    >
                      <Trash2 aria-hidden size={15} />
                    </ConfirmAction>
                  </li>
                ))}
              </ul>
            </ScrollPanel>
          ) : (
            <EmptyState
              title="未有符合條件嘅分類"
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  清除搜尋
                </Button>
              }
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
