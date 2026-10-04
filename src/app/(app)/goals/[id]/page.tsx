import { GoalDetail } from "@/features/goals/components/goal-detail";
import { PageHeader } from "@/components/layout/page-header";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <PageHeader title="目標詳情" description="完成每一個細步驟，再由你決定大目標何時達成。" />
      {/* 換另一個 ID 時重新建立詳情元件，唔保留上一個目標嘅畫面／state。 */}
      <GoalDetail key={id} goalId={id} />
    </section>
  );
}
