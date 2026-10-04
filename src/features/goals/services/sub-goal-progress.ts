import { doc, getDocFromServer, runTransaction, serverTimestamp, Timestamp, type DocumentReference, type DocumentData } from "firebase/firestore";
import { subGoalProgressSchema, type SubGoalProgressInput } from "../schemas/sub-goal-progress.schema.ts";
import type { SubGoalUpdate } from "../types/sub-goal.types.ts";

// Reference 由已登入嘅 service 建立；Rules 仍會獨立驗證所有權。
export async function commitSubGoalProgress(ref: DocumentReference, userId: string, goalId: string,
  input: SubGoalProgressInput, operationId: string) {
  const data = subGoalProgressSchema.parse(input);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(operationId)) throw new Error("進度操作 ID 不正確。");
  const historyRef = doc(ref, "updates", operationId);
  for (let attempt = 0; ; attempt++) {
    let previousValue: number | undefined;
    try {
      return await runTransaction(ref.firestore, async (transaction) => {
        // 所有讀取先完成；Firestore 遇到並行修改會重新執行呢段 callback。
        const snapshot = await transaction.get(ref);
        const history = await transaction.get(historyRef);
        const child = snapshot.data();
        if (!child || child.userId !== userId || child.goalId !== goalId || child.kind !== "count" ||
          !Number.isFinite(child.currentValue) || child.currentValue < 0) {
          throw new Error("搵唔到本人嘅計數細目標。");
        }
        previousValue = child.currentValue;
        // 成功通知遺失後重試：同一 ID 已有歷史就唔再加數。
        if (history.exists()) {
          const saved = history.data();
          if (saved.progressDelta !== data.progressDelta || (saved.note ?? "") !== (data.note ?? "")) {
            throw new Error("呢次操作已儲存，唔可以改用另一組輸入。");
          }
          return child.currentValue as number;
        }
        const currentValue = child.currentValue + data.progressDelta;
        if (!Number.isFinite(currentValue) || currentValue <= child.currentValue) {
          throw new Error("增加數量超出可儲存範圍。");
        }
        transaction.set(historyRef, {
          ...data, userId, goalId, subGoalId: ref.id,
          previousValue: child.currentValue, currentValue, createdAt: serverTimestamp(),
        });
        // lastUpdateId 俾 Rules 搵到同一 transaction 嘅歷史，禁止單邊寫入。
        transaction.update(ref, { currentValue, lastUpdateId: operationId, updatedAt: serverTimestamp() });
        return currentValue;
      });
    } catch (error) {
      // Rules 可能先拒絕過期嘅 previousValue，SDK 未必收到可自動重試嘅 aborted。
      // 只喺 server 確認總數已被另一操作改過時重新 transaction；真正權限錯誤照樣拋出。
      if (attempt < 4 && previousValue !== undefined && error instanceof Error &&
        "code" in error && error.code === "permission-denied") {
        const latest = await getDocFromServer(ref);
        if (latest.exists() && latest.data().currentValue !== previousValue) continue;
      }
      throw error;
    }
  }
}

export function toSubGoalUpdate(id: string, data: DocumentData): SubGoalUpdate {
  const { userId, goalId, subGoalId, progressDelta, note, previousValue, currentValue, createdAt, ...extra } = data;
  const input = subGoalProgressSchema.parse({ progressDelta, ...(note !== undefined ? { note } : {}) });
  if (Object.keys(extra).length || [userId, goalId, subGoalId].some((value) => typeof value !== "string") ||
    !(createdAt instanceof Timestamp) || !Number.isFinite(previousValue) || previousValue < 0 ||
    !Number.isFinite(currentValue) || currentValue <= previousValue || currentValue !== previousValue + progressDelta) {
    throw new Error("進度歷史資料格式不正確。");
  }
  return { id, userId, goalId, subGoalId, ...input, previousValue, currentValue, createdAt: createdAt.toDate() };
}
