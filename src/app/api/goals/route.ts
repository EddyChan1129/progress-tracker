import { z } from "zod";

import { getAdminDb, getVerifiedUserId } from "../../../lib/firebase/admin.ts";

export const runtime = "nodejs";

const goalIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

export async function DELETE(request: Request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: "請先登入。" }, { status: 401 });

  const parsed = z.object({ goalId: goalIdSchema }).strict().safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return Response.json({ error: "目標資料不正確。" }, { status: 400 });

  try {
    const db = getAdminDb();
    const goal = db.collection("users").doc(userId).collection("goals").doc(parsed.data.goalId);
    const subGoals = goal.collection("subGoals");
    const relatedEntries = db.collection("users").doc(userId).collection("learningEntries")
      .where("relatedGoalId", "==", parsed.data.goalId);

    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(goal);
      if (!current.exists || current.data()?.userId !== userId) throw new Error("missing");
      const [children, entries] = await Promise.all([
        transaction.get(subGoals.limit(1)),
        transaction.get(relatedEntries.limit(1)),
      ]);
      if (!children.empty) throw new Error("subGoals");
      if (!entries.empty) throw new Error("learningEntries");
      transaction.delete(goal);
    });

    return Response.json({ id: parsed.data.goalId });
  } catch (error) {
    if (error instanceof Error && error.message === "missing") {
      return Response.json({ error: "搵唔到呢個目標，或者佢唔屬於你。" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "subGoals") {
      return Response.json({ error: "呢個目標仲有細目標，請先處理細目標。" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "learningEntries") {
      return Response.json({ error: "呢個目標仲有學習記錄關聯，請先移除關聯。" }, { status: 409 });
    }
    return Response.json({ error: "刪除目標失敗，請再試一次。" }, { status: 502 });
  }
}
