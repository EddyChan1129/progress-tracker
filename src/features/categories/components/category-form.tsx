"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categorySchema,
  type CategoryInput,
} from "@/features/categories/schemas/category.schema";
import { createCategory } from "@/features/categories/services/category.service";

const categoryIcons = [
  ["📁", "資料夾"],
  ["📚", "閱讀"],
  ["💻", "程式"],
  ["🌍", "語言"],
  ["💼", "工作"],
  ["🎯", "目標"],
  ["🎨", "創作"],
  ["🎵", "音樂"],
  ["🏃", "運動"],
  ["🌱", "成長"],
  ["🔧", "技能"],
  ["💡", "靈感"],
] as const;

export function CategoryForm({ onCreated }: { onCreated: () => void }) {
  const [successMessage, setSuccessMessage] = useState("");
  const {
    register,
    control,
    setValue,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", icon: "" },
  });

  const selectedIcon = useWatch({ control, name: "icon" });

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
            placeholder="分類名稱"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive" id="category-name-error">
              {errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">圖示（可選）</legend>
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="選擇分類圖示"
            >
              {categoryIcons.map(([icon, label]) => (
                <Button
                  key={icon}
                  type="button"
                  variant={selectedIcon === icon ? "secondary" : "ghost"}
                  size="icon"
                  aria-label={label}
                  aria-pressed={selectedIcon === icon}
                  className={
                    selectedIcon === icon
                      ? "text-xl ring-1 ring-primary"
                      : "text-xl"
                  }
                  onClick={() =>
                    setValue("icon", selectedIcon === icon ? "" : icon, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {icon}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={!selectedIcon}
              onClick={() =>
                setValue("icon", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              不使用圖示
            </Button>
          </fieldset>
          <label
            className="block text-xs text-muted-foreground"
            htmlFor="category-icon"
          >
            自訂 emoji
          </label>
          <Input
            aria-describedby={errors.icon ? "category-icon-error" : undefined}
            aria-invalid={Boolean(errors.icon)}
            id="category-icon"
            maxLength={10}
            placeholder="輸入其他 emoji"
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
