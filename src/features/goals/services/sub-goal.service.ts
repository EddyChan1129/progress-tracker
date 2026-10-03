import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getCurrentUserId } from "@/features/auth/services/auth.service";
import { subGoalSchema, type SubGoalInput } from "../schemas/sub-goal.schema";
import type { SubGoal } from "../types/sub-goal.types";
import { db } from "@/lib/firebase/client";
import { toSubGoal } from "./sub-goal-data";

// 新增同讀取都要有本人既有大目標；唔接受 caller 傳入 userId。
async function getSubGoalsCollection(goalId: string) {
  const userId = getCurrentUserId();
  if (!goalId.trim() || goalId !== goalId.trim() || goalId.includes("/") || [".", ".."].includes(goalId)) {
    throw new Error("目標不正確。");
  }
  const goal = await getDoc(doc(db, "users", userId, "goals", goalId));
  if (!goal.exists() || goal.data().userId !== userId) {
    throw new Error("搵唔到本人嘅大目標。");
  }
  return { userId, ref: collection(goal.ref, "subGoals") };
}

export async function createSubGoal(goalId: string, input: SubGoalInput) {
  const data = subGoalSchema.parse(input);
  const { userId, ref } = await getSubGoalsCollection(goalId);
  const subGoal = await addDoc(ref, {
    ...data,
    userId, goalId,
    // 初始進度由 service 設定，唔由表單決定。
    ...(data.kind === "checklist" ? { isCompleted: false } : { currentValue: 0 }),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return subGoal.id;
}

export async function getSubGoals(goalId: string): Promise<SubGoal[]> {
  const { ref } = await getSubGoalsCollection(goalId);
  const snapshot = await getDocs(query(ref, orderBy("createdAt", "asc")));
  return snapshot.docs.map((document) => toSubGoal(document.id, document.data()));
}
