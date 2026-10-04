import { createHash } from "node:crypto";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb, getVerifiedUserId } from "../../../lib/firebase/admin.ts";
import { assertOwnedImage, imageReference, verifyLearningImages } from "../../../lib/cloudinary/server.ts";
import { cleanLearningImages } from "../../../lib/cloudinary/cleanup.ts";
import { learningEntrySchema } from "../../../features/learning/schemas/learning.schema.ts";
import type { LearningImage } from "../../../features/learning/types/learning.types.ts";

export const runtime = "nodejs";
const entryIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const requestSchema = z.object({
  entryId: entryIdSchema,
  input: learningEntrySchema.strict(),
  timezoneOffset: z.number().int().min(-840).max(840),
  publicIds: z.array(z.string().max(300)).max(5)
    .refine((ids) => new Set(ids).size === ids.length),
  operationId: z.uuid().optional(),
  expectedUpdatedAt: z.number().finite().optional(),
}).strict();

async function cleanupResult(userId: string) {
  try { return await cleanLearningImages(userId); }
  catch { return { cleanupPending: true }; }
}

async function save(request: Request, editing: boolean) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: "請先登入。" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "記錄或圖片資料不正確。" }, { status: 400 });
  const { entryId, input, publicIds, timezoneOffset, operationId, expectedUpdatedAt } = parsed.data;
  if (editing ? !operationId || expectedUpdatedAt === undefined : !z.uuid().safeParse(entryId).success) {
    return Response.json({ error: "記錄版本資料不正確。" }, { status: 400 });
  }
  if (input.categoryId.includes("/") || [".", ".."].includes(input.categoryId)) {
    return Response.json({ error: "分類不正確。" }, { status: 400 });
  }
  try { publicIds.forEach((id) => assertOwnedImage(userId, id)); }
  catch { return Response.json({ error: "圖片唔屬於目前帳戶。" }, { status: 403 }); }

  const date = input.learnedAt;
  const midnight = new Date(0);
  midnight.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  const learnedAt = Timestamp.fromMillis(midnight.getTime() + timezoneOffset * 60_000);
  try {
    const db = getAdminDb();
    const owner = db.collection("users").doc(userId);
    const entry = owner.collection("learningEntries").doc(entryId);
    const category = owner.collection("categories").doc(input.categoryId);
    const relatedGoal = input.relatedGoalId ? owner.collection("goals").doc(input.relatedGoalId) : null;
    const receipt = owner.collection("mediaOperations").doc(operationId ?? `create-${entryId}`);
    const deletion = owner.collection("mediaOperations").doc(`delete-${entryId}`);
    const before = await entry.get();
    const existingImages: LearningImage[] = before.data()?.images ?? [];
    // 保留舊圖毋須再向 Cloudinary 讀取，所以外部刪圖後仍可編輯文字或移除破圖。
    const newImages = await verifyLearningImages(userId, publicIds.filter((id) => !existingImages.some((image) => image.publicId === id)));
    const images = publicIds.map((id) => [...existingImages, ...newImages].find((image) => image.publicId === id)!);
    const hash = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
    const ids = [...new Set([...existingImages.map((image) => image.publicId), ...publicIds])];
    const refs = ids.map((id) => imageReference(userId, id));

    const result = await db.runTransaction(async (transaction) => {
      const [current, categorySnapshot, previous, deleted, ...dependencies] = await transaction.getAll(entry, category, receipt, deletion, ...(relatedGoal ? [relatedGoal] : []), ...refs);
      const goalSnapshot = relatedGoal ? dependencies.shift() : undefined;
      const assets = dependencies;
      if (deleted.exists) return "conflict";
      if (previous.exists) return previous.data()!.hash === hash && current.exists ? "saved" : "conflict";
      if (!categorySnapshot.exists || categorySnapshot.data()?.userId !== userId) return "category";
      if (relatedGoal && (!goalSnapshot?.exists || goalSnapshot.data()?.userId !== userId || goalSnapshot.data()?.deleting)) return "goal";
      if (editing) {
        if (!current.exists || current.data()!.userId !== userId) return "missing";
        if (Math.floor(current.data()!.updatedAt.toMillis()) !== expectedUpdatedAt) return "conflict";
      } else if (current.exists) {
        const data = current.data()!;
        return data.userId === userId && data.title === input.title && data.content === input.content
          && data.categoryId === input.categoryId && data.relatedGoalId === input.relatedGoalId && data.learnedAt.isEqual(learnedAt)
          && Array.isArray(data.images) && data.images.length === images.length
          && images.every((image, i) => data.images[i].publicId === image.publicId && data.images[i].url === image.url) ? "saved" : "conflict";
      }
      if (assets.some((asset, i) => publicIds.includes(ids[i]) && ["deleting", "deleted", "uploading"].includes(asset.data()?.state))) return "conflict";
      // Admin SDK 繞過 Rules；只写目前登入 UID 路徑，自己驗證欄位／分類／版本。
      const data = { userId, title: input.title, content: input.content, categoryId: input.categoryId,
        learnedAt, images, updatedAt: FieldValue.serverTimestamp(),
        ...(input.relatedGoalId ? { relatedGoalId: input.relatedGoalId } : editing ? { relatedGoalId: FieldValue.delete() } : {}) };
      if (editing) transaction.update(entry, data);
      else transaction.create(entry, { ...data, createdAt: FieldValue.serverTimestamp() });
      transaction.create(receipt, { hash });
      refs.forEach((ref, i) => transaction.set(ref, {
        publicId: ids[i], state: "active", cleanupAfter: publicIds.includes(ids[i]) ? null : Timestamp.now(),
      }, { merge: true }));
      return "saved";
    });
    if (result === "category") return Response.json({ error: "搵唔到本人嘅分類。" }, { status: 400 });
    if (result === "goal") return Response.json({ error: "搵唔到本人嘅目標，請重新選擇。" }, { status: 400 });
    if (result === "missing") return Response.json({ error: "搵唔到呢筆記錄。" }, { status: 404 });
    if (result === "conflict") return Response.json({ error: "資料已改變或圖片正在清理，請返回列表重新開啟記錄。" }, { status: 409 });
    return Response.json({ id: entryId, ...await cleanupResult(userId) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "未能驗證圖片或儲存記錄，請保留表單再試。" }, { status: 502 });
  }
}

export async function POST(request: Request) { return save(request, false); }
export async function PATCH(request: Request) { return save(request, true); }

export async function DELETE(request: Request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: "請先登入。" }, { status: 401 });
  const parsed = z.object({ entryId: entryIdSchema }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "記錄資料不正確。" }, { status: 400 });
  try {
    const db = getAdminDb();
    const owner = db.collection("users").doc(userId);
    const entry = owner.collection("learningEntries").doc(parsed.data.entryId);
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(entry);
      if (!current.exists) return;
      if (current.data()!.userId !== userId) throw new Error("Wrong owner");
      const images: LearningImage[] = current.data()!.images ?? [];
      const refs = images.map((image) => imageReference(userId, image.publicId));
      // 先移除有效記錄，再排程清圖；部分清理失敗亦可獨立重試。
      transaction.delete(entry);
      transaction.set(owner.collection("mediaOperations").doc(`delete-${parsed.data.entryId}`), { deleted: true });
      refs.forEach((ref, i) => transaction.set(ref, {
        publicId: images[i].publicId, state: "active", cleanupAfter: Timestamp.now(),
      }, { merge: true }));
    });
    return Response.json({ id: parsed.data.entryId, ...await cleanupResult(userId) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "刪除記錄失敗，請再試。" }, { status: 502 });
  }
}
