import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb, getVerifiedUserId } from "../../../lib/firebase/admin.ts";
import { verifyLearningImages } from "../../../lib/cloudinary/server.ts";
import { learningEntrySchema } from "../../../features/learning/schemas/learning.schema.ts";

export const runtime = "nodejs";

const requestSchema = z.object({
  entryId: z.uuid(),
  input: learningEntrySchema.strict(),
  // Browser 時區與 server 可能唔同，保留使用者所選日期嘅本地午夜。
  timezoneOffset: z.number().int().min(-840).max(840),
  publicIds: z.array(z.string().max(300)).min(1).max(5)
    .refine((ids) => new Set(ids).size === ids.length),
}).strict();

export async function POST(request: Request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: "請先登入。" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "記錄或圖片資料不正確。" }, { status: 400 });
  const { entryId, input, publicIds, timezoneOffset } = parsed.data;
  // categoryId 必須係單一 document ID，唔可以用斜線指定其他路徑。
  if (input.categoryId.includes("/") || input.categoryId === "." || input.categoryId === "..") {
    return Response.json({ error: "分類不正確。" }, { status: 400 });
  }
  const date = input.learnedAt;
  const midnight = new Date(0);
  midnight.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  const learnedAt = Timestamp.fromMillis(midnight.getTime() + timezoneOffset * 60_000);

  try {
    const images = await verifyLearningImages(userId, publicIds);
    const db = getAdminDb();
    const entry = db.collection("users").doc(userId).collection("learningEntries").doc(entryId);
    const category = db.collection("users").doc(userId).collection("categories").doc(input.categoryId);
    // Admin SDK 繞過 Rules，所以呢度必須自己驗證分類擁有權同欄位。
    const result = await db.runTransaction(async (transaction) => {
      const [existing, categorySnapshot] = await transaction.getAll(entry, category);
      if (!categorySnapshot.exists || categorySnapshot.data()?.userId !== userId) return "category";
      if (existing.exists) {
        const data = existing.data()!;
        // 同一個 entryId 重試唔會新增第二筆，亦唔會覆寫已存在記錄。
        return data.userId === userId && data.title === input.title && data.content === input.content
          && data.categoryId === input.categoryId && data.learnedAt.isEqual(learnedAt)
          && Array.isArray(data.images) && data.images.length === images.length
          && images.every((image, index) => data.images[index].publicId === image.publicId && data.images[index].url === image.url) ? "saved" : "conflict";
      }
      transaction.create(entry, {
        userId, title: input.title, content: input.content, categoryId: input.categoryId,
        learnedAt, images, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return "saved";
    });
    if (result === "category") return Response.json({ error: "搵唔到本人嘅分類。" }, { status: 400 });
    if (result === "conflict") return Response.json({ error: "呢筆記錄已儲存過，請返回列表確認。" }, { status: 409 });
    return Response.json({ id: entryId }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "未能驗證圖片或儲存記錄，請保留表單再試。" }, { status: 502 });
  }
}
