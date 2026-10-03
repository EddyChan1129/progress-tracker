import { type DocumentData, Timestamp } from "firebase/firestore";
import type { Goal } from "../types/goal.types";

// 列表同詳情共用：Firestore Timestamp → App Date。
export function toGoal(id: string, data: DocumentData): Goal {
  if (
    typeof data.userId !== "string" || typeof data.title !== "string" ||
    typeof data.categoryId !== "string" ||
    (data.description !== undefined && typeof data.description !== "string") ||
    !["not_started", "in_progress", "completed", "paused"].includes(data.status)
  ) throw new Error("目標資料格式不正確。");

  if (
    !(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp) ||
    (data.startDate !== undefined && !(data.startDate instanceof Timestamp)) ||
    (data.targetDate !== undefined && !(data.targetDate instanceof Timestamp))
  ) throw new Error("目標日期格式不正確。");

  // 逐個挑選新版欄位，舊記錄嘅 targetValue／currentValue／unit 唔會當大目標進度。
  return {
    id, userId: data.userId, title: data.title, categoryId: data.categoryId,
    ...(data.description ? { description: data.description } : {}),
    ...(data.startDate ? { startDate: data.startDate.toDate() } : {}),
    ...(data.targetDate ? { targetDate: data.targetDate.toDate() } : {}),
    status: data.status,
    createdAt: data.createdAt.toDate(), updatedAt: data.updatedAt.toDate(),
  };
}
