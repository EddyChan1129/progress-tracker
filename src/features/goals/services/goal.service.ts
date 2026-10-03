import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { getCurrentUserId } from "@/features/auth/services/auth.service";
import { goalSchema, type GoalInput } from "@/features/goals/schemas/goal.schema";
import { db } from "@/lib/firebase/client";

export async function createGoal(input: GoalInput) {
  // UID 由 Firebase 登入狀態取得，唔接受表單傳入另一個 userId。
  const userId = getCurrentUserId();
  const { title, description, categoryId, targetValue, unit, startDate, targetDate } = goalSchema.parse(input);

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
    targetValue,
    currentValue: 0, // 新目標由 0 開始，唔使用 caller 傳入嘅進度。
    unit,
    startDate: Timestamp.fromDate(startDate),
    targetDate: Timestamp.fromDate(targetDate),
    status: "not_started",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return goal.id;
}
