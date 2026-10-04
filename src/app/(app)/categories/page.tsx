import { CategoryManager } from "@/features/categories/components/category-manager";
import { PageHeader } from "@/components/layout/page-header";

export default function CategoriesPage() {
  return (
    <section>
      <PageHeader title="分類" description="將唔同學習方向分好類，方便整理記錄同目標。" />
      <CategoryManager />
    </section>
  );
}
