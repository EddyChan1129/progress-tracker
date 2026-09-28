import { LearningForm } from "@/features/learning/components/learning-form";

export default function NewLearningEntryPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">新增學習記錄</h1>
      <p className="mt-4 text-muted-foreground">
        記錄今次學到嘅內容同學習日期。
      </p>
      <LearningForm />
    </section>
  );
}
