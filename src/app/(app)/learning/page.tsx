import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LearningList } from "@/features/learning/components/learning-list";
import { PageHeader } from "@/components/layout/page-header";
import { Plus } from "lucide-react";

export default function LearningPage() {
  return (
    <section>
      <PageHeader title="學習記錄" description="保存練習、筆記同程式碼，回頭睇見自己嘅累積。" action={<Button asChild><Link href="/learning/new"><Plus aria-hidden size={17} />新增學習記錄</Link></Button>} />
      <LearningList />
    </section>
  );
}
