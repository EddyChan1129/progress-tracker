"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { GoalCreationInput } from "../schemas/goal.schema";

import type { SubGoal } from "../types/sub-goal.types";
import { numberFormatter } from "../goal-presentation";

type SubGoalFieldsProps = Pick<
  UseFormReturn<GoalCreationInput>,
  | "control"
  | "register"
  | "formState"
  | "getFieldState"
  | "setValue"
  | "unregister"
> & { index: number; existing?: SubGoal };

// 每組細目標共用主表單嘅 RHF 狀態；呢度只有欄位，唔再包一個 form。
export function SubGoalFields({
  index,
  existing,
  control,
  register,
  formState,
  getFieldState,
  setValue,
  unregister,
}: SubGoalFieldsProps) {
  const measurementLocked =
    existing?.kind === "count" && existing.currentValue !== 0;
  const kindPath = `subGoals.${index}.kind` as const;
  const targetPath = `subGoals.${index}.targetValue` as const;
  const unitPath = `subGoals.${index}.unit` as const;
  const kind = useWatch({ control, name: kindPath });
  const titleError = getFieldState(`subGoals.${index}.title`, formState).error;
  const descriptionError = getFieldState(
    `subGoals.${index}.description`,
    formState,
  ).error;
  const targetError = getFieldState(targetPath, formState).error;
  const unitError = getFieldState(unitPath, formState).error;
  const id = `sub-goal-${index}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={`${id}-kind`} className="text-sm font-medium">
          類型
        </label>
        {existing ? (
          <p className="text-sm">
            {existing.kind === "count"
              ? `計數 · 目前進度 ${numberFormatter.format(existing.currentValue)}`
              : `勾選完成 · ${existing.isCompleted ? "已完成" : "未完成"}`}
          </p>
        ) : (
          <select
            id={`${id}-kind`}
            {...register(kindPath, {
              onChange: (event) => {
                // 切返 checklist 移除多餘資料；唔喺 field array 用全局 shouldUnregister，避免移除／重排時丟失其他行。
                if (event.target.value === "checklist")
                  unregister([targetPath, unitPath]);
                else {
                  setValue(targetPath, 1);
                  setValue(unitPath, "");
                }
              },
            })}
          >
            <option value="checklist">勾選完成</option>
            <option value="count">計數</option>
          </select>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          標題
        </label>
        <Input
          id={`${id}-title`}
          maxLength={100}
          placeholder={kind === "count" ? "例如：學單字" : "例如：搵老師"}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? `${id}-title-error` : undefined}
          {...register(`subGoals.${index}.title`)}
        />
        {titleError ? (
          <p id={`${id}-title-error`} className="text-sm text-destructive">
            {titleError.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-description`} className="text-sm font-medium">
          描述（可選）
        </label>
        <textarea
          id={`${id}-description`}
          rows={2}
          maxLength={2000}

          aria-invalid={Boolean(descriptionError)}
          aria-describedby={
            descriptionError ? `${id}-description-error` : undefined
          }
          {...register(`subGoals.${index}.description`)}
        />
        {descriptionError ? (
          <p
            id={`${id}-description-error`}
            className="text-sm text-destructive"
          >
            {descriptionError.message}
          </p>
        ) : null}
      </div>
      {measurementLocked ? (
        <p className="text-sm text-muted-foreground">
          已有進度，目標數量同單位保持不變。
        </p>
      ) : null}
      {kind === "count" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${id}-target`} className="text-sm font-medium">
              目標數量
            </label>
            <Input
              id={`${id}-target`}
              type="number"
              step="any"
              readOnly={measurementLocked}
              aria-invalid={Boolean(targetError)}
              aria-describedby={targetError ? `${id}-target-error` : undefined}
              {...register(targetPath, { valueAsNumber: true })}
            />
            {targetError ? (
              <p id={`${id}-target-error`} className="text-sm text-destructive">
                {targetError.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-unit`} className="text-sm font-medium">
              單位
            </label>
            <Input
              id={`${id}-unit`}
              readOnly={measurementLocked}
              maxLength={20}
              placeholder="例如：個、章、次"
              aria-invalid={Boolean(unitError)}
              aria-describedby={unitError ? `${id}-unit-error` : undefined}
              {...register(unitPath)}
            />
            {unitError ? (
              <p id={`${id}-unit-error`} className="text-sm text-destructive">
                {unitError.message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
