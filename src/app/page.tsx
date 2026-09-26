import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">學習進度追蹤</h1>
      <p className="mt-4 text-slate-600">
        記錄學習內容，同一步步達成學習目標。
      </p>
      <Button asChild className="mt-6">
        <Link href="/login">前往登入頁</Link>
      </Button>
    </main>
  );
}
