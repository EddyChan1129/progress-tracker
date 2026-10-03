import { z } from "zod";
import { getVerifiedUserId } from "../../../../lib/firebase/admin.ts";
import { assertOwnedImage } from "../../../../lib/cloudinary/server.ts";
import { cleanLearningImages } from "../../../../lib/cloudinary/cleanup.ts";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: "請先登入。" }, { status: 401 });
  const parsed = z.object({ publicIds: z.array(z.string().max(300)).max(5).default([]) })
    .strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "清理資料不正確。" }, { status: 400 });
  try {
    parsed.data.publicIds.forEach((id) => assertOwnedImage(userId, id));
  } catch {
    return Response.json({ error: "無權清理其他人嘅圖片。" }, { status: 403 });
  }
  try {
    return Response.json(await cleanLearningImages(userId, parsed.data.publicIds), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "圖片清理未完成，請再試。" }, { status: 502 });
  }
}
