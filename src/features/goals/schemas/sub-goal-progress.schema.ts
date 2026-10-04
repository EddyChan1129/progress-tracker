import { z } from "zod";

// 只填「今次增加幾多」，總數、身份同時間由 transaction 提供。
export const subGoalProgressSchema = z.object({
  progressDelta: z.number("請輸入增加數量。").positive("增加數量必須大於 0。"),
  note: z.string().trim().max(2000, "備註最多 2000 個字元。").optional(),
}).strict();

export type SubGoalProgressInput = z.input<typeof subGoalProgressSchema>;
