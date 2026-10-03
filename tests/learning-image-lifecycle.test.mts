import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, it, mock } from "node:test";
import { v2 as cloudinary } from "cloudinary";
import { deleteApp, getApps } from "firebase-admin/app";
import { Timestamp } from "firebase-admin/firestore";
import { POST, PATCH, DELETE } from "../src/app/api/learning-entries/route.ts";
import { POST as cleanup } from "../src/app/api/learning-images/cleanup/route.ts";
import { getAdminAuth, getAdminDb } from "../src/lib/firebase/admin.ts";
import { imageReference } from "../src/lib/cloudinary/server.ts";

// 真正本機 Firestore transaction；Cloudinary 同 token verifier 用 mock，唔碰正式資料。
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Use the Firestore emulator.");
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-progress-tracker";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";
after(async () => { mock.restoreAll(); await Promise.all(getApps().map(deleteApp)); });

it("edits, cancels and deletes safely, retaining cleanup progress across failures", async () => {
  let uid = "lifecycle-alice";
  mock.method(getAdminAuth(), "verifyIdToken", async () => ({ uid }));
  const owner = uid;
  const db = getAdminDb();
  const destroyed: string[] = [];
  const missing = new Set<string>();
  let destroyFails = false;
  mock.method(cloudinary.api, "resource", async (id: string) => {
    if (missing.has(id)) throw new Error("Asset removed externally");
    return { public_id: id, resource_type: "image", type: "upload", format: "png", bytes: 100,
    secure_url: `https://res.cloudinary.com/test-cloud/image/upload/${id}.png`,
    };
  });
  mock.method(cloudinary.uploader, "destroy", async (id: string, options: { invalidate?: boolean }) => {
    assert.equal(options.invalidate, true);
    if (destroyFails) throw new Error("Simulated Cloudinary outage");
    destroyed.push(id);
    return { result: "not found" }; // 已喺 Console 刪除嘅圖片亦算清理成功。
  });
  const request = (body: unknown, method = "POST") => new Request("http://localhost/api/test", {
    method, headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const asset = async (when: Timestamp | null = null) => {
    const id = `learning/${Buffer.from(owner).toString("base64url")}/${randomUUID()}`;
    await imageReference(owner, id).set({ publicId: id, state: "active", cleanupAfter: when });
    return id;
  };
  const categoryId = randomUUID();
  await db.doc(`users/${owner}/categories/${categoryId}`).set({ userId: owner, name: "Code" });
  const first = await asset();
  const second = await asset();
  const added = await asset();
  const body = { entryId: randomUUID(), input: { title: "Notes", content: "Code", categoryId, learnedAt: "2026-10-03" }, timezoneOffset: -480, publicIds: [first, second] };
  assert.equal((await POST(request(body))).status, 200);
  const ref = db.doc(`users/${owner}/learningEntries/${body.entryId}`);
  const original = (await ref.get()).data()!;

  // 取消只清未掛入記錄嘅新圖；即使 caller 傳入舊圖，server 亦會檢查引用。
  const cancelled = await asset();
  assert.equal((await cleanup(request({ publicIds: [cancelled, first] }))).status, 200);
  assert.deepEqual(destroyed, [cancelled]);
  assert.deepEqual((await ref.get()).data()!.images, original.images);

  const edit = { ...body, input: { ...body.input, title: "Edited" }, publicIds: [second, added], operationId: randomUUID(), expectedUpdatedAt: Math.floor(original.updatedAt.toMillis()) };
  missing.add(second); // 保留已失效舊圖，仍可編輯並新增其他圖片。
  destroyFails = true;
  const response = await PATCH(request(edit, "PATCH"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).cleanupPending, true);
  const edited = (await ref.get()).data()!;
  assert.deepEqual(edited.images.map((image: { publicId: string }) => image.publicId), [second, added]);
  assert.ok(edited.createdAt.isEqual(original.createdAt));
  assert.equal(edited.userId, owner);
  assert.equal((await imageReference(owner, first).get()).data()!.state, "deleting");
  // 同一 operation 重試唔再寫入，亦唔更新 timestamp。
  assert.equal((await PATCH(request(edit, "PATCH"))).status, 200);
  assert.ok((await ref.get()).data()!.updatedAt.isEqual(edited.updatedAt));
  assert.equal((await PATCH(request({ ...edit, operationId: randomUUID() }, "PATCH"))).status, 409);
  assert.equal((await PATCH(request({ ...edit, input: { ...edit.input, title: "Tampered" } }, "PATCH"))).status, 409);

  destroyFails = false;
  assert.equal((await (await cleanup(request({}))).json()).cleanupPending, false);
  assert.ok(destroyed.includes(first));
  assert.ok(!destroyed.includes(second));
  assert.equal((await imageReference(owner, first).get()).data()!.state, "deleted");
  // 已清理資產唔可被延遲 request 再掛入其他記錄。
  assert.equal((await POST(request({ ...body, entryId: randomUUID(), publicIds: [first] }))).status, 409);

  // 另一帳戶不能清 alice 嘅圖，亦不能藉 entryId 刪 alice 嘅記錄。
  uid = "lifecycle-bob";
  assert.equal((await cleanup(request({ publicIds: [second] }))).status, 403);
  assert.equal((await DELETE(request({ entryId: body.entryId }, "DELETE"))).status, 200);
  assert.ok((await ref.get()).exists);
  uid = owner;

  // Firestore 寫入失敗時，原本圖同記錄保留，唔會先清 Cloudinary。
  const transaction = mock.method(db, "runTransaction", async () => { throw new Error("Simulated database outage"); });
  const deletedCount = destroyed.length;
  assert.equal((await DELETE(request({ entryId: body.entryId }, "DELETE"))).status, 502);
  assert.ok((await ref.get()).exists);
  assert.equal(destroyed.length, deletedCount);
  transaction.mock.restore();

  // 即使清圖失敗，刪記錄已成功；待清理狀態存在 server，之後可重試。
  destroyFails = true;
  const deleted = await DELETE(request({ entryId: body.entryId }, "DELETE"));
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).cleanupPending, true);
  assert.equal((await ref.get()).exists, false);
  destroyFails = false;
  assert.equal((await DELETE(request({ entryId: body.entryId }, "DELETE"))).status, 200);
  assert.ok(destroyed.includes(second) && destroyed.includes(added));
  missing.clear();
  // 刪除後重試舊 create request 唔會復活記錄。
  assert.equal((await POST(request(body))).status, 409);

  // 同一資產亦被其他有效記錄引用時，刪一筆唔可以刪掉共用圖片。
  const shared = await asset();
  const one = { ...body, entryId: randomUUID(), publicIds: [shared] };
  const two = { ...one, entryId: randomUUID() };
  assert.equal((await POST(request(one))).status, 200);
  assert.equal((await POST(request(two))).status, 200);
  await DELETE(request({ entryId: one.entryId }, "DELETE"));
  assert.ok(!destroyed.includes(shared));
  await DELETE(request({ entryId: two.entryId }, "DELETE"));
  assert.ok(destroyed.includes(shared));

  // 遺失 upload response 嘅資產，24 小時後下次清理會處理；未過期先保留。
  const expired = await asset(Timestamp.fromMillis(Date.now() - 1000));
  const fresh = await asset(Timestamp.fromMillis(Date.now() + 86_400_000));
  await cleanup(request({}));
  assert.ok(destroyed.includes(expired));
  assert.ok(!destroyed.includes(fresh));
});
