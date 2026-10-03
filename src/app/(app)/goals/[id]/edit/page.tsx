import { GoalForm } from "@/features/goals/components/goal-form";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">編輯目標</h1>
      <p className="mt-4 text-muted-foreground">一齊修改大目標同細目標，完成後一次儲存。</p>
      <GoalForm key={id} goalId={id} />
    </section>
  );
}
