import { learningMediaRequest } from "./learning-image.service";
import {
  collection,
  doc,
  type DocumentData,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { getCurrentUserId } from "@/features/auth/services/auth.service";
import type { LearningEntry } from "@/features/learning/types/learning.types";
import { db } from "@/lib/firebase/client";

export function deleteLearningEntry(entryId: string) {
  return learningMediaRequest("/api/learning-entries", "DELETE", { entryId });
}

function toLearningEntry(id: string, data: DocumentData): LearningEntry {
  if (
    !(data.learnedAt instanceof Timestamp) ||
    !(data.createdAt instanceof Timestamp) ||
    !(data.updatedAt instanceof Timestamp)
  ) {
    throw new Error("學習記錄日期格式不正確。");
  }

  return {
    id,
    userId: data.userId,
    title: data.title,
    content: data.content,
    categoryId: data.categoryId,
    images: data.images,
    ...(data.relatedGoalId ? { relatedGoalId: data.relatedGoalId } : {}),
    learnedAt: data.learnedAt.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

export async function getLearningEntries(): Promise<LearningEntry[]> {
  const userId = getCurrentUserId();
  const entryQuery = query(
    collection(db, "users", userId, "learningEntries"),
    orderBy("learnedAt", "desc"),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(entryQuery);

  return snapshot.docs.map((document) =>
    toLearningEntry(document.id, document.data()),
  );
}

export async function getLearningEntry(
  entryId: string,
): Promise<LearningEntry | null> {
  const userId = getCurrentUserId();
  const snapshot = await getDoc(
    doc(db, "users", userId, "learningEntries", entryId),
  );

  return snapshot.exists()
    ? toLearningEntry(snapshot.id, snapshot.data())
    : null;
}
