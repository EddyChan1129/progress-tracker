import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { getCurrentUserId } from "@/features/auth/services/auth.service";
import {
  learningEntrySchema,
  type LearningEntryInput,
} from "@/features/learning/schemas/learning.schema";
import { db } from "@/lib/firebase/client";

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
