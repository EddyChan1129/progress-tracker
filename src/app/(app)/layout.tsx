"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";
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
        <p className="text-slate-600" role="status">
          {isLoading ? "檢查登入狀態…" : "正在返回登入頁…"}
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <AppNavigation />
      <main className="min-w-0 px-6 py-10 sm:px-10 md:py-12">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
