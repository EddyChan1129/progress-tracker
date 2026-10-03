import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "../firebase/admin.ts";
import { getCloudinary, imageReference } from "./server.ts";

export async function cleanLearningImages(userId: string, publicIds: string[] = []) {
  const db = getAdminDb();
  const assets = db.collection("users").doc(userId).collection("imageAssets");
  // Cancel 只排程呢次已完成嘅上傳；保留仍在上傳中嘅資產，避免競態。
  for (const id of publicIds) {
    const ref = imageReference(userId, id);
    await db.runTransaction(async (transaction) => {
      const asset = await transaction.get(ref);
      if (asset.exists && asset.data()!.state !== "uploading" && asset.data()!.state !== "deleted") {
        transaction.update(ref, { cleanupAfter: Timestamp.now() });
      }
    });
  }
  // ponytail: 每次最多清 20 張；冇排程器，過期孤立圖喺下次開列表／重試先清理。
  const pending = await assets.where("cleanupAfter", "<=", Timestamp.now()).limit(20).get();
  let failed = false;
  for (const asset of pending.docs) {
    const id = asset.data().publicId as string;
    try {
      const ref = imageReference(userId, id);
      const canDelete = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        if (!current.exists || current.data()!.state === "deleted") return false;
        // 同一 registry doc 亦由儲存 API 讀寫；transaction 防止清理途中再掛入記錄。
        // ponytail: 每張掃本人記錄，個人 tracker 足夠；資料量大時改用引用索引。
        const entries = await transaction.get(db.collection("users").doc(userId).collection("learningEntries"));
        const referenced = entries.docs.some((entry) => (entry.data().images ?? [])
          .some((image: { publicId: string }) => image.publicId === id));
        if (referenced) {
          transaction.update(ref, { state: "active", cleanupAfter: null });
          return false;
        }
        const when = current.data()!.cleanupAfter;
        if (!when || when.toMillis() > Date.now()) return false;
        transaction.update(ref, { state: "deleting" });
        return true;
      });
      if (!canDelete) continue;
      const options = { resource_type: "image" as const, type: "upload" as const, invalidate: true, timeout: 30_000 };
      const result = await getCloudinary().uploader.destroy(id, options);
      if (result.result !== "ok" && result.result !== "not found") throw new Error("Deletion failed");
      // 保留 tombstone，先前已驗證但延遲嘅儲存 request 亦唔可以再掛入已刪圖片。
      await ref.update({ state: "deleted", cleanupAfter: null });
    } catch {
      failed = true;
    }
  }
  const remaining = await assets.where("cleanupAfter", "<=", Timestamp.now()).limit(1).get();
  return { cleanupPending: failed || !remaining.empty };
}
