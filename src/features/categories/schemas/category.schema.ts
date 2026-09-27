import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "請輸入分類名稱。")
    .max(50, "分類名稱最多 50 個字元。"),
  icon: z.string().trim().max(10, "圖示最多 10 個字元。").optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
