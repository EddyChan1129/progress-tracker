"use client";

import { Button } from "@/components/ui/button";
import type { LearningImage } from "@/features/learning/types/learning.types";
import { useState } from "react";
import { ImageOff } from "lucide-react";

export function LearningImages({
  images,
  onRemove,
  disabled = false,
}: {
  images: LearningImage[];
  onRemove?: (publicId: string) => void;
  disabled?: boolean;
}) {
  if (images.length === 0) return null;
  return (
    <ul
      aria-label="已儲存圖片"
      className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {images.map((image, index) => (
        <li key={image.publicId} className="min-w-0">
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md"
            aria-label={`開啟學習筆記圖片 ${index + 1}`}
          >
            <SavedImage image={image} index={index} />
          </a>
          {onRemove ? (
            <Button
              className="mt-2"
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onRemove(image.publicId)}
            >
              移除圖片 {index + 1}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SavedImage({ image, index }: { image: LearningImage; index: number }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md border bg-muted text-xs text-muted-foreground">
        <ImageOff aria-hidden size={20} />
        圖片未能載入
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary already hosts these images.
    <img
      alt={`學習筆記圖片 ${index + 1}`}
      src={image.url}
      loading="lazy"
      onError={() => setFailed(true)}
      className="aspect-[4/3] w-full rounded-md border bg-card object-contain"
    />
  );
}
