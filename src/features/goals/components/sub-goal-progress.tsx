"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import {
  subGoalProgressSchema,
  type SubGoalProgressInput,
} from "../schemas/sub-goal-progress.schema";
import {
  addSubGoalProgress,
  getSubGoalUpdates,
} from "../services/sub-goal.service";
import type { CountSubGoal, SubGoalUpdate } from "../types/sub-goal.types";
import { numberFormatter } from "../goal-presentation";

export function SubGoalProgress({
  subGoal,
  onSaved,
  disabled = false,
}: {
  subGoal: CountSubGoal;
  onSaved: (currentValue: number) => void;
  disabled?: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubGoalProgressInput>({
    resolver: zodResolver(subGoalProgressSchema),
    defaultValues: { progressDelta: 1, note: "" },
  });
  const [error, setError] = useState("");
  const [isRetry, setIsRetry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<SubGoalUpdate[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const pending = useRef<{ id: string; input: SubGoalProgressInput } | null>(
    null,
  );
  const submitting = useRef(false);
  const inputId = `progress-${subGoal.id}`;

  useEffect(() => {
    if (!historyOpen) return;
    let isCurrent = true;
    getSubGoalUpdates(subGoal.goalId, subGoal.id)
      .then((result) => {
        if (isCurrent) {
          setHistory(result);
          setHistoryError("");
        }
      })
      .catch(() => {
        if (isCurrent) setHistoryError("未能載入進度歷史。");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [subGoal.goalId, subGoal.id, version, historyOpen]);

  async function submit(input: SubGoalProgressInput) {
    if (submitting.current || disabled) return;
    submitting.current = true;
    setIsSaving(true);
    setError("");
    // 失敗後保留 ID 同輸入；唔將未知結果嘅操作當成另一筆新進度。
    pending.current ??= { id: crypto.randomUUID(), input };
    try {
      const currentValue = await addSubGoalProgress(
        subGoal.goalId,
        subGoal.id,
        pending.current.input,
        pending.current.id,
      );
      pending.current = null;
      setIsRetry(false);
      reset({ progressDelta: 1, note: "" });
      onSaved(currentValue);
      setVersion((current) => current + 1);
    } catch {
      setIsRetry(true);
      setError("未能確認儲存結果，請重試同一次進度。輸入已保留。");
    } finally {
      submitting.current = false;
      setIsSaving(false);
    }
  }

  return (
    <details
      open={expanded || isRetry}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="mt-1"
    >
      <summary className="flex min-h-10 cursor-pointer items-center text-xs font-medium text-primary">
        更新進度
      </summary>
      <div className="space-y-3 rounded-md bg-muted/50 p-3">
        <form
          onSubmit={(event) => {
            if (pending.current) {
              event.preventDefault();
              void submit(pending.current.input);
            } else void handleSubmit(submit)(event);
          }}
          className="space-y-3"
        >
          <fieldset
            disabled={disabled || isSubmitting || isSaving || isRetry}
            className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
          >
            <div className="space-y-1">
              <label htmlFor={inputId} className="text-xs font-medium">
                增加數量（{subGoal.unit}）
              </label>
              <Input
                id={inputId}
                type="number"
                inputMode="decimal"
                step="any"
                aria-invalid={Boolean(errors.progressDelta)}
                aria-describedby={
                  errors.progressDelta ? `${inputId}-error` : undefined
                }
                {...register("progressDelta", { valueAsNumber: true })}
              />
              {errors.progressDelta ? (
                <p id={`${inputId}-error`} className="text-sm text-destructive">
                  {errors.progressDelta.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`${inputId}-note`}
                className="text-xs font-medium"
              >
                備註（可選）
              </label>
              <Input
                id={`${inputId}-note`}
                maxLength={2000}
                {...register("note")}
                aria-invalid={Boolean(errors.note)}
                aria-describedby={
                  errors.note ? `${inputId}-note-error` : undefined
                }
              />
              {errors.note ? (
                <p
                  id={`${inputId}-note-error`}
                  className="text-sm text-destructive"
                >
                  {errors.note.message}
                </p>
              ) : null}
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            size="sm"
            disabled={disabled || isSubmitting || isSaving}
          >
            {isSubmitting || isSaving
              ? "儲存中…"
              : isRetry
                ? "重試儲存"
                : "新增進度"}
          </Button>
        </form>
        <details
          onToggle={(event) => {
            setHistoryOpen(event.currentTarget.open);
            if (event.currentTarget.open) setIsLoading(true);
          }}
        >
          <summary className="flex min-h-10 cursor-pointer items-center text-xs font-medium text-muted-foreground">
            進度歷史
          </summary>
          {isLoading ? (
            <p role="status" className="mt-2 text-sm">
              載入歷史中…
            </p>
          ) : null}
          {historyError ? (
            <div className="mt-2 space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {historyError}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLoading(true);
                  setVersion((current) => current + 1);
                }}
              >
                重試載入
              </Button>
            </div>
          ) : null}
          {!isLoading && !historyError && history.length === 0 ? (
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              未有進度歷史。
            </p>
          ) : null}
          <ScrollPanel
            label={`「${subGoal.title}」進度歷史`}
            className="mt-2 max-h-60"
          >
            <ol className="space-y-2">
              {history.map((update) => (
                <li key={update.id} className="border-b py-2 text-xs">
                  <p className="flex flex-wrap gap-x-2 tabular-nums">
                    <span>
                      +{numberFormatter.format(update.progressDelta)}{" "}
                      {subGoal.unit}
                    </span>
                    <span>
                      {numberFormatter.format(update.previousValue)} →{" "}
                      {numberFormatter.format(update.currentValue)}
                    </span>
                  </p>
                  <time
                    className="text-muted-foreground"
                    dateTime={update.createdAt.toISOString()}
                  >
                    {update.createdAt.toLocaleString("zh-HK")}
                  </time>
                  {update.note ? (
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {update.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </ScrollPanel>
        </details>
      </div>
    </details>
  );
}
