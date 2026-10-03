import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GoalList } from "@/features/goals/components/goal-list";

export default function GoalsPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">目標</h1>
      <p className="mt-4 text-muted-foreground">建立大目標，整理你想達成嘅方向。</p>
      <Button asChild className="mt-6"><Link href="/goals/new">新增大目標</Link></Button>
      <GoalList />
    </section>
  );
}
