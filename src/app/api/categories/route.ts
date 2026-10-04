import { z } from "zod";
import { getAdminDb, getVerifiedUserId } from "../../../lib/firebase/admin.ts";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: "請先登入。" }, { status: 401 });
  const parsed = z.object({ categoryId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/) }).strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "分類不正確。" }, { status: 400 });
  try {
    const db = getAdminDb();
    const owner = db.collection("users").doc(userId);
    const category = owner.collection("categories").doc(parsed.data.categoryId);
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(category);
      if (!current.exists) return;
      if (current.data()?.userId !== userId) throw new Error("missing");
      const [entries, goals] = await Promise.all([
        transaction.get(owner.collection("learningEntries").where("categoryId", "==", category.id).limit(1)),
        transaction.get(owner.collection("goals").where("categoryId", "==", category.id).limit(1)),
      ]);
      if (!entries.empty || !goals.empty) throw new Error("inUse");
      transaction.delete(category);
    });
    return Response.json({ id: category.id });
  } catch (error) {
    if (error instanceof Error && error.message === "missing") return Response.json({ error: "搵唔到本人嘅分類。" }, { status: 404 });
    if (error instanceof Error && error.message === "inUse") return Response.json({
      error: "呢個分類仍有學習記錄或目標使用，請先將佢哋轉到其他分類。",
    }, { status: 409 });
    return Response.json({ error: "刪除分類失敗，請重試。" }, { status: 502 });
  }
}
