"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";
import { MarkdownContent } from "@/features/learning/components/markdown-content";
import {
  learningEntrySchema,
  type LearningEntryInput,
} from "@/features/learning/schemas/learning.schema";
import { createLearningEntry } from "@/features/learning/services/learning.service";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function LearningForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LearningEntryInput>({
    resolver: zodResolver(learningEntrySchema, undefined, { raw: true }),
    defaultValues: {
      title: "",
      content: "",
      categoryId: "",
      learnedAt: getToday(),
    },
  });
  const content = useWatch({ control, name: "content" });

  useEffect(() => {
    let isCurrent = true;

    getCategories()
      .then((result) => {
        if (isCurrent) setCategories(result);
      })
      .catch(() => {
        if (isCurrent) setCategoryError("未能載入分類，請重新整理再試。");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingCategories(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function onSubmit(input: LearningEntryInput) {
    setSuccessMessage("");

    try {
      await createLearningEntry(input);
      reset({
        title: "",
        content: "",
        categoryId: "",
        learnedAt: getToday(),
      });
      setSuccessMessage("學習記錄已新增。");
    } catch {
      setError("root", { message: "新增學習記錄失敗，請再試一次。" });
    }
  }

  if (isLoadingCategories) {
    return (
      <p className="mt-8 text-sm text-muted-foreground" role="status">
        載入分類中…
      </p>
    );
  }

  if (categoryError) {
    return (
      <p className="mt-8 text-sm text-destructive" role="alert">
        {categoryError}
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="mt-8 max-w-lg space-y-4 rounded-xl border bg-card p-6">
        <p>新增學習記錄前，請先建立至少一個分類。</p>
        <Button asChild variant="outline">
          <Link href="/categories">先新增分類</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="mt-8 max-w-2xl space-y-5 rounded-xl border bg-card p-6"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="learning-title">
          標題
        </label>
        <Input
          aria-describedby={errors.title ? "learning-title-error" : undefined}
          aria-invalid={Boolean(errors.title)}
          id="learning-title"
          maxLength={100}
          placeholder="例如：Two Sum"
          {...register("title")}
        />
        {errors.title ? (
          <p className="text-sm text-destructive" id="learning-title-error">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="learning-content">
          學習內容
        </label>
        <textarea
          aria-describedby={
            errors.content ? "learning-content-error" : undefined
          }
          aria-invalid={Boolean(errors.content)}
          className="min-h-40 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
          id="learning-content"
          placeholder={"例如：\n\n```js\nconst seen = new Map();\n```"}
          {...register("content")}
        />
        {errors.content ? (
          <p className="text-sm text-destructive" id="learning-content-error">
            {errors.content.message}
          </p>
        ) : null}
      </div>

      {content.trim() ? (
        <section aria-labelledby="learning-preview-heading" className="space-y-3">
          <h2 className="text-sm font-medium" id="learning-preview-heading">
            預覽
          </h2>
          <div className="rounded-lg border bg-background p-4">
            <MarkdownContent content={content} />
          </div>
        </section>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="learning-category">
          分類
        </label>
        <select
          aria-describedby={
            errors.categoryId ? "learning-category-error" : undefined
          }
          aria-invalid={Boolean(errors.categoryId)}
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
          id="learning-category"
          {...register("categoryId")}
        >
          <option value="">請選擇分類</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon ? `${category.icon} ` : ""}
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId ? (
          <p className="text-sm text-destructive" id="learning-category-error">
            {errors.categoryId.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="learning-date">
          學習日期
        </label>
        <Input
          aria-describedby={
            errors.learnedAt ? "learning-date-error" : undefined
          }
          aria-invalid={Boolean(errors.learnedAt)}
          id="learning-date"
          type="date"
          {...register("learnedAt")}
        />
        {errors.learnedAt ? (
          <p className="text-sm text-destructive" id="learning-date-error">
            {errors.learnedAt.message}
          </p>
        ) : null}
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "新增中…" : "新增學習記錄"}
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
