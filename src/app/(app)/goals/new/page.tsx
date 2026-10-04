import { GoalForm } from "@/features/goals/components/goal-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewGoalPage() {
  return (
    <section>
      <PageHeader title="新增大目標" description="寫低你想達成嘅方向，可以同時加入細目標。" />
      <GoalForm />
    </section>
  );
}
