"use client";

import { Button } from "@/components/ui/button";
import type { LearningImage } from "@/features/learning/types/learning.types";

export function LearningImages({ images, onRemove, disabled = false }: {
  images: LearningImage[];
  onRemove?: (publicId: string) => void;
  disabled?: boolean;
}) {
  if (images.length === 0) return null;
  return (
    <ul aria-label="已儲存圖片" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((image, index) => (
        <li key={image.publicId}>
          <a href={image.url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- 直接顯示 Cloudinary 已託管圖片。 */}
            <img alt={`學習筆記圖片 ${index + 1}`} src={image.url} loading="lazy" className="h-40 w-full rounded border object-contain" />
          </a>
          {onRemove ? (
            <Button className="mt-2" type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onRemove(image.publicId)}>移除圖片 {index + 1}</Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
