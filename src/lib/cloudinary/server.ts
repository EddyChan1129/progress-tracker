import "server-only";

import { MAX_LEARNING_IMAGE_BYTES } from "../../features/learning/images.ts";

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

export function learningImageFolder(title: string, startedAt: string) {
  // 清走斜線及 Cloudinary folder 唔接受嘅字元，標題只會成為一層資料夾。
  const name = title.replace(/[^\p{L}\p{N} _-]/gu, "_").trim().slice(0, 80) || "learning";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(startedAt));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const time = ["year", "month", "day", "hour", "minute", "second"].map((key) => values[key]).join("");
  return `progress-tracker/${name}${time}`;
}

export async function uploadLearningImage(userId: string, bytes: Buffer, title: string, startedAt: string) {
  // UID 編碼成安全路徑片段，唔接受 client 自訂 publicId／其他人嘅路徑。
  const owner = Buffer.from(userId).toString("base64url");
  const publicId = `learning/${owner}/${randomUUID()}`;
  // SDK 喺 server 用 secret 簽名，browser 唔會收到可換檔案嘅上傳簽名。
  const result = await getCloudinary().uploader.upload(
    `data:application/octet-stream;base64,${bytes.toString("base64")}`,
    {
      public_id: publicId,
      // Dynamic folder 只整理 Media Library；publicId 保留 UID 驗證同穩定 URL。
      asset_folder: learningImageFolder(title, startedAt),
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

// 只接受本人由上傳 API 建立嘅資產 ID；URL／格式／大小重新向 Cloudinary 查證。
export async function verifyLearningImages(userId: string, publicIds: string[]) {
  const prefix = `learning/${Buffer.from(userId).toString("base64url")}/`;
  if (publicIds.some((id) => !id.startsWith(prefix) || !/^[\da-f-]{36}$/.test(id.slice(prefix.length)))) {
    throw new Error("圖片唔屬於目前帳戶。");
  }
  return Promise.all(publicIds.map(async (publicId) => {
    const asset = await getCloudinary().api.resource(publicId, { resource_type: "image", type: "upload" });
    if (asset.public_id !== publicId || asset.resource_type !== "image" || asset.type !== "upload"
      || !["jpg", "png", "webp"].includes(asset.format)
      || !(asset.bytes > 0 && asset.bytes <= MAX_LEARNING_IMAGE_BYTES)
      || typeof asset.secure_url !== "string" || !asset.secure_url.startsWith("https://res.cloudinary.com/")) {
      throw new Error("圖片格式或大小不符合限制。");
    }
    return { publicId, url: asset.secure_url as string };
  }));
}
