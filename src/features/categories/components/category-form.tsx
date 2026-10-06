"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categorySchema,
  type CategoryInput,
} from "@/features/categories/schemas/category.schema";
import { createCategory } from "@/features/categories/services/category.service";

export function CategoryForm({ onCreated }: { onCreated: () => void }) {
  const [successMessage, setSuccessMessage] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", icon: "" },
  });

  async function onSubmit(input: CategoryInput) {
    setSuccessMessage("");

    try {
      await createCategory(input);
      reset();
      setSuccessMessage("分類已新增。");
      onCreated();
    } catch {
      setError("root", { message: "新增分類失敗，請再試一次。" });
    }
  }

  return (
    <form
      className="min-w-0 space-y-4"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <h2 className="text-base font-semibold">新增分類</h2>
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="category-name">
            名稱
          </label>
          <Input
            aria-describedby={errors.name ? "category-name-error" : undefined}
            aria-invalid={Boolean(errors.name)}
            id="category-name"
            maxLength={50}
            placeholder="例如：英文、工作技能"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive" id="category-name-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="category-icon">
            圖示（可選）
          </label>
          <Input
            aria-describedby={errors.icon ? "category-icon-error" : undefined}
            aria-invalid={Boolean(errors.icon)}
            id="category-icon"
            maxLength={10}
            placeholder="例如：💻"
            {...register("icon")}
          />
          {errors.icon ? (
            <p className="text-sm text-destructive" id="category-icon-error">
              {errors.icon.message}
            </p>
          ) : null}
        </div>
      </fieldset>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "新增中…" : "新增分類"}
      </Button>

      <div aria-live="polite">
        {errors.root ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.message}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-sm text-emerald-700">{successMessage}</p>
        ) : null}
      </div>
    </form>
  );
}
