import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">學習進度追蹤</h1>
      <p className="mt-4 text-slate-600">
        記錄學習內容，同一步步達成學習目標。
      </p>
      <Link
        className="mt-6 inline-block text-blue-700 underline underline-offset-4"
        href="/login"
      >
        前往登入頁
      </Link>
    </main>
  );
}
