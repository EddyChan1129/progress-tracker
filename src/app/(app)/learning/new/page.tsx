import { LearningForm } from "@/features/learning/components/learning-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewLearningEntryPage() {
  return (
    <section>
      <PageHeader title="新增學習記錄" description="記低今次學到嘅內容，亦可以連結到你嘅大目標。" />
      <LearningForm />
    </section>
  );
}
