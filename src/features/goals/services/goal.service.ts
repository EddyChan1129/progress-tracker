import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { getCurrentUserId } from "@/features/auth/services/auth.service";
import { goalSchema, type GoalInput } from "@/features/goals/schemas/goal.schema";
import { db } from "@/lib/firebase/client";
import type { Goal } from "@/features/goals/types/goal.types";
import { toGoal } from "./goal-data";

export async function getGoals(): Promise<Goal[]> {
  const userId = getCurrentUserId();
  // 按建立時間由新到舊；唔按可選日期排序，避免漏咗未填日期嘅目標。
  const snapshot = await getDocs(query(
    collection(db, "users", userId, "goals"), orderBy("createdAt", "desc"),
  ));
  return snapshot.docs.map((document) => toGoal(document.id, document.data()));
}

export async function getGoal(goalId: string): Promise<Goal | null> {
  const userId = getCurrentUserId();
  const snapshot = await getDoc(doc(db, "users", userId, "goals", goalId));
  return snapshot.exists() ? toGoal(snapshot.id, snapshot.data()) : null;
}

export async function createGoal(input: GoalInput) {
  // UID 由 Firebase 登入狀態取得，唔接受表單傳入另一個 userId。
  const userId = getCurrentUserId();
  const { title, description, categoryId, startDate, targetDate } = goalSchema.parse(input);

  // categoryId 只可以係一個 document ID，唔可以係其他路徑。
  if (categoryId.includes("/") || [".", ".."].includes(categoryId)) {
    throw new Error("分類不正確。");
  }
  const category = await getDoc(doc(db, "users", userId, "categories", categoryId));
  if (!category.exists() || category.data().userId !== userId) {
    throw new Error("搵唔到本人嘅分類，請重新選擇。");
  }

  const goal = await addDoc(collection(db, "users", userId, "goals"), {
    userId,
    title,
    ...(description ? { description } : {}), // 冇描述就省略，唔寫 undefined。
    categoryId,
    // 可選日期冇值就省略，唔將 undefined 寫入 Firestore。
    ...(startDate ? { startDate: Timestamp.fromDate(startDate) } : {}),
    ...(targetDate ? { targetDate: Timestamp.fromDate(targetDate) } : {}),
    status: "not_started",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return goal.id;
}
