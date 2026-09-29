import type { LearningEntry } from "@/features/learning/types/learning.types";

const dateFormatter = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function LearningCard({
  entry,
  categoryName,
}: {
  entry: LearningEntry;
  categoryName: string;
}) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{entry.title}</h2>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex gap-2">
          <dt>分類</dt>
          <dd className="text-foreground">{categoryName}</dd>
        </div>
        <div className="flex gap-2">
          <dt>學習日期</dt>
          <dd className="text-foreground">
            {dateFormatter.format(entry.learnedAt)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
