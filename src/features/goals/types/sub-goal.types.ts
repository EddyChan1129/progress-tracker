// 兩種細目標共用嘅資料；身份、parent ID 同時間由 service 提供。
interface SubGoalBase {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 例如「搵老師」：只需要記住完成／未完成。
export interface ChecklistSubGoal extends SubGoalBase {
  kind: "checklist";
  isCompleted: boolean;
}

// 例如「學 300 個單字」：完成與否之後由 currentValue >= targetValue 判斷。
export interface CountSubGoal extends SubGoalBase {
  kind: "count";
  targetValue: number;
  currentValue: number;
  unit: string;
}

// 用 kind 分辨兩種資料，唔將所有欄位都設成 optional。
export type SubGoal = ChecklistSubGoal | CountSubGoal;

// 每次增加進度留一筆不可修改嘅歷史；id 亦係今次操作嘅唯一 ID。
export interface SubGoalUpdate {
  id: string;
  userId: string;
  goalId: string;
  subGoalId: string;
  progressDelta: number;
  previousValue: number;
  currentValue: number;
  note?: string;
  createdAt: Date;
}
