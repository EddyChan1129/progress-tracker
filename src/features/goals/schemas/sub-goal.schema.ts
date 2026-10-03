import { z } from "zod";

const commonFields = {
  title: z.string().trim().min(1, "請輸入細目標標題。").max(100, "標題最多 100 個字元。"),
  description: z.string().trim().max(2000, "描述最多 2000 個字元。").optional(),
};

// 按 kind 選擇驗證規則；之後表單預設 checklist，想計量先選 count。
// strict 拒絕混用欄位，亦唔接受 userId、goalId、進度、完成狀態或系統時間。
export const subGoalSchema = z.discriminatedUnion("kind", [
  z.object({
    ...commonFields,
    kind: z.literal("checklist"),
  }).strict(),
  z.object({
    ...commonFields,
    kind: z.literal("count"),
    targetValue: z.number("請輸入目標數量。").positive("目標數量必須大於 0。"),
    unit: z.string().trim().min(1, "請輸入單位。").max(20, "單位最多 20 個字元。"),
  }).strict(),
]);

// 建立輸入只有使用者可填嘅欄位，唔等於已儲存嘅 SubGoal。
export type SubGoalInput = z.input<typeof subGoalSchema>;
