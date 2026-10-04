import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-6">
      <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p></div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
