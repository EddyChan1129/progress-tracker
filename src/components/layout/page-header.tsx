import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 border-b pb-5 sm:items-start">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="sr-only max-w-xl text-sm leading-6 text-muted-foreground sm:not-sr-only sm:mt-2">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
