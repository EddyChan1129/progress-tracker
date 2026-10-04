import { runTransaction, serverTimestamp, type DocumentReference } from "firebase/firestore";
import type { GoalStatus } from "../types/goal.types.ts";
import { toGoal } from "./goal-data.ts";

// 大目標狀態由使用者決定，唔由子目標數量推算。已完成係今次流程嘅終點。
export const goalStatusTransitions: Record<GoalStatus, readonly GoalStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["paused", "completed"],
  paused: ["in_progress"],
  completed: [],
};

export async function commitGoalStatus(ref: DocumentReference, userId: string,
  status: GoalStatus, expectedStatus: GoalStatus): Promise<GoalStatus> {
  if (typeof status !== "string" || typeof expectedStatus !== "string" ||
    !Object.hasOwn(goalStatusTransitions, status) || !Object.hasOwn(goalStatusTransitions, expectedStatus)) {
    throw new Error("目標狀態不正確。");
  }
  return runTransaction(ref.firestore, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().userId !== userId) throw new Error("搵唔到本人嘅大目標。");
    const goal = toGoal(snapshot.id, snapshot.data());
    // 成功回應遺失後重試，同一狀態唔需要再寫入。
    if (goal.status === status) return status;
    if (goal.status !== expectedStatus) throw new Error("目標狀態已改變，請重新整理再試。");
    if (!goalStatusTransitions[goal.status].includes(status)) throw new Error("唔可以進行呢個狀態轉換。");
    // 只更新狀態及 server 時間，唔重設任何細目標、進度或歷史。
    transaction.update(ref, { status, updatedAt: serverTimestamp() });
    return status;
  });
}
