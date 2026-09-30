import { LearningForm } from "@/features/learning/components/learning-form";

export default async function EditLearningEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">編輯學習記錄</h1>
      <p className="mt-4 text-muted-foreground">修改已儲存嘅學習內容。</p>
      <LearningForm entryId={id} />
    </section>
  );
}
