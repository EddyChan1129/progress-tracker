import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LearningPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">學習記錄</h1>
      <p className="mt-4 text-muted-foreground">之後會喺呢度查看學習記錄。</p>
      <Button asChild className="mt-6">
        <Link href="/learning/new">新增學習記錄</Link>
      </Button>
    </section>
  );
}
