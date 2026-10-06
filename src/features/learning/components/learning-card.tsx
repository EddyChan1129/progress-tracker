"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { LearningImages } from "./learning-images";
import { MarkdownContent } from "./markdown-content";
import { deleteLearningEntry } from "../services/learning.service";
import type { LearningEntry } from "../types/learning.types";

const dateFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function LearningCard({
  entry,
  categoryName,
  goalTitle,
  onDeleted,
}: {
  entry: LearningEntry;
  categoryName: string;
  goalTitle?: string;
  onDeleted: (entryId: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  async function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteLearningEntry(entry.id);
      onDeleted(entry.id);
    } catch {
      setDeleteError("刪除失敗，請再試一次。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="list-row min-w-0 border-b py-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="pt-1.5 text-[15px] leading-6 font-semibold">
            <Link
              href={`/learning/${entry.id}/edit`}
              className="line-clamp-2 rounded hover:text-primary"
              title={entry.title}
            >
              {entry.title}
            </Link>
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <time
              dateTime={entry.learnedAt.toISOString()}
              className="shrink-0 tabular-nums"
            >
              {dateFormatter.format(entry.learnedAt)}
            </time>
            <span className="min-w-0 max-w-full truncate" title={categoryName}>
              {categoryName}
            </span>
            {entry.images.length ? (
              <span>{entry.images.length} 張圖片</span>
            ) : null}
          </div>
        </div>
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="text-muted-foreground"
        >
          <Link
            href={`/learning/${entry.id}/edit`}
            aria-label={`編輯記錄「${entry.title}」`}
            title="編輯"
          >
            <Pencil aria-hidden size={16} />
          </Link>
        </Button>
        <ConfirmAction
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground"
          disabled={isDeleting}
          aria-label={`刪除記錄「${entry.title}」`}
          title="刪除學習記錄？"
          description={`「${entry.title}」\n刪除後無法復原。`}
          onConfirm={handleDelete}
        >
          <Trash2 aria-hidden size={16} />
        </ConfirmAction>
      </div>
      <details className="group mt-2">
        <summary
          className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground"
          aria-label={`閱讀「${entry.title}」內容`}
        >
          <span className="min-w-0 flex-1 line-clamp-1 group-open:hidden">
            {entry.content}
          </span>
          <span className="hidden flex-1 text-xs group-open:block">
            收起內容
          </span>
          <ChevronDown
            aria-hidden
            size={15}
            className="group-open:rotate-180"
          />
        </summary>
        <ScrollPanel
          label={`「${entry.title}」學習內容`}
          className="max-h-80 border-l-2 pl-4"
        >
          <MarkdownContent content={entry.content} />
          <LearningImages images={entry.images} />
        </ScrollPanel>
      </details>
      {entry.relatedGoalId ? (
        <Link
          href={`/goals/${entry.relatedGoalId}`}
          className="inline-flex min-h-10 max-w-full items-center rounded text-xs text-primary hover:underline"
        >
          <span className="truncate" title={goalTitle}>
            關聯目標：{goalTitle ?? "查看目標"}
          </span>
        </Link>
      ) : null}
      {isDeleting ? (
        <p role="status" className="text-xs text-muted-foreground">
          刪除中…
        </p>
      ) : null}
      {deleteError ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {deleteError}
        </p>
      ) : null}
    </article>
  );
}
