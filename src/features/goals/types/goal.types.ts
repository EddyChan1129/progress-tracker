// 限定狀態名稱；狀態轉換由 service／Rules 驗證。
export type GoalStatus = "not_started" | "in_progress" | "completed" | "paused";

// 大目標例如「成為冷氣師傅」；數量／單位留畀之後嘅子目標。
// App 讀取後用 Date；service 負責同 Firestore Timestamp 轉換。
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  categoryId: string;
  startDate?: Date; // 未定日期可以省略。
  targetDate?: Date;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}
