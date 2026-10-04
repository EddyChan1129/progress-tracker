import { LearningForm } from "@/features/learning/components/learning-form";
import { PageHeader } from "@/components/layout/page-header";

export default async function EditLearningEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section>
      <PageHeader title="編輯學習記錄" description="補充學習內容，或者整理圖片同關聯目標。" />
      <LearningForm key={id} entryId={id} />
    </section>
  );
}
