import { z } from "zod";

export const learningEntrySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "請輸入標題。")
    .max(100, "標題最多 100 個字元。"),
  content: z
    .string()
    .refine((value) => value.trim().length > 0, "請輸入學習內容。"),
  categoryId: z.string().trim().min(1, "請選擇分類。"),
  learnedAt: z.iso.date("請選擇有效日期。").transform((value) => {
    const [year, month, day] = value.split("-").map(Number);

    // 用本地日期建立 Date，避免將 YYYY-MM-DD 當成 UTC 後出現日期偏移。
    return new Date(year, month - 1, day);
  }),
});

export type LearningEntryInput = z.input<typeof learningEntrySchema>;
