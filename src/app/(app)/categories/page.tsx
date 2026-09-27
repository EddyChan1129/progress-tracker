import { CategoryForm } from "@/features/categories/components/category-form";

export default function CategoriesPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">分類</h1>
      <p className="mt-4 text-muted-foreground">建立分類，整理之後嘅學習記錄同目標。</p>
      <CategoryForm />
    </section>
  );
}
