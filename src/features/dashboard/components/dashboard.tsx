"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { ScrollPanel } from "@/components/ui/scroll-panel";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { GoalCard } from "@/features/goals/components/goal-card";
import {
  compareGoals,
  numberFormatter,
} from "@/features/goals/goal-presentation";
import { getDashboardData } from "../services/dashboard.service";

const dateFormatter = new Intl.DateTimeFormat("zh-HK", {
  month: "short",
  day: "numeric",
});

export function Dashboard() {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getDashboardData>
  > | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    getDashboardData()
      .then((result) => {
        if (current) {
          setData(result);
          setError("");
        }
      })
      .catch(() => {
        if (current) setError("未能載入總覽，請再試一次。");
      });
    return () => {
      current = false;
    };
  }, [version]);

  const categoryNames = new Map(
    data?.categories.map((category) => [category.id, category.name]),
  );

  return (
    <section>
      <PageHeader
        title="學習總覽"
        description="記低今日嘅收穫，繼續行向你嘅目標。"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/goals/new">新增目標</Link>
            </Button>
            <Button asChild>
              <Link href="/learning/new">
                <Plus aria-hidden />
                新增記錄
              </Link>
            </Button>
          </div>
        }
      />
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setError("");
            setVersion((value) => value + 1);
          }}
        />
      ) : !data ? (
        <ListSkeleton label="整理你的學習足跡中…" />
      ) : (
        <>
          <dl
            aria-label="學習概況"
            className="grid grid-cols-4 gap-x-3 gap-y-5 border-b py-5 sm:gap-x-6 sm:py-6"
          >
            {[
              { label: "日連續學習", value: data.streak },
              { label: "學習記錄", value: data.entryCount },
              { label: "待完成目標", value: data.activeGoals.length },
              { label: "已完成目標", value: data.completedGoalCount },
            ].map((metric) => (
              <div
                key={metric.label}
                className="flex min-w-0 flex-col-reverse gap-1"
              >
                <dt className="text-xs text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="text-[1.75rem] leading-tight font-semibold tracking-tight tabular-nums">
                  {numberFormatter.format(metric.value)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-9">
            <section className="min-w-0" aria-labelledby="active-goals-heading">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="active-goals-heading"
                  className="text-base font-semibold"
                >
                  下一步目標
                </h2>
                <Link
                  href="/goals"
                  className="inline-flex min-h-11 items-center rounded text-xs text-muted-foreground hover:text-primary"
                >
                  全部目標
                </Link>
              </div>
              <ScrollPanel label="待完成目標" className="max-h-[34rem]">
                {data.activeGoals.length ? (
                  <ul>
                    {[...data.activeGoals]
                      .sort((a, b) => compareGoals(a.goal, b.goal))
                      .map(({ goal, completed, total }) => (
                        <li key={goal.id}>
                          <GoalCard
                            goal={goal}
                            categoryName={
                              categoryNames.get(goal.categoryId) ?? "未知分類"
                            }
                            onStatusChanged={(status) =>
                              setData((current) =>
                                current
                                  ? {
                                      ...current,
                                      completedGoalCount:
                                        current.completedGoalCount +
                                        (status === "completed" ? 1 : 0),
                                      activeGoals: current.activeGoals.flatMap(
                                        (item) =>
                                          item.goal.id !== goal.id
                                            ? [item]
                                            : status === "completed"
                                              ? []
                                              : [
                                                  {
                                                    ...item,
                                                    goal: {
                                                      ...item.goal,
                                                      status,
                                                    },
                                                  },
                                                ],
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                          {total ? (
                            <div className="-mt-px border-b px-2 pb-3 pl-12 sm:pl-14">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>細目標</span>
                                <span className="tabular-nums">
                                  {numberFormatter.format(completed)} /{" "}
                                  {numberFormatter.format(total)} 完成
                                </span>
                              </div>
                              <ProgressMeter
                                value={completed}
                                max={total}
                                label={`「${goal.title}」細目標進度`}
                                className="mt-2"
                              />
                            </div>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="為下一步定個方向"
                    description="已完成同已暫停嘅目標可以喺目標列表查看。"
                    action={
                      <Button asChild variant="outline">
                        <Link href="/goals/new">新增大目標</Link>
                      </Button>
                    }
                  />
                )}
              </ScrollPanel>
            </section>
            <section
              className="min-w-0 xl:border-l xl:pl-8"
              aria-labelledby="recent-entries-heading"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="recent-entries-heading"
                  className="text-base font-semibold"
                >
                  最近學習
                </h2>
                <Link
                  href="/learning"
                  className="inline-flex min-h-11 items-center rounded text-xs text-muted-foreground hover:text-primary"
                >
                  全部記錄
                </Link>
              </div>
              <ScrollPanel label="最近學習記錄" className="max-h-[34rem]">
                {data.recentEntries.length ? (
                  <ul className="divide-y">
                    {data.recentEntries.map((entry) => (
                      <li key={entry.id} className="py-4 first:pt-1">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/learning/${entry.id}/edit`}
                            className="min-w-0 line-clamp-2 rounded text-sm font-semibold hover:text-primary"
                            title={entry.title}
                          >
                            {entry.title}
                          </Link>
                          <time
                            dateTime={entry.learnedAt.toISOString()}
                            className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums"
                          >
                            {dateFormatter.format(entry.learnedAt)}
                          </time>
                        </div>
                        <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {entry.content}
                        </p>
                        <p
                          className="mt-2 truncate text-xs text-muted-foreground"
                          title={categoryNames.get(entry.categoryId)}
                        >
                          {categoryNames.get(entry.categoryId) ?? "未知分類"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="仲未有學習記錄"
                    description="記低今日學識嘅一件事。"
                    action={
                      <Button asChild variant="outline">
                        <Link href="/learning/new">新增第一筆記錄</Link>
                      </Button>
                    }
                  />
                )}
              </ScrollPanel>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
