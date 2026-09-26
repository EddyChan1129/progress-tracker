import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-4 text-slate-600">之後會喺呢度顯示學習記錄同目標進度。</p>
      <Link
        className="mt-6 inline-block text-blue-700 underline underline-offset-4"
        href="/login"
      >
        返回登入頁
      </Link>
    </main>
  );
}
