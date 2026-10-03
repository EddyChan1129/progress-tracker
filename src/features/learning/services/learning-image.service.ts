import { auth } from "@/lib/firebase/client";
import { learningEntrySchema, type LearningEntryInput } from "@/features/learning/schemas/learning.schema";
import { validateLearningImages } from "@/features/learning/images";

// 同一次新增保留 ID 同已完成上傳，按「再試」時唔重複上傳成功嘅檔案。
export interface ImageSaveAttempt {
  id: string;
  userId: string;
  uploads: Map<File, string>;
}

export async function createLearningEntryWithImages(
  input: LearningEntryInput,
  files: File[],
  attempt: ImageSaveAttempt,
) {
  const user = auth.currentUser;
  if (!user || user.uid !== attempt.userId) throw new Error("登入帳戶已改變，請重新開啟表單。");
  const parsed = learningEntrySchema.parse(input);
  const error = validateLearningImages(files, 0);
  if (error) throw new Error(error);
  const token = await user.getIdToken();

  for (const file of files) {
    if (attempt.uploads.has(file)) continue;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/learning-images/upload", {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "圖片上傳失敗，請再試。");
    attempt.uploads.set(file, result.publicId);
  }

  const response = await fetch("/api/learning-entries", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      entryId: attempt.id, input,
      timezoneOffset: parsed.learnedAt.getTimezoneOffset(),
      publicIds: files.map((file) => attempt.uploads.get(file)),
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "儲存失敗，請再試。");
  return result.id as string;
}
