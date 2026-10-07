"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { ChevronDown, Plus, X } from "lucide-react";
import { toDateInputValue } from "@/lib/date-input";
import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";
import {
  goalCreationSchema,
  type GoalCreationInput,
} from "@/features/goals/schemas/goal.schema";
import {
  createGoal,
  getGoal,
  updateGoal,
} from "@/features/goals/services/goal.service";
import { getSubGoals } from "../services/sub-goal.service";
import type { SubGoal } from "../types/sub-goal.types";
import { SubGoalFields } from "./sub-goal-fields";

export function GoalForm({ goalId }: { goalId?: string }) {
  const router = useRouter();
  const [existingSubGoals, setExistingSubGoals] = useState<SubGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    unregister,
    getFieldState,
    formState,
    formState: { errors, isSubmitting },
  } = useForm<GoalCreationInput>({
    // 驗證後仍交原本嘅 string 輸入俾 service；service 自己 parse 成 Date。
    resolver: zodResolver(goalCreationSchema, undefined, { raw: true }),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      startDate: "",
      targetDate: "",
      subGoals: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "subGoals",
  });

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      getCategories(),
      goalId ? getGoal(goalId) : Promise.resolve(null),
      goalId ? getSubGoals(goalId) : Promise.resolve([]),
    ])
      .then(([categoryResult, goal, subGoals]) => {
        if (!isCurrent) return;
        setCategories(categoryResult);
        setExistingSubGoals(subGoals);
        if (goalId && !goal) {
          setLoadError("搵唔到呢個目標，或者佢唔屬於你。");
          return;
        }
        if (goal) {
          // 讀完先預填；reset 同時將讀返嘅資料設為表單基準值。
          reset({
            title: goal.title,
            description: goal.description ?? "",
            categoryId: goal.categoryId,
            startDate: goal.startDate ? toDateInputValue(goal.startDate) : "",
            targetDate: goal.targetDate
              ? toDateInputValue(goal.targetDate)
              : "",
            subGoals: subGoals.map((subGoal) => ({
              title: subGoal.title,
              description: subGoal.description ?? "",
              kind: subGoal.kind,
              ...(subGoal.kind === "count"
                ? { targetValue: subGoal.targetValue, unit: subGoal.unit }
                : {}),
            })),
          });
        }
      })
      .catch(() => {
        if (isCurrent) setLoadError("未能載入資料，請重新整理再試。");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    // 離開頁面後，唔再用舊 request 結果更新 state。
    return () => {
      isCurrent = false;
    };
  }, [goalId, reset]);

  async function onSubmit(input: GoalCreationInput) {
    try {
      if (goalId) {
        // 保留原有細目標 ID，連同大目標一次儲存；唔重建進度。
        await updateGoal(
          goalId,
          input,
          existingSubGoals.map((subGoal) => subGoal.id),
        );
        router.push(`/goals/${goalId}`);
        return;
      }
      const newGoalId = await createGoal(input);
      reset(); // 確認儲存成功先清空；失敗保留原本輸入。
      router.push(`/goals/${newGoalId}`); // 儲存成功後直接睇返大目標同細目標。
    } catch {
      setError("root", {
        message: goalId
          ? "儲存修改失敗，請再試一次。"
          : "新增目標失敗，請再試一次。",
      });
    }
  }

  if (isLoading) return <ListSkeleton label="載入資料中…" />;
  if (loadError)
    return (
      <div className="mt-8 space-y-4">
        <ErrorState message={loadError} />
        <Button asChild variant="outline">
          <Link href="/goals">返回目標列表</Link>
        </Button>
      </div>
    );
  if (categories.length === 0) {
    return (
      <EmptyState
        title="先建立一個分類"
        description="儲存目標前，請先建立至少一個分類。"
        action={
          <Button asChild variant="outline">
            <Link href="/categories">先新增分類</Link>
          </Button>
        }
      />
    );
  }

  return (
    <form
      className="editor-form space-y-6"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <fieldset disabled={isSubmitting} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="goal-title">
            標題
          </label>
          <Input
            id="goal-title"
            maxLength={100}
            placeholder="你想達成甚麼？"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "goal-title-error" : undefined}
            {...register("title")}
          />
          {errors.title ? (
            <p id="goal-title-error" className="text-sm text-destructive">
              {errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="goal-description">
            描述（可選）
          </label>
          <textarea
            id="goal-description"
            rows={4}
            maxLength={2000}
            placeholder="補充目標的方向或細節…"

            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "goal-description-error" : undefined
            }
            {...register("description")}
          />
          {errors.description ? (
            <p id="goal-description-error" className="text-sm text-destructive">
              {errors.description.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="goal-category">
            分類
          </label>
          <select
            id="goal-category"

            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={
              errors.categoryId ? "goal-category-error" : undefined
            }
            {...register("categoryId")}
          >
            <option value="">請選擇分類</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? (
            <p id="goal-category-error" className="text-sm text-destructive">
              {errors.categoryId.message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="goal-start-date">
              開始日期（可選）
            </label>
            <Input
              id="goal-start-date"
              type="date"
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={
                errors.startDate ? "goal-start-date-error" : undefined
              }
              {...register("startDate")}
            />
            {errors.startDate ? (
              <p
                id="goal-start-date-error"
                className="text-sm text-destructive"
              >
                {errors.startDate.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="goal-target-date">
              目標日期（可選）
            </label>
            <Input
              id="goal-target-date"
              type="date"
              aria-invalid={Boolean(errors.targetDate)}
              aria-describedby={
                errors.targetDate ? "goal-target-date-error" : undefined
              }
              {...register("targetDate")}
            />
            {errors.targetDate ? (
              <p
                id="goal-target-date-error"
                className="text-sm text-destructive"
              >
                {errors.targetDate.message}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          日期未定可以留空，亦可以只填其中一個。
        </p>
        <section
          className="space-y-4 border-t pt-5"
          aria-labelledby="new-sub-goals-heading"
        >
          <h2 id="new-sub-goals-heading" className="text-base font-semibold">
            細目標（可選）
          </h2>
          <p className="text-xs text-muted-foreground">
            拆成容易完成嘅步驟，一齊儲存。
          </p>
          {fields.length ? (
            <div aria-label="編輯細目標" className="divide-y">
              {fields.map((field, index) => (
                <details
                  key={field.id}
                  open={
                    index >= existingSubGoals.length ||
                    Boolean(errors.subGoals?.[index])
                  }
                  className="group py-2"
                >
                  <summary className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 line-clamp-2 font-medium">
                      {existingSubGoals[index]?.title ?? "新增細目標"}
                    </span>
                    <ChevronDown
                      aria-hidden
                      size={16}
                      className="text-muted-foreground group-open:rotate-180"
                    />
                  </summary>
                  <div className="space-y-3 rounded-md bg-card px-3 pt-2 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium">細目標 {index + 1}</h3>
                      {index >= existingSubGoals.length ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(index)}
                          aria-label={`移除細目標 ${index + 1}`}
                        >
                          <X aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                    <SubGoalFields
                      index={index}
                      existing={existingSubGoals[index]}
                      control={control}
                      register={register}
                      formState={formState}
                      getFieldState={getFieldState}
                      setValue={setValue}
                      unregister={unregister}
                    />
                  </div>
                </details>
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append(
                { kind: "checklist", title: "", description: "" },
                { focusName: `subGoals.${fields.length}.title` },
              )
            }
          >
            <Plus aria-hidden />
            加入細目標
          </Button>
        </section>
        <div className="form-actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "儲存中…" : goalId ? "儲存修改" : "儲存目標"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(goalId ? `/goals/${goalId}` : "/goals")}
          >
            取消
          </Button>
        </div>
      </fieldset>
      <div aria-live="polite">
        {errors.root ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.root.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
