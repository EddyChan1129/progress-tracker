"use client";

import { BrandLogo } from "@/components/brand-logo";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-provider";
import { SignInButton } from "./sign-in-button";

export function LoginScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  if (isLoading || user)
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <p role="status" className="text-sm text-muted-foreground">
          正在開啟你的學習手記…
        </p>
      </main>
    );

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8 sm:px-10">
      <header className="mx-auto w-full max-w-5xl">
        <BrandLogo />
      </header>
      <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
        <h1 className="text-[1.75rem] leading-snug font-semibold tracking-tight">
          繼續你嘅學習手記
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          記低一次練習、一個發現，
          <br />
          再一步步完成想達成嘅目標。
        </p>
        <SignInButton />
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          記錄同目標會保存喺你嘅私人 Google 帳戶。
          <br />
          呢部裝置會記住登入，下次打開就可以繼續。
        </p>
      </section>
      <footer className="mx-auto w-full max-w-5xl border-t pt-4 text-xs text-muted-foreground">
        一個留俾自己嘅學習空間。
      </footer>
    </main>
  );
}
