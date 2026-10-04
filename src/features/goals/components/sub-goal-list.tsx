"use client";

import { useEffect, useState } from "react";
import { getSubGoals, setChecklistCompletion } from "../services/sub-goal.service";
import type { SubGoal } from "../types/sub-goal.types";

export function SubGoalList({ goalId }: { goalId: string }) {
  const [subGoals, setSubGoals] = useState<SubGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function handleChecklistChange(subGoal: SubGoal, isCompleted: boolean) {
    if (subGoal.kind !== "checklist" || updatingId) return;
    setUpdatingId(subGoal.id);
    setErrorMessage("");
    try {
      await setChecklistCompletion(goalId, subGoal.id, isCompleted);
      setSubGoals((current) => current.map((item) => item.id === subGoal.id
        ? { ...item, isCompleted } as SubGoal
        : item));
    } catch {
      setErrorMessage("更新完成狀態失敗，請重新整理再試。");
    } finally {
      setUpdatingId("");
    }
  }

  useEffect(() => {
    let isCurrent = true;
    getSubGoals(goalId)
      .then((result) => { if (isCurrent) setSubGoals(result); })
      .catch(() => { if (isCurrent) setErrorMessage("未能載入細目標，請重新整理再試。"); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    return () => { isCurrent = false; };
  }, [goalId]);

  if (isLoading) return <p className="text-sm text-muted-foreground" role="status">載入細目標中…</p>;
  if (errorMessage) return <p className="text-sm text-destructive" role="alert">{errorMessage}</p>;
  if (subGoals.length === 0) return <p className="text-sm text-muted-foreground" role="status">呢個大目標未有細目標。</p>;

  return (
    <ul className="space-y-3" aria-label="細目標列表">
      {subGoals.map((subGoal) => (
        <li key={subGoal.id} className="min-w-0 space-y-2 rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            {subGoal.kind === "checklist" ? (
              <input aria-label={`標記「${subGoal.title}」完成`} checked={subGoal.isCompleted}
                disabled={Boolean(updatingId)} onChange={(event) => handleChecklistChange(subGoal, event.target.checked)} type="checkbox" />
            ) : null}
            <h3 className="break-words font-semibold">{subGoal.title}</h3>
          </div>
          {subGoal.description ? <p className="whitespace-pre-wrap break-words text-sm">{subGoal.description}</p> : null}
          <p className="break-words text-sm text-muted-foreground">
            {subGoal.kind === "checklist"
              ? `勾選完成 · ${subGoal.isCompleted ? "已完成" : "未完成"}`
              : `計數 · ${subGoal.currentValue} / ${subGoal.targetValue} ${subGoal.unit} · ${subGoal.currentValue >= subGoal.targetValue ? "已完成" : "未完成"}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
