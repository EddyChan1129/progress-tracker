import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScrollPanel({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return <div role="region" aria-label={label} tabIndex={0} className={cn("scroll-panel min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}>{children}</div>;
}
