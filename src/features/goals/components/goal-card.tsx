import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/features/goals/types/goal.types";

const statusLabels = {
  not_started: "未開始", in_progress: "進行中", completed: "已完成", paused: "已暫停",
};
const dateFormatter = new Intl.DateTimeFormat("zh-HK", { year: "numeric", month: "long", day: "numeric" });

export function GoalCard({ goal, categoryName, showDetailLink = true }: {
  goal: Goal; categoryName: string; showDetailLink?: boolean;
}) {
  return (
    <article className="min-w-0 rounded-xl border bg-card p-5">
      <h2 className="break-words text-lg font-semibold">{goal.title}</h2>
      {goal.description ? <p className="mt-3 whitespace-pre-wrap break-words text-sm">{goal.description}</p> : null}
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex gap-2"><dt>分類</dt><dd className="text-foreground">{categoryName}</dd></div>
        <div className="flex gap-2"><dt>狀態</dt><dd className="text-foreground">{statusLabels[goal.status]}</dd></div>
        <div className="flex gap-2"><dt>開始日期</dt><dd className="text-foreground">{goal.startDate ? dateFormatter.format(goal.startDate) : "未設定"}</dd></div>
        <div className="flex gap-2"><dt>目標日期</dt><dd className="text-foreground">{goal.targetDate ? dateFormatter.format(goal.targetDate) : "未設定"}</dd></div>
      </dl>
      {showDetailLink ? <Button asChild className="mt-4" size="sm" variant="outline"><Link href={`/goals/${goal.id}`}>查看詳情</Link></Button> : null}
    </article>
  );
}
