// 限定狀態名稱；實際狀態轉換會由之後嘅 service／Rules 驗證。
export type GoalStatus = "not_started" | "in_progress" | "completed" | "paused";

// App 讀取後用 Date；之後 service 負責同 Firestore Timestamp 轉換。
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  categoryId: string;
  targetValue: number; // 例如目標完成 10 題，呢度係 10。
  currentValue: number; // 初始 0；之後透過新增進度更新，唔由建立表單填寫。
  unit: string; // 例如「題」、「章」；有進度後唔可以改單位。
  startDate: Date;
  targetDate: Date;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 每次進度更新嘅歷史，例如今日完成 +2 題。
export interface GoalUpdate {
  id: string;
  userId: string;
  goalId: string;
  progressDelta: number;
  note?: string;
  learningEntryId?: string;
  createdAt: Date;
}
