"use client";

import { useEffect, useState } from "react";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { Button } from "@/components/ui/button";
import { CircleCheck, Hash, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { numberFormatter } from "../goal-presentation";
import { getCompletedSubGoalCount } from "@/features/dashboard/services/dashboard-data";
import {
  deleteSubGoal,
  getSubGoals,
  setChecklistCompletion,
} from "../services/sub-goal.service";
import type { SubGoal } from "../types/sub-goal.types";
import { SubGoalProgress } from "./sub-goal-progress";

export function SubGoalList({
  goalId,
  disabled = false,
}: {
  goalId: string;
  disabled?: boolean;
}) {
  const [subGoals, setSubGoals] = useState<SubGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function handleDelete(subGoal: SubGoal) {
    if (disabled || updatingId) return;
    setUpdatingId(subGoal.id);
    setErrorMessage("");
    setSubGoals((current) =>
      current.map((item) =>
        item.id === subGoal.id ? { ...item, deleting: true } : item,
      ),
    );
    try {
      await deleteSubGoal(goalId, subGoal.id);
      setSubGoals((current) =>
        current.filter((item) => item.id !== subGoal.id),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "刪除細目標失敗，請重試。",
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function handleChecklistChange(subGoal: SubGoal, isCompleted: boolean) {
    if (
      subGoal.kind !== "checklist" ||
      updatingId ||
      disabled ||
      subGoal.deleting
    )
      return;
    setUpdatingId(subGoal.id);
    setErrorMessage("");
    try {
      await setChecklistCompletion(goalId, subGoal.id, isCompleted);
      setSubGoals((current) =>
        current.map((item) =>
          item.id === subGoal.id ? ({ ...item, isCompleted } as SubGoal) : item,
        ),
      );
    } catch {
      setErrorMessage("更新完成狀態失敗，請重新整理再試。");
    } finally {
      setUpdatingId("");
    }
  }

  useEffect(() => {
    let isCurrent = true;
    getSubGoals(goalId)
      .then((result) => {
        if (isCurrent) setSubGoals(result);
      })
      .catch(() => {
        if (isCurrent) setErrorMessage("未能載入細目標，請重新整理再試。");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [goalId]);

  if (isLoading) return <ListSkeleton label="載入細目標中…" />;
  if (errorMessage && subGoals.length === 0)
    return <ErrorState message={errorMessage} />;
  if (subGoals.length === 0)
    return (
      <EmptyState
        title="呢個大目標未有細目標。"
        description="編輯目標，加入幾個可以勾選或計量嘅步驟。"
      />
    );

  const completed = getCompletedSubGoalCount(subGoals);

  return (
    <div className="space-y-3">
      <div className="max-w-sm space-y-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          {numberFormatter.format(completed)} /{" "}
          {numberFormatter.format(subGoals.length)} 個細目標已完成
        </p>
        <ProgressMeter
          value={completed}
          max={subGoals.length}
          label="細目標完成進度"
        />
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <ScrollPanel label="細目標列表">
        <ul className="divide-y">
          {subGoals.map((subGoal) => {
            const done =
              subGoal.kind === "checklist"
                ? subGoal.isCompleted
                : subGoal.currentValue >= subGoal.targetValue;
            return (
              <li key={subGoal.id} className="list-row min-w-0 py-3 sm:py-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  {subGoal.kind === "checklist" ? (
                    <label className="grid size-11 shrink-0 place-items-center rounded-md sm:size-10">
                      <input
                        className="size-5 shrink-0 cursor-pointer accent-primary"
                        aria-label={`標記「${subGoal.title}」完成`}
                        checked={subGoal.isCompleted}
                        disabled={
                          disabled || Boolean(updatingId) || subGoal.deleting
                        }
                        onChange={(event) =>
                          handleChecklistChange(subGoal, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </label>
                  ) : (
                    <span
                      className={`grid size-11 shrink-0 place-items-center sm:size-10 ${done ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {done ? (
                        <CircleCheck aria-hidden size={19} />
                      ) : (
                        <Hash aria-hidden size={19} />
                      )}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 pt-2">
                    <h3
                      className={`text-sm leading-6 font-medium ${done ? "text-muted-foreground line-through decoration-border" : ""}`}
                    >
                      {subGoal.title}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground tabular-nums">
                      {updatingId === subGoal.id ? (
                        <span role="status">更新中…</span>
                      ) : null}
                      {subGoal.kind === "checklist" ? (
                        done ? (
                          "已完成"
                        ) : (
                          "待完成"
                        )
                      ) : (
                        <>
                          <span>
                            {numberFormatter.format(subGoal.currentValue)}
                          </span>
                          <span>/</span>
                          <span>
                            {numberFormatter.format(subGoal.targetValue)}
                          </span>
                          <span>{subGoal.unit}</span>
                          {done ? (
                            <span className="ml-1 text-primary">已完成</span>
                          ) : null}
                        </>
                      )}
                    </p>
                    {subGoal.description ? (
                      <details className="mt-1 text-sm">
                        <summary className="flex min-h-10 cursor-pointer items-center text-xs text-muted-foreground">
                          查看描述
                        </summary>
                        <p className="max-h-48 overflow-y-auto whitespace-pre-wrap pb-2 leading-6 text-muted-foreground">
                          {subGoal.description}
                        </p>
                      </details>
                    ) : null}
                    {subGoal.kind === "count" ? (
                      <SubGoalProgress
                        subGoal={subGoal}
                        disabled={
                          disabled || Boolean(updatingId) || subGoal.deleting
                        }
                        onSaved={(currentValue) => {
                          setSubGoals((current) =>
                            current.map((item) =>
                              item.id === subGoal.id && item.kind === "count"
                                ? { ...item, currentValue }
                                : item,
                            ),
                          );
                        }}
                      />
                    ) : null}
                  </div>
                  {subGoal.deleting ? (
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      disabled={disabled || Boolean(updatingId)}
                      onClick={() => handleDelete(subGoal)}
                      aria-label={`刪除細目標「${subGoal.title}」`}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  ) : (
                    <ConfirmAction
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={disabled || Boolean(updatingId)}
                      aria-label={`刪除細目標「${subGoal.title}」`}
                      title="刪除細目標？"
                      description={`「${subGoal.title}」\n佢嘅所有進度歷史亦會刪除，無法復原。大目標及其他細目標會保留。`}
                      onConfirm={() => handleDelete(subGoal)}
                    >
                      <Trash2 aria-hidden size={15} />
                    </ConfirmAction>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollPanel>
    </div>
  );
}
