import { type DocumentData, Timestamp } from "firebase/firestore";
import { subGoalSchema } from "../schemas/sub-goal.schema.ts";
import type { SubGoal } from "../types/sub-goal.types";

// Firestore Timestamp → Date；同時避免將錯誤資料當成合法 SubGoal。
export function toSubGoal(id: string, data: DocumentData): SubGoal {
  const { userId, goalId, createdAt, updatedAt, currentValue, isCompleted, lastUpdateId, deleting, ...input } = data;
  if (deleting !== undefined && typeof deleting !== "boolean") throw new Error("細目標刪除狀態不正確。");
  if (lastUpdateId !== undefined && (data.kind !== "count" || typeof lastUpdateId !== "string" || !lastUpdateId)) {
    throw new Error("細目標進度操作不正確。");
  }
  const fields = subGoalSchema.parse(input);
  if (typeof userId !== "string" || typeof goalId !== "string" ||
    !(createdAt instanceof Timestamp) || !(updatedAt instanceof Timestamp)) {
    throw new Error("細目標資料格式不正確。");
  }
  const common = { id, userId, goalId, createdAt: createdAt.toDate(), updatedAt: updatedAt.toDate(), ...(deleting ? { deleting: true } : {}) };
  if (fields.kind === "checklist") {
    if (typeof isCompleted !== "boolean" || currentValue !== undefined) throw new Error("細目標完成狀態不正確。");
    return { ...common, ...fields, isCompleted };
  }
  if (!Number.isFinite(currentValue) || currentValue < 0 || isCompleted !== undefined) {
    throw new Error("細目標進度不正確。");
  }
  return { ...common, ...fields, currentValue };
}
