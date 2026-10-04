"use client";

import { useState } from "react";

import { CategoryForm } from "@/features/categories/components/category-form";
import { CategoryList } from "@/features/categories/components/category-list";

export function CategoryManager() {
  const [listVersion, setListVersion] = useState(0);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <CategoryForm onCreated={() => setListVersion((version) => version + 1)} />
      <CategoryList key={listVersion} />
    </div>
  );
}
