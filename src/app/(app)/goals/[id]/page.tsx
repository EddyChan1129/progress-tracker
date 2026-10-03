import { GoalDetail } from "@/features/goals/components/goal-detail";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">目標詳情</h1>
      {/* 換另一個 ID 時重新建立詳情元件，唔保留上一個目標嘅畫面／state。 */}
      <GoalDetail key={id} goalId={id} />
    </section>
  );
}
