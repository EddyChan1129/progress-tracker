import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./admin.ts";

export async function deleteOwnedGoal(userId: string, goalId: string, subGoalId?: string) {
  const db = getAdminDb();
  const owner = db.collection("users").doc(userId);
  const goal = owner.collection("goals").doc(goalId);
  const target = subGoalId ? goal.collection("subGoals").doc(subGoalId) : goal;

  // 保留 parent 到清理完成；失敗可重試。Rules 禁止刪除期間再新增／修改後代。
  const exists = await db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(goal, ...(subGoalId ? [target] : []));
    const parent = snapshots[0];
    if (!parent.exists) return false;
    if (parent.data()?.userId !== userId) throw new Error("missing");
    if (subGoalId && parent.data()?.deleting) throw new Error("parentDeleting");
    const current = snapshots[subGoalId ? 1 : 0];
    if (current.exists && (current.data()?.userId !== userId || (subGoalId && current.data()?.goalId !== goalId))) {
      throw new Error("missing");
    }
    if (current.exists) transaction.update(target, { deleting: true });
    return true;
  });
  if (!exists) return;

  if (subGoalId) {
    // 原生 recursiveDelete 處理任意數量歷史，唔受單次 batch 寫入數限制。
    await db.recursiveDelete(target.collection("updates"));
  } else {
    await db.recursiveDelete(goal.collection("subGoals"));
    const related = owner.collection("learningEntries").where("relatedGoalId", "==", goalId).limit(100);
    while (true) {
      const entries = await related.get();
      if (entries.empty) break;
      await Promise.all(entries.docs.map((entry) => db.runTransaction(async (transaction) => {
        const current = await transaction.get(entry.ref);
        // 只解除仍然指向呢個目標嘅關聯，唔覆蓋並行編輯嘅筆記／新關聯。
        if (current.data()?.relatedGoalId === goalId) transaction.update(entry.ref, {
          relatedGoalId: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
        });
      })));
    }
  }
  await target.delete();
}
