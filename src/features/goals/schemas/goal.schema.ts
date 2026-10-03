import { z } from "zod";

function dateInputSchema(message: string) {
  return z.iso.date(message).transform((value) => {
    const [year, month, day] = value.split("-").map(Number);
    // 用本地午夜，避免直接 new Date("YYYY-MM-DD") 當成 UTC 日期。
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  })
    // 日期 input 留空係 ""；轉成 undefined，service 就會省略呢個欄位。
    .or(z.literal("").transform(() => undefined))
    .optional();
}

// 只接受大目標輸入；id、userId、status 同 timestamps 由系統提供。
export const goalSchema = z.object({
  title: z.string().trim().min(1, "請輸入目標標題。").max(100, "標題最多 100 個字元。"),
  description: z.string().trim().max(2000, "描述最多 2000 個字元。").optional(),
  categoryId: z.string().trim().min(1, "請選擇分類。"),
  startDate: dateInputSchema("請選擇有效開始日期。"),
  targetDate: dateInputSchema("請選擇有效目標日期。"),
}).strict().refine((goal) => !goal.startDate || !goal.targetDate || goal.targetDate >= goal.startDate, {
  // 兩個日期都有填先比較；只填其中一個，或者兩個都唔填都接受。
  message: "目標日期唔可以早過開始日期。",
  path: ["targetDate"], // 將跨欄位錯誤顯示喺目標日期旁邊。
});

// Input 係表單輸入：日期係 string；parse 後嘅日期先會變成 Date。
export type GoalInput = z.input<typeof goalSchema>;
