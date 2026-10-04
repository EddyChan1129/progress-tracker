"use client";

import { BookOpenCheck, Check } from "lucide-react";
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

  if (isLoading || user) {
    return <main className="grid min-h-dvh place-items-center px-6"><p role="status" className="text-muted-foreground">正在開啟你的學習手記…</p></main>;
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#173c65] px-7 py-10 text-white sm:px-14 lg:p-16">
        <div className="flex items-center gap-3 text-lg font-semibold"><BookOpenCheck aria-hidden size={28} />學習追蹤</div>
        <div className="my-12 max-w-lg lg:my-24">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">把學過的，<br />變成走過的路。</h1>
          <p className="mt-6 max-w-sm text-base leading-8 text-blue-100">記低一次練習、一個發現，再一步步完成你想達成嘅目標。</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-blue-100">
          {['學習手記', '大目標與細步驟', '每日學習足跡'].map((label) => <li key={label} className="flex items-center gap-2"><Check aria-hidden size={16} />{label}</li>)}
        </ul>
      </section>
      <section className="flex items-center justify-center px-7 py-14 sm:px-14">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight">開啟你的學習手記</h2>
          <p className="mt-4 leading-7 text-muted-foreground">使用 Google 帳戶登入，記錄同目標會保存喺你嘅私人帳戶。</p>
          <SignInButton />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">呢部裝置會記住登入，下次打開就可以繼續。</p>
        </div>
      </section>
    </main>
  );
}
