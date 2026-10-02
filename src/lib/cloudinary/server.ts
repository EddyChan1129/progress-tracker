import "server-only";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

export function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are missing.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
}

export async function uploadLearningImage(userId: string, bytes: Buffer) {
  // UID 編碼成安全路徑片段，唔接受 client 自訂 publicId／其他人嘅路徑。
  const owner = Buffer.from(userId).toString("base64url");
  const publicId = `learning/${owner}/${randomUUID()}`;
  // SDK 喺 server 用 secret 簽名，browser 唔會收到可換檔案嘅上傳簽名。
  const result = await getCloudinary().uploader.upload(
    `data:application/octet-stream;base64,${bytes.toString("base64")}`,
    {
      public_id: publicId,
      resource_type: "image",
      type: "upload",
      allowed_formats: ["jpg", "png", "webp"],
      overwrite: false,
      timeout: 30_000,
    },
  );

  // 回傳白名單資料，唔將 SDK config／secret 傳畀 client。
  return { publicId: result.public_id, url: result.secure_url };
}
