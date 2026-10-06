"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Pause, Play } from "lucide-react";
import { setGoalStatus } from "../services/goal.service";
import { goalStatusTransitions } from "../services/goal-status";
import type { Goal, GoalStatus } from "../types/goal.types";

export function GoalStatusActions({
  goal,
  disabled,
  onChanged,
}: {
  goal: Goal;
  disabled: boolean;
  onChanged: (status: GoalStatus) => void;
}) {
  const [pending, setPending] = useState<GoalStatus | null>(null);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function changeStatus(status: GoalStatus) {
    if (submitting.current || disabled) return;
    submitting.current = true;
    setPending(status);
    setError("");
    try {
      const savedStatus = await setGoalStatus(goal.id, status, goal.status);
      onChanged(savedStatus);
    } catch (error) {
      setError(
        error instanceof Error && !("code" in error)
          ? error.message
          : "未能更新狀態，請重新整理再試。",
      );
    } finally {
      submitting.current = false;
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" aria-label="目標狀態操作">
        {goalStatusTransitions[goal.status].map((status) => (
          <Button
            key={status}
            type="button"
            disabled={disabled || pending !== null}
            variant={status === "paused" ? "outline" : "default"}
            onClick={() => changeStatus(status)}
          >
            {status === "completed" ? (
              <Check aria-hidden />
            ) : status === "paused" ? (
              <Pause aria-hidden />
            ) : (
              <Play aria-hidden />
            )}
            {pending === status
              ? "更新中…"
              : status === "completed"
                ? "完成目標"
                : status === "paused"
                  ? "暫停目標"
                  : goal.status === "paused"
                    ? "恢復目標"
                    : "開始目標"}
          </Button>
        ))}
      </div>
      <p className="max-w-sm text-xs leading-5 text-muted-foreground">
        {goal.status === "completed"
          ? "你已確認完成呢個大目標。"
          : "細目標完成後，仍由你決定幾時完成大目標。"}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
