import { GoalForm } from "@/features/goals/components/goal-form";

export default function NewGoalPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">新增大目標</h1>
      <p className="mt-4 text-muted-foreground">寫低你想達成嘅方向，可以同時加入細目標，一次過儲存。</p>
      <GoalForm />
    </section>
  );
}
