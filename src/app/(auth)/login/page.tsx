import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">登入</h1>
      <p className="mt-4 text-slate-600">Google 登入功能將於之後加入。</p>
      <Link
        className="mt-6 inline-block text-blue-700 underline underline-offset-4"
        href="/dashboard"
      >
        預覽 Dashboard
      </Link>
    </main>
  );
}
