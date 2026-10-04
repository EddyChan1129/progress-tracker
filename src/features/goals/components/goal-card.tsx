import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollPanel } from "@/components/ui/scroll-panel";
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
      <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold">{goal.title}</h2><span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${goal.status === "completed" ? "bg-emerald-50 text-emerald-800" : goal.status === "in_progress" ? "bg-accent text-primary" : "bg-muted text-muted-foreground"}`}>{statusLabels[goal.status]}</span></div>
      {goal.description ? <ScrollPanel label={`「${goal.title}」描述`} className="mt-3 max-h-40"><p className="whitespace-pre-wrap break-words text-sm leading-6">{goal.description}</p></ScrollPanel> : null}
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
