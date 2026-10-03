import { z } from "zod";
import { getVerifiedUserId } from "../../../../lib/firebase/admin.ts";
import { uploadLearningImage } from "../../../../lib/cloudinary/server.ts";
import {
  MAX_LEARNING_IMAGE_BYTES,
  validateLearningImages,
} from "../../../../features/learning/images.ts";

export const runtime = "nodejs";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return error("請先登入。", 401);

  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    return error("請使用圖片表單上傳。", 400);
  }

  // 讀取時亦設上限，唔信可被偽造／省略嘅 Content-Length。
  // 64 KiB 留畀 multipart headers；檔案本身仍限制 4 MiB。
  const reader = request.body?.getReader();
  if (!reader) return error("未收到圖片。", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_LEARNING_IMAGE_BYTES + 64 * 1024) {
        await reader.cancel();
        return error("每張圖片最多 4 MiB。", 413);
      }
      chunks.push(value);
    }
  } catch {
    return error("未能讀取圖片。", 400);
  }

  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    return error("圖片表單格式不正確。", 400);
  }

  // 一次只接收一張；身份、路徑、Cloudinary options 全部由 server 決定。
  const fields = [...form.keys()];
  const file = form.get("file");
  const metadata = z.object({
    title: z.string().trim().min(1).max(100),
    startedAt: z.iso.datetime(),
    entryId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).optional(),
  }).safeParse({ title: form.get("title"), startedAt: form.get("startedAt"), entryId: form.get("entryId") ?? undefined });
  if ((fields.length !== 3 && fields.length !== 4) || new Set(fields).size !== fields.length
    || fields.some((key) => !["file", "title", "startedAt", "entryId"].includes(key))
    || !(file instanceof File) || !metadata.success) {
    return error("只接受一張圖片，唔接受自訂身份或路徑。", 400);
  }
  const message = validateLearningImages([file], 0);
  if (message) return error(message, file.size > MAX_LEARNING_IMAGE_BYTES ? 413 : 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  // MIME 可以被偽造，所以同時檢查檔案頭；Cloudinary 再驗證及解碼圖片。
  const isJpeg = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = bytes.subarray(0, 4).toString() === "RIFF"
    && bytes.subarray(8, 12).toString() === "WEBP";
  const matchesType = (file.type === "image/jpeg" && isJpeg)
    || (file.type === "image/png" && isPng)
    || (file.type === "image/webp" && isWebp);
  if (!matchesType) return error("檔案內容唔符合圖片格式。", 400);

  try {
    const image = await uploadLearningImage(userId, bytes, metadata.data.title, metadata.data.startedAt, metadata.data.entryId);
    return Response.json(image, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return error("圖片上傳失敗，請再試一次。", 502);
  }
}
