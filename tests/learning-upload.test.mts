import assert from "node:assert/strict";
import { after, it, mock } from "node:test";
import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

import { POST } from "../src/app/api/learning-images/upload/route.ts";
import { getAdminAuth } from "../src/lib/firebase/admin.ts";

// 全部用本機 dummy config；測試唔會上傳圖片或接觸正式 credentials。
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-progress-tracker";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";
after(() => mock.restoreAll());

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");

async function uploadRequest(bytes = png, type = "image/png", extra?: [string, string]) {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], "test.png", { type }));
  if (extra) form.append(...extra);
  const encoded = new Request("http://localhost/api/learning-images/upload", {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
    body: form,
  });
  return new Request(encoded.url, {
    method: "POST",
    headers: encoded.headers,
    body: await encoded.arrayBuffer(),
  });
}

it("rejects missing and forged tokens before processing files", async () => {
  const guest = new Request("http://localhost/api/learning-images/upload", { method: "POST" });
  assert.equal((await POST(guest)).status, 401);
  // 真正 Firebase Admin verifier 拒絕 malformed token，唔係假 verifier。
  assert.equal((await POST(await uploadRequest())).status, 401);
});

it("enforces identity, file limits and server-controlled upload options", async () => {
  // 模擬 Firebase 已驗證 alice；Cloudinary SDK mock 阻止真實上傳。
  mock.method(getAdminAuth(), "verifyIdToken", async () => ({ uid: "alice" }));
  const receivedOptions: UploadApiOptions[] = [];
  const upload = mock.method(cloudinary.uploader, "upload", async (_file: string, options: UploadApiOptions) => {
    receivedOptions.push(options);
    return { public_id: options.public_id, secure_url: "https://res.cloudinary.com/test-cloud/test.png" };
  });

  for (const field of ["userId", "publicId", "folder", "overwrite"]) {
    assert.equal((await POST(await uploadRequest(png, "image/png", [field, "bob"]))).status, 400);
  }
  assert.equal((await POST(await uploadRequest(Buffer.alloc(4 * 1024 * 1024 + 1)))).status, 413);
  assert.equal((await POST(await uploadRequest(Buffer.alloc(5 * 1024 * 1024)))).status, 413);
  assert.equal((await POST(await uploadRequest(png, "image/svg+xml"))).status, 400);
  assert.equal((await POST(await uploadRequest(Buffer.from("fake PNG")))).status, 400);
  assert.equal(upload.mock.callCount(), 0);

  const response = await POST(await uploadRequest());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json();
  assert.match(result.publicId, /^learning\/YWxpY2U\/[\da-f-]+$/);
  assert.deepEqual(Object.keys(result).sort(), ["publicId", "url"]);
  assert.equal(upload.mock.callCount(), 1);
  assert.equal(receivedOptions[0].overwrite, false);
  assert.equal(receivedOptions[0].resource_type, "image");
  assert.deepEqual(receivedOptions[0].allowed_formats, ["jpg", "png", "webp"]);
});
