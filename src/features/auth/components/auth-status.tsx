"use client";

import { useAuth } from "@/features/auth/components/auth-provider";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export function AuthStatus() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <p className="mt-4 text-slate-600" role="status">
        檢查登入狀態…
      </p>
    );
  }

  if (!user) return <p className="mt-4 text-slate-600">目前未登入。</p>;

  return (
    <div className="mt-4">
      <p className="text-slate-600">已登入：{user.email ?? "Google 帳戶"}</p>
      <SignOutButton />
    </div>
  );
}
