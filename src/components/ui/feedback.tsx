"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "./button";

export function ListSkeleton({ label = "載入中…" }: { label?: string }) {
  return (
    <div role="status" className="mt-6 space-y-4">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden className="space-y-3 border-b py-4">
          <div className="h-4 w-2/3 max-w-sm rounded bg-muted" />
          <div className="h-3 w-1/3 max-w-48 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <Inbox
        aria-hidden
        size={25}
        strokeWidth={1.5}
        className="text-muted-foreground"
      />
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="my-5 flex flex-wrap items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm"
    >
      <AlertCircle aria-hidden size={18} className="text-destructive" />
      <p className="min-w-0 flex-1 text-destructive">{message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry ?? (() => window.location.reload())}
      >
        重試載入
      </Button>
    </div>
  );
}
