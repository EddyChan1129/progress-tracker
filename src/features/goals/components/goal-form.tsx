"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";
import { goalSchema, type GoalInput } from "@/features/goals/schemas/goal.schema";
import { createGoal } from "@/features/goals/services/goal.service";

export function GoalForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({
    // 驗證後仍交原本嘅 string 輸入俾 service；service 自己 parse 成 Date。
    resolver: zodResolver(goalSchema, undefined, { raw: true }),
    defaultValues: { title: "", description: "", categoryId: "", startDate: "", targetDate: "" },
  });

  useEffect(() => {
    let isCurrent = true;
    getCategories()
      .then((result) => { if (isCurrent) setCategories(result); })
      .catch(() => { if (isCurrent) setLoadError("未能載入分類，請重新整理再試。"); })
      .finally(() => { if (isCurrent) setIsLoading(false); });
    // 離開頁面後，唔再用舊 request 結果更新 state。
    return () => { isCurrent = false; };
  }, []);

  async function onSubmit(input: GoalInput) {
    setSuccessMessage("");
    try {
      await createGoal(input);
      reset(); // 確認儲存成功先清空；失敗保留原本輸入。
      setSuccessMessage("大目標已新增。");
    } catch {
      setError("root", { message: "新增目標失敗，請再試一次。" });
    }
  }

  if (isLoading) return <p className="mt-8 text-sm text-muted-foreground" role="status">載入分類中…</p>;
  if (loadError) return <p className="mt-8 text-sm text-destructive" role="alert">{loadError}</p>;
  if (categories.length === 0) {
    return (
      <div className="mt-8 max-w-lg space-y-4 rounded-xl border bg-card p-6">
        <p>新增目標前，請先建立至少一個分類。</p>
        <Button asChild variant="outline"><Link href="/categories">先新增分類</Link></Button>
      </div>
    );
  }

  return (
    <form className="mt-8 max-w-2xl space-y-5 rounded-xl border bg-card p-6" noValidate onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isSubmitting} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="goal-title">標題</label>
          <Input id="goal-title" maxLength={100} placeholder="例如：成為冷氣師傅、改善英文 speaking"
            aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "goal-title-error" : undefined}
            {...register("title")} />
          {errors.title ? <p id="goal-title-error" className="text-sm text-destructive">{errors.title.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="goal-description">描述（可選）</label>
          <textarea id="goal-description" rows={4} maxLength={2000} placeholder="例如：學識安裝、保養同維修冷氣。"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "goal-description-error" : undefined}
            {...register("description")} />
          {errors.description ? <p id="goal-description-error" className="text-sm text-destructive">{errors.description.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="goal-category">分類</label>
          <select id="goal-category"
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId ? "goal-category-error" : undefined}
            {...register("categoryId")}>
            <option value="">請選擇分類</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {errors.categoryId ? <p id="goal-category-error" className="text-sm text-destructive">{errors.categoryId.message}</p> : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="goal-start-date">開始日期（可選）</label>
            <Input id="goal-start-date" type="date"
              aria-invalid={Boolean(errors.startDate)} aria-describedby={errors.startDate ? "goal-start-date-error" : undefined}
              {...register("startDate")} />
            {errors.startDate ? <p id="goal-start-date-error" className="text-sm text-destructive">{errors.startDate.message}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="goal-target-date">目標日期（可選）</label>
            <Input id="goal-target-date" type="date"
              aria-invalid={Boolean(errors.targetDate)} aria-describedby={errors.targetDate ? "goal-target-date-error" : undefined}
              {...register("targetDate")} />
            {errors.targetDate ? <p id="goal-target-date-error" className="text-sm text-destructive">{errors.targetDate.message}</p> : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">日期未定可以留空，亦可以只填其中一個。</p>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "新增中…" : "新增大目標"}</Button>
      </fieldset>
      <div aria-live="polite">
        {errors.root ? <p className="text-sm text-destructive" role="alert">{errors.root.message}</p> : null}
        {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
      </div>
    </form>
  );
}
