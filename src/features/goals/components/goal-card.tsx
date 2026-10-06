"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Circle,
  CircleCheck,
  CirclePause,
  CirclePlay,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { setGoalStatus } from "../services/goal.service";
import { getDeadline, getStageLabel } from "../goal-presentation";
import type { Goal, GoalStatus } from "../types/goal.types";

export function GoalCard({
  goal,
  categoryName,
  showDetailLink = true,
  onStatusChanged,
}: {
  goal: Goal;
  categoryName: string;
  showDetailLink?: boolean;
  onStatusChanged?: (status: GoalStatus) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const deadline = getDeadline(goal);
  const Icon =
    goal.status === "completed"
      ? CircleCheck
      : goal.status === "in_progress"
        ? CirclePlay
        : goal.status === "paused"
          ? CirclePause
          : Circle;
  const nextStatus =
    goal.status === "in_progress" ? "completed" : "in_progress";
  const actionLabel =
    goal.status === "in_progress"
      ? "完成目標"
      : goal.status === "paused"
        ? "恢復目標"
        : "開始目標";
  const Heading = showDetailLink ? "h2" : "h1";

  async function changeStatus() {
    if (pending || goal.deleting || !onStatusChanged) return;
    setPending(true);
    setError("");
    try {
      onStatusChanged(await setGoalStatus(goal.id, nextStatus, goal.status));
    } catch (error) {
      setError(
        error instanceof Error && !("code" in error)
          ? error.message
          : "未能更新狀態，請再試一次。",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <article
      className={
        showDetailLink
          ? "list-row min-w-0 border-b py-3 sm:py-4"
          : "min-w-0 border-b pb-5"
      }
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {showDetailLink ? (
          onStatusChanged && goal.status !== "completed" ? (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-1 text-muted-foreground"
              disabled={pending || goal.deleting}
              onClick={changeStatus}
              aria-label={`${actionLabel}「${goal.title}」`}
              title={actionLabel}
            >
              {pending ? (
                <span className="text-xs">…</span>
              ) : goal.status === "in_progress" ? (
                <Check aria-hidden size={19} />
              ) : (
                <Icon aria-hidden size={19} strokeWidth={1.5} />
              )}
            </Button>
          ) : (
            <span className="grid size-11 shrink-0 place-items-center text-primary sm:size-10">
              <Icon aria-hidden size={19} strokeWidth={1.5} />
            </span>
          )
        ) : null}
        <div className="min-w-0 flex-1">
          {!showDetailLink ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`status-label ${goal.status === "completed" || goal.status === "in_progress" ? "text-primary" : "text-muted-foreground"}`}
              >
                {getStageLabel(goal)}
              </span>
              {goal.deleting ? (
                <span role="status" className="text-xs text-destructive">
                  刪除尚未完成
                </span>
              ) : null}
            </div>
          ) : null}
          <Heading
            className={`font-semibold ${showDetailLink ? "pt-1.5 text-[15px] leading-6" : "mt-1 text-2xl leading-snug sm:text-[1.75rem]"} ${goal.status === "completed" && showDetailLink ? "text-muted-foreground line-through decoration-border" : ""}`}
          >
            {showDetailLink ? (
              <Link
                href={`/goals/${goal.id}`}
                className="line-clamp-2 rounded-sm hover:text-primary"
                title={goal.title}
              >
                {goal.title}
              </Link>
            ) : (
              goal.title
            )}
          </Heading>
          {goal.description &&
          !showDetailLink &&
          goal.description.length > 120 ? (
            <details className="group mt-3 text-sm text-muted-foreground">
              <summary className="block cursor-pointer">
                <p className="line-clamp-2 leading-7 group-open:hidden">
                  {goal.description}
                </p>
                <span className="flex min-h-11 items-center text-xs text-primary">
                  <span className="group-open:hidden">查看完整描述</span>
                  <span className="hidden group-open:inline">收起描述</span>
                </span>
              </summary>
              <p className="max-h-60 overflow-y-auto whitespace-pre-wrap leading-7">
                {goal.description}
              </p>
            </details>
          ) : goal.description ? (
            <p
              className={
                showDetailLink
                  ? "mt-1 line-clamp-1 text-sm text-muted-foreground"
                  : "mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground"
              }
            >
              {goal.description}
            </p>
          ) : null}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {showDetailLink ? (
              <span
                className={`status-label ${goal.status === "completed" || goal.status === "in_progress" ? "text-primary" : "text-muted-foreground"}`}
              >
                {getStageLabel(goal)}
              </span>
            ) : null}
            <span
              className={showDetailLink ? "max-w-full truncate" : "min-w-0"}
              title={categoryName}
            >
              {categoryName}
            </span>
            {deadline ? (
              <time
                dateTime={goal.targetDate!.toISOString()}
                title={`目標日期：${deadline.date}`}
                className={`shrink-0 tabular-nums ${deadline.overdue ? "font-medium text-destructive" : ""}`}
              >
                {deadline.label}
              </time>
            ) : (
              <span>未設期限</span>
            )}
            {!showDetailLink && goal.startDate ? (
              <time dateTime={goal.startDate.toISOString()}>
                開始：{goal.startDate.toLocaleDateString("zh-HK")}
              </time>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        {showDetailLink && !goal.deleting ? (
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="text-muted-foreground"
          >
            <Link
              href={`/goals/${goal.id}/edit`}
              aria-label={`編輯目標「${goal.title}」`}
              title="編輯目標"
            >
              <Pencil aria-hidden size={16} />
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
