import { GoalForm } from "@/features/goals/components/goal-form";

export default function NewGoalPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">新增大目標</h1>
      <p className="mt-4 text-muted-foreground">寫低你想達成嘅方向，例如成為冷氣師傅或改善英文 speaking。</p>
      <GoalForm />
    </section>
  );
}
