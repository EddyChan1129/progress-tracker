"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Layers, NotebookPen, Target } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

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
    <aside className="flex min-w-0 flex-col border-b bg-sidebar px-4 py-3 pt-[max(.75rem,env(safe-area-inset-top))] lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-4 lg:py-7">
      <div className="flex items-center justify-between gap-3 lg:px-2">
        <Link
          className="flex min-w-0 items-center gap-3 rounded-md font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          href="/dashboard"
        >
          <BrandLogo />
        </Link>
        <div className="lg:hidden">
          <SignOutButton />
        </div>
      </div>

      <nav
        aria-label="主要導覽"
        className="mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t bg-card lg:static lg:mt-9 lg:grid-cols-1 lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0"
      >
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isCurrent =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors duration-120 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:text-primary lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2 lg:text-sm lg:aria-[current=page]:bg-accent"
              href={href}
              key={href}
            >
              <Icon aria-hidden size={19} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t px-2 pt-5 lg:block">
        <p className="truncate text-sm font-medium">
          {user?.displayName ?? "你的學習空間"}
        </p>
        <p className="mt-1 mb-4 truncate text-xs text-muted-foreground">
          {user?.email}
        </p>
        <SignOutButton />
      </div>
    </aside>
  );
}
