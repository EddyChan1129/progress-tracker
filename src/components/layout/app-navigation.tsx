"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/features/auth/components/sign-out-button";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/categories", label: "分類" },
  { href: "/learning", label: "學習記錄" },
  { href: "/goals", label: "目標" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <aside className="flex gap-4 overflow-x-auto border-b bg-sidebar px-4 py-3 md:sticky md:top-0 md:h-screen md:flex-col md:overflow-visible md:border-r md:border-b-0 md:px-6 md:py-8">
      <Link
        className="shrink-0 self-center text-lg font-semibold tracking-tight md:self-start"
        href="/dashboard"
      >
        學習追蹤
      </Link>

      <nav aria-label="主要導覽" className="flex gap-1 md:flex-col">
        {navigationItems.map(({ href, label }) => {
          const isCurrent =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
              href={href}
              key={href}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 md:mt-auto">
        <SignOutButton />
      </div>
    </aside>
  );
}
