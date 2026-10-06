"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  LEARNING_IMAGE_TYPES,
  validateLearningImages,
} from "@/features/learning/images";

export function LearningImageInput({
  files,
  onChange,
  disabled,
  existingCount = 0,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
  existingCount?: number;
}) {
  const [error, setError] = useState("");

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []);
    // 清空 native input，移除圖片後可以再次選同一個檔案。
    event.currentTarget.value = "";
    if (selected.length === 0) return;

    const message = validateLearningImages(
      selected,
      files.length + existingCount,
    );
    setError(message ?? "");
    if (message) return;

    onChange([...files, ...selected]);
  }

  return (
    <section aria-labelledby="learning-images-heading" className="space-y-3">
      <h2 className="text-sm font-medium" id="learning-images-heading">
        圖片（可選）
      </h2>
      <label className="sr-only" htmlFor="learning-images">
        選擇圖片
      </label>
      <input
        accept={LEARNING_IMAGE_TYPES.join(",")}
        aria-describedby="learning-images-help learning-images-error"
        aria-invalid={Boolean(error)}
        className="block min-h-11 w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border file:bg-card file:px-3 file:py-2.5 file:text-sm file:font-medium disabled:opacity-50"
        disabled={disabled}
        id="learning-images"
        multiple
        onChange={handleSelect}
        type="file"
      />
      <p
        className="text-xs leading-6 text-muted-foreground"
        id="learning-images-help"
      >
        JPEG、PNG、WebP；每張最多 4 MiB，每筆最多 5 張。已選{" "}
        {files.length + existingCount}/5 張。
        按儲存後先會上傳；儲存前重新整理會清除選擇。
      </p>
      <p
        className="text-sm text-destructive empty:hidden"
        id="learning-images-error"
        role="alert"
      >
        {error}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((file, index) => (
          <li className="min-w-0 space-y-2" key={index}>
            <ImagePreview file={file} />
            <p
              className="truncate text-xs text-muted-foreground"
              title={file.name}
            >
              {file.name}
            </p>
            <Button
              aria-label={`移除第 ${index + 1} 張圖片：${file.name}`}
              disabled={disabled}
              onClick={() => {
                setError("");
                onChange(files.filter((_, fileIndex) => fileIndex !== index));
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              移除
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImagePreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;

    // 換圖或 unmount 時釋放 browser 保存嘅預覽資源。
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 本機 blob URL 預覽，不需要 Next 圖片最佳化。
    <img
      alt={`預覽：${file.name}`}
      className="h-32 w-full rounded object-contain"
      ref={imageRef}
    />
  );
}
