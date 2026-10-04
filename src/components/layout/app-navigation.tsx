"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, House, Layers, NotebookPen, Target } from "lucide-react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useAuth } from "@/features/auth/components/auth-provider";

const navigationItems = [
  { href: "/dashboard", label: "總覽", icon: House },
  { href: "/learning", label: "學習記錄", icon: NotebookPen },
  { href: "/goals", label: "目標", icon: Target },
  { href: "/categories", label: "分類", icon: Layers },
];

export function AppNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="flex min-w-0 flex-col border-b bg-sidebar px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
      <div className="flex items-center justify-between gap-3">
      <Link
        className="flex min-w-0 items-center gap-3 rounded-md text-lg font-semibold tracking-tight text-[#173c65] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        href="/dashboard"
      >
        <BookOpenCheck aria-hidden size={26} />
        學習追蹤
      </Link>
      <div className="lg:hidden"><SignOutButton /></div>
      </div>

      <nav aria-label="主要導覽" className="mt-5 grid grid-cols-4 gap-1 lg:mt-12 lg:grid-cols-1 lg:gap-2">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isCurrent =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:bg-accent aria-[current=page]:text-primary sm:text-sm lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3"
              href={href}
              key={href}
            >
              <Icon aria-hidden size={19} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t pt-6 lg:block">
        <p className="truncate text-sm font-medium">{user?.displayName ?? "你的學習空間"}</p>
        <p className="mt-1 mb-4 truncate text-xs text-muted-foreground">{user?.email}</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
