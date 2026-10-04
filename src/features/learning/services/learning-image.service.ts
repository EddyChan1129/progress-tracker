import { auth } from "@/lib/firebase/client";
import { learningEntrySchema, type LearningEntryInput } from "@/features/learning/schemas/learning.schema";
import { validateLearningImages } from "@/features/learning/images";

// 同一次新增保留 ID 同已完成上傳，按「再試」時唔重複上傳成功嘅檔案。
export interface ImageSaveAttempt {
  id: string;
  userId: string;
  uploads: Map<File, string>;
  startedAt?: string;
  operationId?: string;
  expectedUpdatedAt?: number;
}

export async function saveLearningEntryWithImages(
  input: LearningEntryInput,
  files: File[],
  attempt: ImageSaveAttempt,
  keptImages: { publicId: string }[] = [],
) {
  const user = auth.currentUser;
  if (!user || user.uid !== attempt.userId) throw new Error("登入帳戶已改變，請重新開啟表單。");
  const parsed = learningEntrySchema.parse(input);
  const error = validateLearningImages(files, keptImages.length);
  if (error) throw new Error(error);
  const token = await user.getIdToken();
  attempt.startedAt ??= new Date().toISOString();

  for (const file of files) {
    if (attempt.uploads.has(file)) continue;
    const form = new FormData();
    form.append("file", file);
    form.append("title", parsed.title);
    form.append("startedAt", attempt.startedAt);
    if (attempt.operationId) form.append("entryId", attempt.id);
    const response = await fetch("/api/learning-images/upload", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error ?? "圖片上傳失敗，請再試。"), { status: response.status });
    attempt.uploads.set(file, result.publicId);
  }

  const response = await fetch("/api/learning-entries", {
    method: attempt.operationId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      entryId: attempt.id, input,
      timezoneOffset: parsed.learnedAt.getTimezoneOffset(),
      publicIds: [...keptImages.map((image) => image.publicId), ...files.map((file) => attempt.uploads.get(file))],
      ...(attempt.operationId ? { operationId: attempt.operationId, expectedUpdatedAt: attempt.expectedUpdatedAt } : {}),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error ?? "儲存失敗，請再試。"), { status: response.status });
  return result as { id: string; cleanupPending: boolean };
}

// Token 由 Firebase 提供；server 會再驗證，唔接受 caller 自己傳入 UID。
export async function learningMediaRequest(path: string, method: string, body: unknown) {
  const user = auth.currentUser;
  if (!user) throw new Error("請先登入。");
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "操作失敗，請再試。");
  return result as { cleanupPending: boolean };
}

export function cleanupLearningImages(publicIds: string[] = []) {
  return learningMediaRequest("/api/learning-images/cleanup", "POST", { publicIds });
}
