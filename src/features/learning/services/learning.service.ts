import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { getCurrentUserId } from "@/features/auth/services/auth.service";
import {
  learningEntrySchema,
  type LearningEntryInput,
} from "@/features/learning/schemas/learning.schema";
import type { LearningEntry } from "@/features/learning/types/learning.types";
import { db } from "@/lib/firebase/client";

export async function deleteLearningEntry(entryId: string) {
  const userId = getCurrentUserId();

  await deleteDoc(doc(db, "users", userId, "learningEntries", entryId));
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

export async function createLearningEntry(input: LearningEntryInput) {
  const userId = getCurrentUserId();
  const { title, content, categoryId, learnedAt } =
    learningEntrySchema.parse(input);
  const entryReference = await addDoc(
    collection(db, "users", userId, "learningEntries"),
    {
      userId,
      title,
      content,
      categoryId,
      images: [],
      learnedAt: Timestamp.fromDate(learnedAt),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  return entryReference.id;
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

export async function updateLearningEntry(
  entryId: string,
  input: LearningEntryInput,
) {
  const userId = getCurrentUserId();
  const { title, content, categoryId, learnedAt } =
    learningEntrySchema.parse(input);

  await updateDoc(doc(db, "users", userId, "learningEntries", entryId), {
    title,
    content,
    categoryId,
    learnedAt: Timestamp.fromDate(learnedAt),
    updatedAt: serverTimestamp(),
  });
}
