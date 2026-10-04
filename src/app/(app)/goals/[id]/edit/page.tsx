import { GoalForm } from "@/features/goals/components/goal-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <PageHeader title="編輯目標" description="一齊修改大目標同細目標，完成後一次儲存。" />
      <GoalForm key={id} goalId={id} />
    </section>
  );
}
