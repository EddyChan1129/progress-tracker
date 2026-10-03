"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategories } from "@/features/categories/services/category.service";
import type { Category } from "@/features/categories/types/category.types";
import { MarkdownContent } from "@/features/learning/components/markdown-content";
import { LearningImageInput } from "@/features/learning/components/learning-image-input";
import {
  learningEntrySchema,
  type LearningEntryInput,
} from "@/features/learning/schemas/learning.schema";
import {
  createLearningEntry,
  getLearningEntry,
} from "@/features/learning/services/learning.service";

import { saveLearningEntryWithImages, cleanupLearningImages, type ImageSaveAttempt } from "@/features/learning/services/learning-image.service";
import { getCurrentUserId } from "@/features/auth/services/auth.service";
import { LearningImages } from "@/features/learning/components/learning-images";
import type { LearningEntry, LearningImage } from "@/features/learning/types/learning.types";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function LearningForm({ entryId }: { entryId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(entryId);
  const originalEntry = useRef<LearningEntry | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const imageAttempt = useRef<ImageSaveAttempt | null>(null);
  const [savedImages, setSavedImages] = useState<LearningImage[]>([]);
  const [imageRetryPending, setImageRetryPending] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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

    Promise.all([
      getCategories(),
      entryId ? getLearningEntry(entryId) : Promise.resolve(null),
    ])
      .then(([categoryResult, entry]) => {
        if (!isCurrent) return;

        setCategories(categoryResult);

        if (entryId && !entry) {
          setLoadError("搵唔到呢筆學習記錄。");
          return;
        }

        if (entry) {
          originalEntry.current = entry;
          setSavedImages(entry.images);
          reset({
            title: entry.title,
            content: entry.content,
            categoryId: entry.categoryId,
            learnedAt: toDateInputValue(entry.learnedAt),
          });
        }
      })
      .catch(() => {
        if (isCurrent) setLoadError("未能載入資料，請重新整理再試。");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [entryId, reset]);

  async function onSubmit(input: LearningEntryInput) {
    setSuccessMessage("");

    try {
      if (entryId || imageFiles.length > 0) {
        imageAttempt.current ??= {
          id: entryId ?? crypto.randomUUID(), userId: getCurrentUserId(), uploads: new Map(),
          ...(entryId ? {
            operationId: crypto.randomUUID(),
            expectedUpdatedAt: originalEntry.current!.updatedAt.getTime(),
            startedAt: originalEntry.current!.createdAt.toISOString(),
          } : {}),
        };
        // 成功與否未確認前，只重試同一份資料同 operationId。
        setImageRetryPending(true);
        const result = await saveLearningEntryWithImages(input, imageFiles, imageAttempt.current, savedImages);
        imageAttempt.current = null;
        setImageFiles([]);
        setImageRetryPending(false);
        if (entryId) {
          router.push("/learning");
          return;
        }
        setSuccessMessage(result.cleanupPending ? "記錄已新增；部分圖片清理待重試，可到學習記錄列表處理。" : "學習記錄已新增。");
      } else {
        await createLearningEntry(input);
        setSuccessMessage("學習記錄已新增。");
      }
      reset({
        title: "",
        content: "",
        categoryId: "",
        learnedAt: getToday(),
      });
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "儲存失敗，請再試一次。",
      });
    }
  }

  async function handleCancel() {
    if (isCancelling || isSubmitting) return;
    setIsCancelling(true);
    setCancelPending(true);
    try {
      // 舊圖只喺本機移除；取消時只清理今次新上傳嘅圖。
      const result = await cleanupLearningImages([...imageAttempt.current?.uploads.values() ?? []]);
      if (result.cleanupPending) throw new Error("圖片仍待清理，請按「重試取消」。");
      router.push("/learning");
    } catch (error) {
      setError("root", { message: error instanceof Error ? error.message : "取消失敗，請再試。" });
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <p className="mt-8 text-sm text-muted-foreground" role="status">
        載入資料中…
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="mt-8 text-sm text-destructive" role="alert">
        {loadError}
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
      onSubmit={(event) => { void handleSubmit(onSubmit)(event); }}
    >
      <fieldset disabled={isSubmitting || imageRetryPending || cancelPending} className="space-y-5">
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

        <LearningImages images={savedImages} onRemove={(id) => setSavedImages((images) => images.filter((image) => image.publicId !== id))} disabled={isSubmitting || imageRetryPending || cancelPending} />
        {isEditing ? <p className="text-sm text-muted-foreground">移除圖片後，按「儲存修改」先會正式刪除。取消會保留原本圖片。</p> : null}
        <LearningImageInput disabled={isSubmitting || imageRetryPending || cancelPending} files={imageFiles} onChange={setImageFiles} existingCount={savedImages.length} />
      </fieldset>
      {imageRetryPending && !isSubmitting ? (
        <p className="text-sm text-muted-foreground" role="status">
          表單及圖片已保留。請按「重試儲存」，確認結果前請勿重新整理。
        </p>
      ) : null}

      <Button disabled={isSubmitting || cancelPending} type="submit">
        {isSubmitting
          ? isEditing
            ? "儲存中…"
            : "新增中…"
          : imageRetryPending
            ? "重試儲存"
          : isEditing
            ? "儲存修改"
            : "新增學習記錄"}
      </Button>

      <Button className="ml-2" variant="outline" type="button" disabled={isSubmitting || isCancelling} onClick={handleCancel}>
        {isCancelling ? "清理中…" : cancelPending ? "重試取消" : "取消"}
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
