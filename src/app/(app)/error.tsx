"use client";

import { ErrorState } from "@/components/ui/feedback";

export default function AppError({ retry }: { retry: () => void }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">未能開啟呢頁</h1>
      <ErrorState message="載入遇到問題，請再試一次。" onRetry={retry} />
    </section>
  );
}
