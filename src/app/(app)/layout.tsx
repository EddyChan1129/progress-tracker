"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";
import { ListSkeleton } from "@/components/ui/feedback";
import { useAuth } from "@/features/auth/components/auth-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ListSkeleton label={isLoading ? "檢查登入狀態…" : "正在返回登入頁…"} />
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        跳到主要內容
      </a>
      <AppNavigation />
      <main id="main-content" className="app-main min-w-0">
        <div key={user.uid} className="mx-auto max-w-[68rem]">
          {children}
        </div>
      </main>
    </div>
  );
}
