"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/features/learning/components/markdown-content";
import { deleteLearningEntry } from "@/features/learning/services/learning.service";
import type { LearningEntry } from "@/features/learning/types/learning.types";

const dateFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function LearningCard({
  entry,
  categoryName,
  onDeleted,
}: {
  entry: LearningEntry;
  categoryName: string;
  onDeleted: (entryId: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (isDeleting) return;
    if (!window.confirm(`確定刪除「${entry.title}」？刪除後無法復原。`)) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteLearningEntry(entry.id);
      // Firestore 確認成功後，先通知 parent 移除列表項目。
      onDeleted(entry.id);
    } catch {
      setDeleteError("刪除失敗，請再試一次。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{entry.title}</h2>
      <div className="mt-3">
        <MarkdownContent content={entry.content} />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex gap-2">
          <dt>分類</dt>
          <dd className="text-foreground">{categoryName}</dd>
        </div>
        <div className="flex gap-2">
          <dt>學習日期</dt>
          <dd className="text-foreground">
            {dateFormatter.format(entry.learnedAt)}
          </dd>
        </div>
      </dl>
      <Button asChild className="mt-4" size="sm" variant="outline">
        <Link href={`/learning/${entry.id}/edit`}>編輯</Link>
      </Button>
      <Button
        className="ml-2"
        disabled={isDeleting}
        onClick={handleDelete}
        size="sm"
        type="button"
        variant="destructive"
      >
        {isDeleting ? "刪除中…" : "刪除"}
      </Button>
      {deleteError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {deleteError}
        </p>
      ) : null}
    </article>
  );
}
