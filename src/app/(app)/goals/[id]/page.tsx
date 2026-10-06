import { GoalDetail } from "@/features/goals/components/goal-detail";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <section>
      {/* 換另一個 ID 時重新建立詳情元件，唔保留上一個目標嘅畫面／state。 */}
      <GoalDetail key={id} goalId={id} />
    </section>
  );
}
