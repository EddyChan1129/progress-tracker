import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

import { getCurrentUserId } from "@/features/auth/services/auth.service";
import { auth } from "@/lib/firebase/client";
import { goalCreationSchema, type GoalCreationInput } from "@/features/goals/schemas/goal.schema";
import { db } from "@/lib/firebase/client";
import type { Goal, GoalStatus } from "@/features/goals/types/goal.types";
import { toGoal } from "./goal-data";
import { commitGoalStatus } from "./goal-status";

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

export async function setGoalStatus(goalId: string, status: GoalStatus, expectedStatus: GoalStatus) {
  const userId = getCurrentUserId();
  if (!goalId.trim() || goalId !== goalId.trim() || goalId.includes("/") || [".", ".."].includes(goalId)) {
    throw new Error("目標不正確。");
  }
  return commitGoalStatus(doc(db, "users", userId, "goals", goalId), userId, status, expectedStatus);
}

export async function deleteGoal(goalId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("請先登入。");
  const response = await fetch("/api/goals", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ goalId }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "刪除目標失敗，請再試一次。");
}

export async function createGoal(input: GoalCreationInput) {
  // UID 由 Firebase 登入狀態取得，唔接受表單傳入另一個 userId。
  const userId = getCurrentUserId();
  const { title, description, categoryId, startDate, targetDate, subGoals = [] } = goalCreationSchema.parse(input);

  await assertOwnCategory(userId, categoryId);

  const goal = doc(collection(db, "users", userId, "goals"));
  const batch = writeBatch(db);
  batch.set(goal, {
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

  for (const subGoal of subGoals) {
    batch.set(doc(collection(goal, "subGoals")), {
      ...subGoal,
      userId, goalId: goal.id,
      ...(subGoal.kind === "checklist" ? { isCompleted: false } : { currentValue: 0 }),
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }
  // 全部成功先儲存；任何一筆被 Rules 拒絕，整批都唔會寫入。
  await batch.commit();

  return goal.id;
}

// existingIds 按表單前面嘅既有細目標排序；新加入嘅行冇舊 ID。
export async function updateGoal(goalId: string, input: GoalCreationInput, existingIds: string[] = []) {
  const userId = getCurrentUserId();
  const { title, description, categoryId, startDate, targetDate, subGoals = [] } = goalCreationSchema.parse(input);
  if (existingIds.length > subGoals.length || new Set(existingIds).size !== existingIds.length
    || existingIds.some((id) => !id.trim() || id !== id.trim() || id.includes("/") || [".", ".."].includes(id))) {
    throw new Error("細目標不正確。");
  }
  if (!goalId.trim() || goalId !== goalId.trim() || goalId.includes("/") || [".", ".."].includes(goalId)) {
    throw new Error("目標不正確。");
  }
  const ref = doc(db, "users", userId, "goals", goalId);
  const goal = await getDoc(ref);
  if (!goal.exists() || goal.data().userId !== userId) {
    throw new Error("搵唔到本人嘅大目標。");
  }
  await assertOwnCategory(userId, categoryId);

  const batch = writeBatch(db);
  // 只更新可編輯欄位，唔覆寫身份、建立時間或狀態。
  batch.update(ref, {
    title, categoryId,
    // 編輯時留空代表移除舊值；省略欄位反而會保留原值。
    description: description || deleteField(),
    startDate: startDate ? Timestamp.fromDate(startDate) : deleteField(),
    targetDate: targetDate ? Timestamp.fromDate(targetDate) : deleteField(),
    updatedAt: serverTimestamp(),
  });

  const existing = await Promise.all(existingIds.map((id) => getDoc(doc(ref, "subGoals", id))));
  for (const [index, subGoal] of subGoals.entries()) {
    const previous = existing[index];
    if (previous) {
      const data = previous.data();
      if (!data || data.userId !== userId || data.goalId !== goalId || data.kind !== subGoal.kind) {
        throw new Error("搵唔到本人嘅細目標，或者類型已改變。");
      }
      if (subGoal.kind === "count" && data.currentValue !== 0
        && (data.targetValue !== subGoal.targetValue || data.unit !== subGoal.unit)) {
        throw new Error("已有進度嘅細目標唔可以更改數量或單位。");
      }
      batch.update(previous.ref, {
        title: subGoal.title, description: subGoal.description || deleteField(),
        ...(subGoal.kind === "count" ? { targetValue: subGoal.targetValue, unit: subGoal.unit } : {}),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(collection(ref, "subGoals")), {
        ...subGoal, userId, goalId,
        ...(subGoal.kind === "checklist" ? { isCompleted: false } : { currentValue: 0 }),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    }
  }
  // 大／細目標全部成功先儲存；Rules 會再次核實最新進度，防止讀取後被另一個頁面更改。
  await batch.commit();
}

// 新增同編輯共用分類檢查；真正權限仍由 Firestore Rules 核實。
async function assertOwnCategory(userId: string, categoryId: string) {
  if (categoryId.includes("/") || [".", ".."].includes(categoryId)) {
    throw new Error("分類不正確。");
  }
  const category = await getDoc(doc(db, "users", userId, "categories", categoryId));
  if (!category.exists() || category.data().userId !== userId) {
    throw new Error("搵唔到本人嘅分類，請重新選擇。");
  }
}
