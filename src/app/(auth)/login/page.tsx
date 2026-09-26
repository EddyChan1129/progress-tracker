import { SignInButton } from "@/features/auth/components/sign-in-button";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">登入</h1>
      <p className="mt-4 text-slate-600">使用 Google 帳戶登入。</p>
      <SignInButton />
    </main>
  );
}
