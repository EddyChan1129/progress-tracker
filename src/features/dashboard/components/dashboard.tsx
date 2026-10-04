"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { getDashboardData } from "../services/dashboard.service";

const dateFormatter = new Intl.DateTimeFormat("zh-HK", { month: "short", day: "numeric" });

export function Dashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    getDashboardData().then((result) => { if (current) { setData(result); setError(""); } })
      .catch(() => { if (current) setError("未能載入總覽，請再試一次。"); });
    return () => { current = false; };
  }, [version]);

  const categoryNames = new Map(data?.categories.map((category) => [category.id, category.name]));

  return (
    <section>
      <PageHeader title="學習總覽" description="記低今日嘅收穫，繼續行向你嘅目標。" action={<Button asChild><Link href="/learning/new"><Plus aria-hidden size={17} />新增記錄</Link></Button>} />
      {error ? <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-5"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => { setError(""); setVersion((value) => value + 1); }}>重試載入</Button></div>
        : !data ? <p role="status" className="mt-8 text-muted-foreground">整理你的學習足跡中…</p> : (
        <>
          <section aria-label="學習概況" className="my-7 grid overflow-hidden rounded-2xl border bg-card sm:grid-cols-[1.2fr_1fr]">
            <div className="flex items-center gap-6 bg-[#173c65] px-6 py-7 text-white sm:px-8">
              <span className="shrink-0 text-5xl font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-6xl">{data.streak}</span>
              <div><h2 className="text-lg font-semibold">日連續學習</h2><p className="mt-2 max-w-xs text-sm leading-6 text-blue-100">{data.streak ? "每一日嘅累積，都係向前嘅一步。" : "由今日第一筆記錄開始，慢慢建立節奏。"}</p></div>
            </div>
            <dl className="grid grid-cols-3 items-center gap-3 px-5 py-6 text-center sm:px-8">
              <div><dt className="text-xs text-muted-foreground sm:text-sm">學習記錄</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{data.entryCount}</dd></div>
              <div><dt className="text-xs text-muted-foreground sm:text-sm">待完成目標</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{data.activeGoals.length}</dd></div>
              <div><dt className="text-xs text-muted-foreground sm:text-sm">已完成目標</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{data.completedGoalCount}</dd></div>
            </dl>
          </section>
          <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
            <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6" aria-labelledby="recent-entries-heading">
              <div className="mb-5 flex items-center justify-between gap-3"><h2 id="recent-entries-heading" className="flex items-center gap-2 text-lg font-semibold"><BookOpen aria-hidden size={20} />最近學習</h2><Link href="/learning" className="rounded text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">全部記錄</Link></div>
              <ScrollPanel label="最近學習記錄" className="h-[26rem]">
                {data.recentEntries.length ? <ul className="divide-y">{data.recentEntries.map((entry) => <li key={entry.id} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-4"><Link href={`/learning/${entry.id}/edit`} className="min-w-0 rounded font-semibold text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{entry.title}</Link><time dateTime={entry.learnedAt.toISOString()} className="shrink-0 text-xs text-muted-foreground">{dateFormatter.format(entry.learnedAt)}</time></div>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{entry.content}</p><p className="mt-3 text-xs text-primary">{categoryNames.get(entry.categoryId) ?? "未知分類"}</p>
                </li>)}</ul> : <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center"><BookOpen aria-hidden className="text-muted-foreground" size={32} /><p className="font-medium">仲未有學習記錄</p><p className="text-sm text-muted-foreground">記低今日學識嘅一件事。</p><Button asChild variant="outline"><Link href="/learning/new">新增第一筆記錄</Link></Button></div>}
              </ScrollPanel>
            </section>
            <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6" aria-labelledby="active-goals-heading">
              <div className="mb-5 flex items-center justify-between gap-3"><h2 id="active-goals-heading" className="flex items-center gap-2 text-lg font-semibold"><Target aria-hidden size={20} />下一步目標</h2><Link href="/goals" className="rounded text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">全部目標</Link></div>
              <ScrollPanel label="待完成目標" className="h-[26rem]">
                {data.activeGoals.length ? <ul className="space-y-3">{data.activeGoals.map(({ goal, completed, total }) => <li key={goal.id} className="rounded-xl border border-l-3 border-l-primary p-4">
                  <p className="mb-2 text-xs text-primary">{goal.status === "in_progress" ? "進行中" : "未開始"}</p><Link href={`/goals/${goal.id}`} className="rounded font-semibold hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{goal.title}</Link>
                  <p className="mt-3 text-sm text-muted-foreground">{total ? `${completed} / ${total} 個細目標已完成` : "未設定細目標"}</p>
                  {goal.targetDate ? <p className="mt-2 text-xs text-muted-foreground">目標日期：{dateFormatter.format(goal.targetDate)}</p> : null}
                </li>)}</ul> : <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center"><Target aria-hidden className="text-muted-foreground" size={32} /><p className="font-medium">為下一步定個方向</p><p className="text-sm text-muted-foreground">已完成同已暫停嘅目標可以喺目標列表查看。</p><Button asChild variant="outline"><Link href="/goals/new">新增大目標</Link></Button></div>}
              </ScrollPanel>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
