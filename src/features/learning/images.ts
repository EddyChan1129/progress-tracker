export const MAX_LEARNING_IMAGES = 5;
export const MAX_LEARNING_IMAGE_BYTES = 4 * 1024 * 1024;
export const LEARNING_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 本機檢查只改善 UX；之後 server／Cloudinary 仍需驗證實際圖片。
export function validateLearningImages(
  files: ReadonlyArray<Pick<File, "type" | "size">>,
  currentCount: number,
): string | null {
  if (currentCount + files.length > MAX_LEARNING_IMAGES) {
    return "每筆最多選擇 5 張圖片。";
  }
  if (files.some((file) => !LEARNING_IMAGE_TYPES.includes(file.type))) {
    return "只接受 JPEG、PNG 或 WebP 圖片。";
  }
  if (files.some((file) => file.size === 0 || file.size > MAX_LEARNING_IMAGE_BYTES)) {
    return "圖片不可為空，每張最多 4 MiB。";
  }
  return null;
}
