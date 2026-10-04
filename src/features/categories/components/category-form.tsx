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
      className="mt-7 min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-6"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="category-name">
          名稱
        </label>
        <Input
          aria-describedby={errors.name ? "category-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          id="category-name"
          maxLength={50}
          placeholder="例如：LeetCode"
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

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "新增中…" : "新增分類"}
      </Button>

      <div aria-live="polite">
        {errors.root ? (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        ) : null}
        {successMessage ? (
          <p className="text-sm text-emerald-700">{successMessage}</p>
        ) : null}
      </div>
    </form>
  );
}
