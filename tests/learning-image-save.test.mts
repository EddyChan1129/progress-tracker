import assert from "node:assert/strict";
import { after, it, mock } from "node:test";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { deleteApp, getApps } from "firebase-admin/app";

import { POST } from "../src/app/api/learning-entries/route.ts";
import { getAdminAuth, getAdminDb } from "../src/lib/firebase/admin.ts";

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Use the Firestore emulator.");
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-progress-tracker";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";
after(async () => {
  mock.restoreAll();
  await Promise.all(getApps().map(deleteApp));
});

it("saves verified images once, rejects forged assets and preserves existing entries", async () => {
  assert.equal((await POST(new Request("http://localhost/api/learning-entries", { method: "POST" }))).status, 401);
  mock.method(getAdminAuth(), "verifyIdToken", async () => ({ uid: "alice" }));
  const resource = mock.method(cloudinary.api, "resource", async (publicId: string) => ({
    public_id: publicId, resource_type: "image", type: "upload", format: "png", bytes: 100,
    secure_url: `https://res.cloudinary.com/test-cloud/image/upload/${publicId}.png`,
  }));
  const db = getAdminDb();
  const categoryId = randomUUID();
  await db.doc(`users/alice/categories/${categoryId}`).set({ userId: "alice", name: "Code" });
  const body = {
    entryId: randomUUID(),
    input: { title: "Two Sum", content: "Notes", categoryId, learnedAt: "2026-10-02" },
    timezoneOffset: -480,
    publicIds: [`learning/YWxpY2U/${randomUUID()}`, `learning/YWxpY2U/${randomUUID()}`],
  };
  const send = (data: unknown) => POST(new Request("http://localhost/api/learning-entries", {
    method: "POST", headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
  assert.equal((await send({ ...body, publicIds: Array(6).fill(body.publicIds[0]) })).status, 400);
  assert.equal((await send({ ...body, publicIds: [body.publicIds[0], body.publicIds[0]] })).status, 400);
  assert.equal((await send({ ...body, userId: "bob" })).status, 400);
  assert.equal((await send({ ...body, images: [{ url: "https://evil.example" }] })).status, 400);
  assert.equal((await send({ ...body, publicIds: [`learning/Ym9i/${randomUUID()}`] })).status, 502);
  assert.equal(resource.mock.callCount(), 0);
  assert.equal((await send({ ...body, input: { ...body.input, categoryId: "missing" } })).status, 400);
  const response = await send(body);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: body.entryId });
  const ref = db.doc(`users/alice/learningEntries/${body.entryId}`);
  const first = (await ref.get()).data()!;
  assert.equal(first.images.length, 2);
  assert.equal(first.userId, "alice");
  assert.equal(first.learnedAt.toDate().toISOString(), "2026-10-01T16:00:00.000Z");
  assert.equal((await send(body)).status, 200);
  assert.ok((await ref.get()).data()!.createdAt.isEqual(first.createdAt));
  assert.equal((await send({ ...body, input: { ...body.input, title: "Overwrite" } })).status, 409);
  assert.equal((await ref.get()).data()!.title, "Two Sum");
});
