import { z } from "zod";

import { getVerifiedUserId } from "../../../lib/firebase/admin.ts";
import { deleteOwnedGoal } from "../../../lib/firebase/goal-deletion.ts";

export const runtime = "nodejs";

const goalIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

export async function DELETE(request: Request) {
  const userId = await getVerifiedUserId(request);
  if (!userId) return Response.json({ error: "請先登入。" }, { status: 401 });

  const parsed = z.object({ goalId: goalIdSchema, subGoalId: goalIdSchema.optional() }).strict().safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return Response.json({ error: "目標資料不正確。" }, { status: 400 });

  try {
    await deleteOwnedGoal(userId, parsed.data.goalId, parsed.data.subGoalId);
    return Response.json({ id: parsed.data.goalId });
  } catch (error) {
    if (error instanceof Error && error.message === "missing") {
      return Response.json({ error: "搵唔到呢個目標，或者佢唔屬於你。" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "parentDeleting") {
      return Response.json({ error: "大目標正在刪除，請重試刪除大目標。" }, { status: 409 });
    }
    return Response.json({ error: "刪除未完成，請重試刪除。" }, { status: 502 });
  }
}
