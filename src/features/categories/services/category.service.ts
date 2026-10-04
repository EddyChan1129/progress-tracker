import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import {
  categorySchema,
  type CategoryInput,
} from "@/features/categories/schemas/category.schema";
import type { Category } from "@/features/categories/types/category.types";
import { getCurrentUserId } from "@/features/auth/services/auth.service";
import { db } from "@/lib/firebase/client";
import { deleteResource } from "@/lib/delete-request";

export async function deleteCategory(categoryId: string) {
  await deleteResource("/api/categories", { categoryId });
}

export async function createCategory(input: CategoryInput) {
  const userId = getCurrentUserId();
  const { name, icon } = categorySchema.parse(input);
  const categoryReference = await addDoc(
    collection(db, "users", userId, "categories"),
    {
      userId,
      name,
      ...(icon ? { icon } : {}),
      createdAt: serverTimestamp(),
    },
  );

  return categoryReference.id;
}

export async function getCategories(): Promise<Category[]> {
  const userId = getCurrentUserId();
  const categoryQuery = query(
    collection(db, "users", userId, "categories"),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(categoryQuery);

  return snapshot.docs.map((document) => {
    const data = document.data();

    if (!(data.createdAt instanceof Timestamp)) {
      throw new Error("分類建立時間格式不正確。");
    }

    return {
      id: document.id,
      userId: data.userId,
      name: data.name,
      ...(data.icon ? { icon: data.icon } : {}),
      createdAt: data.createdAt.toDate(),
    };
  });
}
