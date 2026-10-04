import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GoalList } from "@/features/goals/components/goal-list";
import { PageHeader } from "@/components/layout/page-header";
import { Plus } from "lucide-react";

export default function GoalsPage() {
  return (
    <section>
      <PageHeader title="目標" description="定好大方向，再拆成可以逐步完成嘅細目標。" action={<Button asChild><Link href="/goals/new"><Plus aria-hidden size={17} />新增大目標</Link></Button>} />
      <GoalList />
    </section>
  );
}
